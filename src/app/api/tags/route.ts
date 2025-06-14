import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Tag from '@/lib/mongodb/models/Tag';
import User from '@/lib/mongodb/models/User';
import Workspace, { ICollaborator } from '@/lib/mongodb/models/Workspace';

// GET - Fetch tags for a workspace
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const search = searchParams.get('search');

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

    if (search) {
      query.$text = { $search: search };
    }

    const tags = await Tag.find(query)
      .populate('createdBy', 'name email avatar')
      .sort(search ? { score: { $meta: 'textScore' } } : { usageCount: -1, name: 1 });

    return NextResponse.json(tags);

  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { name, color, workspaceId, description } = body;

    if (!name || !workspaceId) {
      return NextResponse.json({ 
        error: 'Tag name and workspace are required' 
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

    const existingTag = await Tag.findOne({ name, workspace: workspaceId });
    if (existingTag) {
      return NextResponse.json({ error: 'Tag name already exists in this workspace' }, { status: 409 });
    }

    const tag = new Tag({
      name,
      color: color || '#6366f1',
      workspace: workspaceId,
      createdBy: user._id,
      description: description || ''
    });

    await tag.save();

    await tag.populate('createdBy', 'name email avatar');

    return NextResponse.json(tag, { status: 201 });

  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}