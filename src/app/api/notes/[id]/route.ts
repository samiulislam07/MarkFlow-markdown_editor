import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Note from '@/lib/mongodb/models/Note';
import User from '@/lib/mongodb/models/User';
import Workspace, { ICollaborator } from '@/lib/mongodb/models/Workspace';
import Folder from '@/lib/mongodb/models/Folder';
import Tag from '@/lib/mongodb/models/Tag';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - Fetch a specific note
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Check if user has access to this note
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
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Check if user has access to edit this note
    const workspace = note.workspace as any;
    const hasAccess = workspace.owner.toString() === user._id.toString() ||
      workspace.collaborators.some((collab: ICollaborator) => 
        collab.user.toString() === user._id.toString() && 
        collab.role === 'editor'
      );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Calculate word count and reading time
    const wordCount = (content || '').split(/\s+/).filter((word: string) => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);

    // Update the note
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

// DELETE - Delete a specific note
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const note = await Note.findById(id).populate('workspace', 'name owner collaborators');
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Check if user has access to delete this note (only owner can delete)
    const workspace = note.workspace as any;
    const canDelete = workspace.owner.toString() === user._id.toString() ||
      note.author.toString() === user._id.toString();

    if (!canDelete) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft delete by archiving
    await Note.findByIdAndUpdate(id, { 
      isArchived: true,
      updatedAt: new Date()
    });

    return NextResponse.json({ message: 'Note deleted successfully' });

  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 