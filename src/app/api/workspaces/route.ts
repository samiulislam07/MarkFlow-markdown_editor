import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Workspace from '@/lib/mongodb/models/Workspace';
import User from '@/lib/mongodb/models/User';

// GET - Fetch user's workspaces
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Find workspaces where user is owner or collaborator
    const query: any = {
      $or: [
        { owner: user._id },
        { 'collaborators.user': user._id }
      ]
    };

    if (!includeArchived) {
      query.isArchived = false;
    }

    const workspaces = await Workspace.find(query)
      .populate('owner', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .sort({ updatedAt: -1 });

    return NextResponse.json(workspaces);

  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new workspace
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { name, description, isPersonal, settings } = body;

    if (!name) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspace = new Workspace({
      name,
      description: description || '',
      owner: user._id,
      isPersonal: isPersonal || false,
      settings: {
        theme: settings?.theme || 'auto',
        defaultView: settings?.defaultView || 'split'
      }
    });

    await workspace.save();

    await workspace.populate([
      { path: 'owner', select: 'name email avatar' },
      { path: 'collaborators.user', select: 'name email avatar' }
    ]);

    return NextResponse.json(workspace, { status: 201 });

  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 