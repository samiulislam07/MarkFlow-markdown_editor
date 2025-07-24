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
    const includeResolved = searchParams.get('includeResolved') === 'true';

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    // Build query
    const query: any = { note: noteId };
    if (!includeResolved) {
      query.isResolved = false;
    }

    // Fetch comments with author information
    const comments = await Comment.find(query)
      .populate('author', 'firstName lastName email')
      .populate('mentions', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    // Group comments by parent to create threads
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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { noteId, content, position, parentId, mentions } = body;

    if (!noteId || !content) {
      return NextResponse.json(
        { error: 'Note ID and content are required' },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create comment
    const comment = new Comment({
      note: noteId,
      author: user._id,
      content: content.trim(),
      position,
      parent: parentId || null,
      mentions: mentions || []
    });

    await comment.save();

    // Populate author information for response
    await comment.populate('author', 'firstName lastName email');
    if (mentions && mentions.length > 0) {
      await comment.populate('mentions', 'firstName lastName email');
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