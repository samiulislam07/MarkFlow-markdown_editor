import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Workspace from '@/lib/mongodb/models/Workspace';
import User from '@/lib/mongodb/models/User';
import { sendInvitationEmail } from '@/lib/services/emailService';
import crypto from 'crypto';

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
    const { name, description, isPersonal, settings, collaboratorEmails } = body;

    if (!name) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Process collaborator emails if provided - send invitations instead of adding directly
    const invitationResults = [];
    if (collaboratorEmails && Array.isArray(collaboratorEmails) && !isPersonal) {
      // We'll send invitations after workspace is created
    }

    const workspace = new Workspace({
      name,
      description: description || '',
      owner: user._id,
      collaborators: [], // Start with empty collaborators, will be added via invitations
      isPersonal: isPersonal || false,
      settings: {
        theme: settings?.theme || 'auto',
        defaultView: settings?.defaultView || 'split'
      }
    });

    await workspace.save();

    // Send invitations to collaborators after workspace is created
    if (collaboratorEmails && Array.isArray(collaboratorEmails) && !isPersonal) {
      for (const collaboratorData of collaboratorEmails) {
        const { email, role } = collaboratorData;
        
        // Skip if user is trying to invite themselves
        if (email.toLowerCase() === user.email.toLowerCase()) {
          continue;
        }

        // Generate invitation token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        // Check if user exists
        const invitedUser = await User.findOne({ email: email.toLowerCase() });
        const hasAccount = !!invitedUser;

        // Add invitation to workspace
        workspace.invitations.push({
          email: email.toLowerCase(),
          role: role || 'viewer',
          invitedBy: user._id,
          invitedAt: new Date(),
          status: 'pending',
          token,
          expiresAt
        });

        // Send invitation email
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

      // Save workspace with invitations
      await workspace.save();
    }

    await workspace.populate([
      { path: 'owner', select: 'name email avatar' },
      { path: 'collaborators.user', select: 'name email avatar' }
    ]);

    return NextResponse.json({
      ...workspace.toObject(),
      invitationResults
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 