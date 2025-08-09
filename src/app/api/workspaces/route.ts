import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose'
import { connectToDatabase } from '@/lib/mongodb/connect';
import Workspace, { ICollaborator } from '@/lib/mongodb/models/Workspace';
import User from '@/lib/mongodb/models/User';
import { sendInvitationEmail } from '@/lib/services/emailService';
import { createWorkspaceChat, syncChatParticipants } from '@/lib/services/chatService'
import Note from '@/lib/mongodb/models/Note'
import Comment from '@/lib/mongodb/models/Comment'
import Folder from '@/lib/mongodb/models/Folder'
import File from '@/lib/mongodb/models/File'
import Collaborator from '@/lib/mongodb/models/Collaborator'
import WorkspaceChat from '@/lib/mongodb/models/WorkspaceChat'

import crypto from 'crypto';

// GET - Fetch user's workspaces OR a single workspace by ID
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
    const workspaceId = searchParams.get('id'); // Check for a single workspace ID

    // --- START: MODIFIED LOGIC ---
    // If a specific workspace ID is provided, fetch that one.
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);

      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
      }

      // Verify user has access to this specific workspace
      const hasAccess = workspace.owner.toString() === user._id.toString() ||
        workspace.collaborators.some((collab: ICollaborator) => collab.user.toString() === user._id.toString());

      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Return the single workspace object
      return NextResponse.json(workspace);
    }
    // --- END: MODIFIED LOGIC ---


    // If no ID is provided, fetch all workspaces for the user (original logic)
    const includeArchived = searchParams.get('includeArchived') === 'true';

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

// POST - Create a new workspace (No changes needed here)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { name, description, isPersonal, settings, collaboratorEmails } = body;

    if (!name) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const invitationResults = [];
    if (collaboratorEmails && Array.isArray(collaboratorEmails) && !isPersonal) {
      // We'll send invitations after workspace is created
    }

    const workspace = new Workspace({
      name,
      description: description || '',
      owner: user._id,
      collaborators: [],
      isPersonal: isPersonal || false,
      settings: {
        theme: settings?.theme || 'auto',
        defaultView: settings?.defaultView || 'split'
      }
    });

    await workspace.save();

    if (collaboratorEmails && Array.isArray(collaboratorEmails) && !isPersonal) {
      for (const collaboratorData of collaboratorEmails) {
        const { email, role } = collaboratorData;
        
        if (email.toLowerCase() === user.email.toLowerCase()) {
          continue;
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitedUser = await User.findOne({ email: email.toLowerCase() });
        const hasAccount = !!invitedUser;

        workspace.invitations.push({
          email: email.toLowerCase(),
          role: role || 'viewer',
          invitedBy: user._id,
          invitedAt: new Date(),
          status: 'pending',
          token,
          expiresAt
        });

        const emailResult = await sendInvitationEmail({
          to: email.toLowerCase(),
          inviterName: user.name,
          inviterEmail: user.email,
          workspaceName: workspace.name,
          workspaceDescription: workspace.description,
          role: role || 'viewer',
          invitationToken: token,
          expiresAt,
          hasAccount
        });

        invitationResults.push({
          email,
          role: role || 'viewer',
          emailSent: emailResult.success,
          error: emailResult.error
        });
      }

      await workspace.save();
    }

    await workspace.populate([
      { path: 'owner', select: 'name email avatar' },
      { path: 'collaborators.user', select: 'name email avatar' }
    ]);

    await createWorkspaceChat(workspace._id.toString())
    await syncChatParticipants(workspace._id.toString())
    
    return NextResponse.json({
      ...workspace.toObject(),
      invitationResults
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a workspace and all its associated data
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id;

  // 1. Authentication and Authorization
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

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Crucially, verify that the current user is the owner
    if (workspace.owner.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden: Only the owner can delete this workspace.' }, { status: 403 });
    }

    // 2. Cascading Delete within a Database Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find all notes within the workspace to delete their associated comments
      const notesInWorkspace = await Note.find({ workspace: workspaceId }).select('_id').session(session);
      const noteIds = notesInWorkspace.map(n => n._id);
      
      // Delete all comments linked to the notes in this workspace
      if (noteIds.length > 0) {
        await Comment.deleteMany({ note: { $in: noteIds } }, { session });
      }

      // Delete all other associated data
      await Note.deleteMany({ workspace: workspaceId }, { session });
      await Folder.deleteMany({ workspace: workspaceId }, { session });
      await File.deleteMany({ workspace: workspaceId }, { session });
      await Collaborator.deleteMany({ workspace: workspaceId }, { session });
      await WorkspaceChat.deleteOne({ workspace: workspaceId }, { session });

      // Finally, delete the workspace itself
      await Workspace.findByIdAndDelete(workspaceId, { session });

      // If all operations succeed, commit the transaction
      await session.commitTransaction();

      return NextResponse.json({ message: 'Workspace and all associated data deleted successfully.' }, { status: 200 });

    } catch (error) {
      // If any operation fails, abort the entire transaction
      await session.abortTransaction();
      console.error('Error during workspace deletion transaction:', error);
      return NextResponse.json({ error: 'Failed to delete workspace. The operation was rolled back.' }, { status: 500 });
    } finally {
      // End the session
      session.endSession();
    }

  } catch (error) {
    console.error('Error deleting workspace:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
