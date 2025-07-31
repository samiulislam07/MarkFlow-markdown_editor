import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import File from '@/lib/mongodb/models/File';
import Folder from '@/lib/mongodb/models/Folder';
import User from '@/lib/mongodb/models/User';
import Workspace, { ICollaborator } from '@/lib/mongodb/models/Workspace';
import supabase from '@/lib/supabase'

// ADDED: This line prevents Next.js from caching the GET response
export const dynamic = 'force-dynamic';

// This config is important to prevent Next.js from trying to parse the body as JSON
export const config = {
  api: {
    bodyParser: false,
  },
};

// GET - Fetch files for a workspace/folder
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.log('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    console.log('Connected to database');

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const folderId = searchParams.get('folderId');

    if (!workspaceId) {
      console.log('Missing workspaceId');
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      console.log('User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const hasAccess = workspace.owner.toString() === user._id.toString() ||
      workspace.collaborators.some((collab: ICollaborator) => collab.user.toString() === user._id.toString());

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const query: any = { workspace: workspaceId, isArchived: false };
    if (folderId) {
      query.folder = folderId;
    } else {
      query.folder = null; // Root files
    }

    const files = await File.find(query)
      .populate('uploader', 'name email avatar')
      .sort({ createdAt: -1 });

    return NextResponse.json(files);

  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Upload a new file
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use the built-in request.formData() to handle multipart data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const workspaceId = formData.get('workspaceId') as string | null;
    const folderId = formData.get('folderId') as string | null;

    if (!file || !workspaceId) {
      return NextResponse.json({ error: 'File and workspace ID are required' }, { status: 400 });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check for write access
    const hasWriteAccess = workspace.owner.toString() === user._id.toString() ||
      workspace.collaborators.some((collab: ICollaborator) => 
        collab.user.toString() === user._id.toString() && collab.role === 'editor'
      );

    if (!hasWriteAccess) {
      return NextResponse.json({ error: 'You do not have permission to upload files to this workspace.' }, { status: 403 });
    }

    // Construct the file path for Supabase storage (e.g., 'uploads/filename')
    const fileBlob = file as unknown as Blob;
    const arrayBuffer = await fileBlob.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const filePath = `uploads/${file.name}`;

    // ✅ Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file to Supabase' }, { status: 500 });
    }

    // ✅ Get public URL
    const { data: publicData } = supabase.storage.from('uploads').getPublicUrl(filePath);
    const publicUrl = publicData?.publicUrl;

    const storageUrl = publicUrl;

    console.log('File uploaded to:', storageUrl);
    const newFile = new (require('@/lib/mongodb/models/File').default)({
      fileName: file.name,
      storageUrl,
      fileType: file.type,
      fileSize: file.size,
      workspace: workspaceId,
      folder: folderId || null,
      uploader: user._id,
    });

    await newFile.save();

    if (folderId) {
      await Folder.findByIdAndUpdate(folderId, {
        $push: { files: newFile._id }
      });
    }

    await newFile.populate('uploader', 'name email avatar');

    return NextResponse.json(newFile, { status: 201 });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
