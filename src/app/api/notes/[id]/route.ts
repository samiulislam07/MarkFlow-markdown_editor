import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Note from '@/lib/mongodb/models/Note';
import User from '@/lib/mongodb/models/User';
import Workspace, { ICollaborator } from '@/lib/mongodb/models/Workspace';

// GET - Fetch a specific note
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const note = await Note.findById(params.id)
      .populate('author', 'name email avatar')
      .populate('lastEditedBy', 'name email avatar')
      .populate('tags', 'name color')
      .populate('folder', 'name color icon')
      .populate('workspace', 'name owner collaborators');

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Check if user has access to the note
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspace = note.workspace as any;
    const hasAccess = 
      // Owner of workspace
      workspace.owner.toString() === user._id.toString() ||
      // Collaborator in workspace
      workspace.collaborators.some((collab: ICollaborator) => 
        collab.user.toString() === user._id.toString()
      ) ||
      // Note is public
      note.isPublic ||
      // User has specific view permission
      note.permissions.canView.includes(user._id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(note);

  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a specific note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { title, content, tags, folderId, isPublic, isArchived } = body;

    const note = await Note.findById(params.id).populate('workspace');
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Get user from database
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has edit access
    const workspace = note.workspace as any;
    const hasEditAccess = 
      // Owner of workspace
      workspace.owner.toString() === user._id.toString() ||
      // Editor collaborator in workspace
      workspace.collaborators.some((collab: ICollaborator) => 
        collab.user.toString() === user._id.toString() && 
        collab.role === 'editor'
      ) ||
      // User has specific edit permission
      note.permissions.canEdit.includes(user._id);

    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Edit access denied' }, { status: 403 });
    }

    // Update note fields
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (tags !== undefined) note.tags = tags;
    if (folderId !== undefined) note.folder = folderId;
    if (isPublic !== undefined) note.isPublic = isPublic;
    if (isArchived !== undefined) note.isArchived = isArchived;

    // Update metadata
    note.lastEditedBy = user._id;
    note.version += 1;

    await note.save();

    // Populate the updated note
    await note.populate([
      { path: 'author', select: 'name email avatar' },
      { path: 'lastEditedBy', select: 'name email avatar' },
      { path: 'tags', select: 'name color' },
      { path: 'folder', select: 'name color icon' }
    ]);

    return NextResponse.json(note);

  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a specific note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const note = await Note.findById(params.id).populate('workspace');
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Get user from database
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has delete access (only workspace owner or note author)
    const workspace = note.workspace as any;
    const hasDeleteAccess = 
      workspace.owner.toString() === user._id.toString() ||
      note.author.toString() === user._id.toString();

    if (!hasDeleteAccess) {
      return NextResponse.json({ error: 'Delete access denied' }, { status: 403 });
    }

    await Note.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Note deleted successfully' });

  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 