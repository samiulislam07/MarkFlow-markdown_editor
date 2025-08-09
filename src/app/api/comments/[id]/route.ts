import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Comment from '@/lib/mongodb/models/Comment';
import User from '@/lib/mongodb/models/User';

// Define the type for the route params
interface RouteParams {
  params: {
    id: string;
  };
}

// PUT - Update a specific comment
export async function PUT(
  request: NextRequest,
  { params }: any) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } =  params;
    const body = await request.json();
    const { content, isResolved } = body;


    const comment = await Comment.findById(id);
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Allow only the author to edit the content
    if (content !== undefined && comment.author.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden: Only the author can edit the comment.' }, { status: 403 });
    }

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
    ).populate('author', 'firstName lastName email avatar'); // Ensure avatar is populated

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific comment
export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = params;
    const comment = await Comment.findById(id);
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (comment.author.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Comment.deleteMany({
      $or: [{ _id: id }, { parent: id }]
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
