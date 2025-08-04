import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Note from '@/lib/mongodb/models/Note';
import User from '@/lib/mongodb/models/User';
import Workspace, { ICollaborator } from '@/lib/mongodb/models/Workspace';
import Folder from '@/lib/mongodb/models/Folder';
import Tag from '@/lib/mongodb/models/Tag';

export const dynamic = 'force-dynamic';

// GET - Fetch a specific note
export async function GET(request: NextRequest, { params }: { params: any}) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const note = await Note.findById(id)
      .populate('workspace', 'name owner collaborators')
      .populate('author', 'name email avatar')
      .populate('lastEditedBy', 'name email avatar');

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const workspace = note.workspace as any;
    const hasAccess = workspace.owner.toString() === user._id.toString() ||
      workspace.collaborators.some((collab: ICollaborator) => 
        collab.user.toString() === user._id.toString()
      );

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
export async function PUT(request: NextRequest, { params }: { params: any}) {
  try {
    const { id } = params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { title, content, tags, isPublic } = body;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const note = await Note.findById(id).populate('workspace', 'name owner collaborators');
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const workspace = note.workspace as any;
    const hasAccess = workspace.owner.toString() === user._id.toString() ||
      workspace.collaborators.some((collab: ICollaborator) => 
        collab.user.toString() === user._id.toString() && 
        collab.role === 'editor'
      );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const wordCount = (content || '').split(/\s+/).filter((word: string) => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);

    const updatedNote = await Note.findByIdAndUpdate(
      id,
      {
        title: title || note.title,
        content: content !== undefined ? content : note.content,
        tags: tags || note.tags,
        isPublic: isPublic !== undefined ? isPublic : note.isPublic,
        lastEditedBy: user._id,
        lastEditedAt: new Date(),
        wordCount,
        readingTime,
        version: note.version + 1,
        updatedAt: new Date()
      },
      { new: true }
    ).populate([
      { path: 'author', select: 'name email avatar' },
      { path: 'lastEditedBy', select: 'name email avatar' },
      { path: 'workspace', select: 'name' }
    ]);

    return NextResponse.json(updatedNote);

  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a specific note (Hard Delete)
export async function DELETE(request: NextRequest, { params }: { params: any }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = params;

    const note = await Note.findById(id);
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspace = await Workspace.findById(note.workspace);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const hasWriteAccess = workspace.owner.toString() === user._id.toString() ||
      workspace.collaborators.some((collab: ICollaborator) => 
        collab.user.toString() === user._id.toString() && collab.role === 'editor'
      );

    if (!hasWriteAccess) {
      return NextResponse.json({ error: 'You do not have permission to delete this note.' }, { status: 403 });
    }

    // Remove note reference from its parent folder, if it exists
    if (note.folder) {
      await Folder.findByIdAndUpdate(note.folder, { $pull: { notes: note._id } });
    }

    await Note.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Note deleted successfully' });

  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
