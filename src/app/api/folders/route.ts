import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Folder from '@/lib/mongodb/models/Folder';
import User from '@/lib/mongodb/models/User';
import Workspace, { ICollaborator } from '@/lib/mongodb/models/Workspace';

// Add this line to prevent caching of the GET request
export const dynamic = 'force-dynamic';

// GET - Fetch folders for a workspace
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const parentId = searchParams.get('parentId');
    const includeArchived = searchParams.get('includeArchived') === 'true';

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

    const query: any = { workspace: workspaceId };
    
    if (parentId) {
      query.parent = parentId;
    } else {
      query.parent = null;
    }

    if (!includeArchived) {
      query.isArchived = false;
    }

    const folders = await Folder.find(query)
      .populate('creator', 'name email avatar')
      .populate('notes', 'title updatedAt')
      .sort({ position: 1, createdAt: 1 });

    return NextResponse.json(folders);

  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { name, workspaceId, parentId, color, icon } = body;

    if (!name || !workspaceId) {
      return NextResponse.json({ 
        error: 'Folder name and workspace are required' 
      }, { status: 400 });
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
        collab.user.toString() === user._id.toString() && 
        collab.role === 'editor'
      );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Edit access denied' }, { status: 403 });
    }

    if (parentId) {
      const parentFolder = await Folder.findById(parentId);
      if (!parentFolder || parentFolder.workspace.toString() !== workspaceId) {
        return NextResponse.json({ error: 'Invalid parent folder' }, { status: 400 });
      }
    }

    const folder = new Folder({
      name,
      workspace: workspaceId,
      parent: parentId || null,
      creator: user._id,
      color: color || '#6366f1',
      icon: icon || 'folder'
    });

    await folder.save();

    await folder.populate([
      { path: 'creator', select: 'name email avatar' },
      { path: 'notes', select: 'title updatedAt' }
    ]);

    return NextResponse.json(folder, { status: 201 });

  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
