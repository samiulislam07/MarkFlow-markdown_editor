import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Note from '@/lib/mongodb/models/Note';
import User from '@/lib/mongodb/models/User';
import Workspace, { ICollaborator } from '@/lib/mongodb/models/Workspace';
import Folder from '@/lib/mongodb/models/Folder';
import Tag from '@/lib/mongodb/models/Tag';

// GET - Fetch notes for a user's workspace
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
    const isArchived = searchParams.get('archived') === 'true';
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query
    const query: any = { isArchived };
    
    if (workspaceId) {
      query.workspace = workspaceId;
    }
    
    if (folderId) {
      query.folder = folderId;
    } else if (folderId === null) {
      query.folder = null;
    }

    // Add search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Fetch notes with pagination
    const notes = await Note.find(query)
      .populate('author', 'name email avatar')
      .populate('lastEditedBy', 'name email avatar')
      .populate('tags', 'name color')
      .populate('folder', 'name color icon')
      .sort(search ? { score: { $meta: 'textScore' } } : { updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Note.countDocuments(query);

    return NextResponse.json({
      notes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new note
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { title, content, workspaceId, folderId, tags, isPublic } = body;

    if (!title || title.trim() === '') {
      return NextResponse.json({ 
        error: 'Title is required' 
      }, { status: 400 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let workspace;
    
    if (workspaceId) {
      // Use provided workspace
      workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
      }

      const hasAccess = workspace.owner.toString() === user._id.toString() ||
        workspace.collaborators.some((collab: ICollaborator) => 
          collab.user.toString() === user._id.toString() && 
          collab.role === 'editor'
        );

      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      // Create or find default workspace for user
      workspace = await Workspace.findOne({ 
        owner: user._id, 
        isPersonal: true,
        isArchived: false 
      });

      if (!workspace) {
        workspace = await Workspace.create({
          name: `${user.firstName || user.name || 'My'} Personal Workspace`,
          description: 'Default personal workspace',
          owner: user._id,
          collaborators: [],
          isPersonal: true,
          isArchived: false,
          settings: {
            theme: 'light',
            defaultView: 'split'
          }
        });
      }
    }

    const noteContent = content || '';
    const words = noteContent.split(/\s+/).filter((word: string) => word.length > 0);
    
    const note = new Note({
      title: title.trim(),
      content: noteContent,
      workspace: workspace._id,
      folder: folderId || null,
      author: user._id,
      lastEditedBy: user._id,
      tags: tags || [],
      isPublic: isPublic || false,
      wordCount: words.length,
      readingTime: Math.ceil(words.length / 200) || 0,
      version: 1,
      lastEditedAt: new Date()
    });

    await note.save();

    await note.populate([
      { path: 'author', select: 'name email avatar' },
      { path: 'lastEditedBy', select: 'name email avatar' },
      { path: 'workspace', select: 'name' }
    ]);

    return NextResponse.json(note, { status: 201 });

  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 