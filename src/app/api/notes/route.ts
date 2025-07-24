import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Note from '@/lib/mongodb/models/Note';
import User from '@/lib/mongodb/models/User';
import Workspace, { ICollaborator } from '@/lib/mongodb/models/Workspace';

// This line prevents Next.js from caching the response.
export const dynamic = 'force-dynamic';

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
    
    // Check for 'folder=null' for root notes, or a specific folderId
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
