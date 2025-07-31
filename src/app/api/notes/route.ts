import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Note from '@/lib/mongodb/models/Note';
import User from '@/lib/mongodb/models/User';
import Workspace, { ICollaborator } from '@/lib/mongodb/models/Workspace';
import Folder from '@/lib/mongodb/models/Folder';

export const dynamic = 'force-dynamic';

// GET - Fetch notes for a workspace/folder
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const folderId = searchParams.get('folderId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const hasAccess = workspace.owner.toString() === user._id.toString() ||
      workspace.collaborators.some((collab: ICollaborator) => 
        collab.user.toString() === user._id.toString()
      );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const query: any = { workspace: workspaceId, isArchived: false };
    
    if (searchParams.get('folder') === 'null') {
      query.folder = null;
    } else if (folderId) {
      query.folder = folderId;
    }

    const notes = await Note.find(query)
      .populate('author', 'name email avatar')
      .populate('lastEditedBy', 'name email avatar')
      .sort({ lastEditedAt: -1 });

    return NextResponse.json(notes);

  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- START: ADDED POST FUNCTION ---
// POST - Create a new note
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { title, content, workspaceId, folderId } = body;

    if (!title || !workspaceId) {
      return NextResponse.json({ error: 'Title and workspace ID are required' }, { status: 400 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    
    const hasWriteAccess = workspace.owner.toString() === user._id.toString() ||
      workspace.collaborators.some((collab: ICollaborator) =>
        collab.user.toString() === user._id.toString() && collab.role === 'editor'
      );

    if (!hasWriteAccess) {
        return NextResponse.json({ error: 'You do not have permission to create notes in this workspace.' }, { status: 403 });
    }

    const wordCount = (content || '').split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 200);

    const newNote = new Note({
      title,
      content: content || '',
      workspace: workspaceId,
      folder: folderId || null,
      author: user._id,
      lastEditedBy: user._id,
      wordCount,
      readingTime,
    });

    await newNote.save();
    
    if (folderId) {
        await Folder.findByIdAndUpdate(folderId, {
            $push: { notes: newNote._id }
        });
    }

    return NextResponse.json(newNote, { status: 201 });

  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// --- END: ADDED POST FUNCTION ---
