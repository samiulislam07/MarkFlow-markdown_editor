import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Comment from '@/lib/mongodb/models/Comment';
import User from '@/lib/mongodb/models/User';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;
    const body = await request.json();
    const { content, isResolved } = body;

    // Find the comment
    const comment = await Comment.findById(id).populate('author');
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Find current user
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is the author of the comment
    if (comment.author._id.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update comment
    const updateData: any = {};
    if (content !== undefined) {
      updateData.content = content.trim();
      updateData.isEdited = true;
      updateData.editedAt = new Date();
    }
    if (isResolved !== undefined) {
      updateData.isResolved = isResolved;
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('author', 'firstName lastName email');

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;

    // Find the comment
    const comment = await Comment.findById(id).populate('author');
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Find current user
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is the author of the comment
    if (comment.author._id.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the comment and its replies
    await Comment.deleteMany({
      $or: [
        { _id: id },
        { parent: id }
      ]
    });

    return NextResponse.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
} 