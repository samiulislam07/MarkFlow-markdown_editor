import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Comment from '@/lib/mongodb/models/Comment';
import User from '@/lib/mongodb/models/User';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');
    // --- START: MODIFIED LOGIC ---
    // We now check for the 'includeResolved' parameter. The frontend will set this to true.
    const includeResolved = searchParams.get('includeResolved') === 'true';
    // --- END: MODIFIED LOGIC ---

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    const query: any = { note: noteId };
    // If includeResolved is false (or not provided), we only get open comments.
    if (!includeResolved) {
      query.isResolved = false;
    }

    const authorFieldsToPopulate = 'name email avatar clerkId';

    const comments = await Comment.find(query)
      .populate('author', authorFieldsToPopulate)
      .populate('mentions', authorFieldsToPopulate)
      .sort({ createdAt: -1 })
      .lean();

    const topLevelComments = comments.filter(comment => !comment.parent);
    const commentReplies = comments.filter(comment => comment.parent);

    const commentsWithReplies = topLevelComments.map((comment: any) => ({
      ...comment,
      replies: commentReplies.filter((reply: any) => 
        reply.parent && reply.parent.toString() === comment._id.toString()
      ).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }));

    return NextResponse.json(commentsWithReplies);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST function remains unchanged
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { noteId, content, position, parentId, mentions, selectedText } = body;

    if (!noteId || !content) {
      return NextResponse.json(
        { error: 'Note ID and content are required' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const comment = new Comment({
      note: noteId,
      author: user._id,
      content: content.trim(),
      position,
      parent: parentId || null,
      mentions: mentions || [],
      selectedText: selectedText || null,
    });

    await comment.save();

    await comment.populate('author', 'name email avatar clerkId');
    if (mentions && mentions.length > 0) {
      await comment.populate('mentions', 'name email avatar clerkId');
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
