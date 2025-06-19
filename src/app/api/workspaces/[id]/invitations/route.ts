import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Workspace from '@/lib/mongodb/models/Workspace';
import User from '@/lib/mongodb/models/User';
import { sendInvitationEmail } from '@/lib/services/emailService';
import crypto from 'crypto';

interface InvitationParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - Fetch workspace invitations
export async function GET(request: NextRequest, { params }: InvitationParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspace = await Workspace.findById(id)
      .populate('invitations.invitedBy', 'name email avatar')
      .lean() as any;

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user is owner or has permission to view invitations
    const isOwner = workspace.owner.toString() === user._id.toString();
    const collaborator = workspace.collaborators.find((collab: any) => 
      collab.user.toString() === user._id.toString()
    );
    const isCollaborator = !!collaborator;
    const userRole = isOwner ? 'owner' : (collaborator?.role || null);

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only owners and editors can see all invitations, collaborators can only see their own
    let invitations = workspace.invitations || [];
    if (!isOwner && userRole !== 'editor') {
      invitations = workspace.invitations?.filter((inv: any) => 
        inv.email === user.email
      ) || [];
    }

    return NextResponse.json({ invitations });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send workspace invitation
export async function POST(request: NextRequest, { params }: InvitationParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json({ 
        error: 'Email and role are required' 
      }, { status: 400 });
    }

    if (!['editor', 'commenter', 'viewer'].includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be editor, commenter, or viewer' 
      }, { status: 400 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user has permission to invite (only owners and editors)
    const isOwner = workspace.owner.toString() === user._id.toString();
    const userRole = workspace.collaborators.find((collab: any) => 
      collab.user.toString() === user._id.toString()
    )?.role;

    if (!isOwner && userRole !== 'editor') {
      return NextResponse.json({ 
        error: 'Only workspace owners and editors can send invitations' 
      }, { status: 403 });
    }

    // Check if user is trying to invite themselves
    if (email.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json({ 
        error: 'You cannot invite yourself' 
      }, { status: 400 });
    }

    // Check if user is already a collaborator
    const existingCollaborator = workspace.collaborators.find((collab: any) => {
      // We need to populate to get the email, for now check if user exists
      return false; // We'll check by finding the user first
    });

    // Check if user exists in the system
    const invitedUser = await User.findOne({ email: email.toLowerCase() });
    let hasAccount = false;
    
    if (invitedUser) {
      hasAccount = true;
      // Check if already a collaborator
      const isAlreadyCollaborator = workspace.collaborators.some((collab: any) => 
        collab.user.toString() === invitedUser._id.toString()
      );
      
      if (isAlreadyCollaborator) {
        return NextResponse.json({ 
          error: 'User is already a collaborator in this workspace' 
        }, { status: 400 });
      }
    }

    // Check if there's already a pending invitation
    const existingInvitation = workspace.invitations.find((inv: any) => 
      inv.email.toLowerCase() === email.toLowerCase() && 
      inv.status === 'pending' &&
      inv.expiresAt > new Date()
    );

    if (existingInvitation) {
      return NextResponse.json({ 
        error: 'An invitation is already pending for this email' 
      }, { status: 400 });
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Add invitation to workspace
    workspace.invitations.push({
      email: email.toLowerCase(),
      role,
      invitedBy: user._id,
      invitedAt: new Date(),
      status: 'pending',
      token,
      expiresAt
    });

    await workspace.save();

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      to: email.toLowerCase(),
      inviterName: user.name,
      inviterEmail: user.email,
      workspaceName: workspace.name,
      workspaceDescription: workspace.description,
      role,
      invitationToken: token,
      expiresAt,
      hasAccount
    });

    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

    // Return success even if email fails (invitation still created)
    return NextResponse.json({ 
      message: emailResult.success 
        ? 'Invitation sent successfully' 
        : 'Invitation created successfully (email delivery failed)',
      invitationLink,
      emailSent: emailResult.success,
      emailError: emailResult.error,
      invitation: {
        email,
        role,
        token,
        expiresAt,
        hasAccount
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Cancel/revoke invitation
export async function DELETE(request: NextRequest, { params }: InvitationParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const invitationToken = searchParams.get('token');

    if (!invitationToken) {
      return NextResponse.json({ 
        error: 'Invitation token is required' 
      }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user has permission to cancel invitations (only owners and editors)
    const isOwner = workspace.owner.toString() === user._id.toString();
    const userRole = workspace.collaborators.find((collab: any) => 
      collab.user.toString() === user._id.toString()
    )?.role;

    if (!isOwner && userRole !== 'editor') {
      return NextResponse.json({ 
        error: 'Only workspace owners and editors can cancel invitations' 
      }, { status: 403 });
    }

    // Find and remove the invitation
    const invitationIndex = workspace.invitations.findIndex((inv: any) => 
      inv.token === invitationToken
    );

    if (invitationIndex === -1) {
      return NextResponse.json({ 
        error: 'Invitation not found' 
      }, { status: 404 });
    }

    workspace.invitations.splice(invitationIndex, 1);
    await workspace.save();

    return NextResponse.json({ 
      message: 'Invitation cancelled successfully' 
    });

  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 