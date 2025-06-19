import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Workspace from '@/lib/mongodb/models/Workspace';
import User from '@/lib/mongodb/models/User';
import { sendWelcomeEmail } from '@/lib/services/emailService';
import { createWorkspaceChat, syncChatParticipants } from '@/lib/services/chatService'

// POST - Accept invitation
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ 
        error: 'Invitation token is required' 
      }, { status: 400 });
    }

    let user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find workspace with the invitation token
    const workspace = await Workspace.findOne({
      'invitations.token': token,
      'invitations.status': 'pending',
      'invitations.expiresAt': { $gt: new Date() }
    });

    if (!workspace) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation' 
      }, { status: 404 });
    }

    // Find the specific invitation
    const invitation = workspace.invitations.find((inv: any) => inv.token === token);
    if (!invitation) {
      return NextResponse.json({ 
        error: 'Invitation not found' 
      }, { status: 404 });
    }

    // Check if the invitation email matches the user's email
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ 
        error: 'This invitation is for a different email address' 
      }, { status: 403 });
    }

    // Check if this is a new user (first time accepting an invitation)
    const isNewUser = !user.lastLogin || new Date(user.lastLogin) < new Date(Date.now() - 24 * 60 * 60 * 1000); // First login in last 24h
    
    if (isNewUser) {
      // Send welcome email for new users
      await sendWelcomeEmail(user.email, user.name);
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();
    }

    // Check if user is already a collaborator
    const isAlreadyCollaborator = workspace.collaborators.some((collab: any) => 
      collab.user.toString() === user._id.toString()
    );

    if (isAlreadyCollaborator) {
      // Remove the invitation since user is already a collaborator
      workspace.invitations = workspace.invitations.filter((inv: any) => 
        inv.token !== token
      );
      await workspace.save();
      
      return NextResponse.json({ 
        message: 'You are already a collaborator in this workspace',
        workspace: {
          _id: workspace._id,
          name: workspace.name
        }
      });
    }

    // Add user as collaborator
    workspace.collaborators.push({
      user: user._id,
      role: invitation.role,
      joinedAt: new Date()
    });

    

    // Mark invitation as accepted
    invitation.status = 'accepted';
    
    await workspace.save();

    await syncChatParticipants(workspace._id.toString())

    return NextResponse.json({ 
      message: 'Invitation accepted successfully',
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        role: invitation.role
      }
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get invitation details by token (for preview before accepting)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ 
        error: 'Invitation token is required' 
      }, { status: 400 });
    }

    await connectToDatabase();

    // Find workspace with the invitation token
    const workspace = await Workspace.findOne({
      'invitations.token': token,
      'invitations.status': 'pending',
      'invitations.expiresAt': { $gt: new Date() }
    })
    .populate('owner', 'name email avatar')
    .populate('invitations.invitedBy', 'name email avatar')
    .lean();

    if (!workspace) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation' 
      }, { status: 404 });
    }

    // Find the specific invitation
    const invitation = (workspace as any).invitations.find((inv: any) => inv.token === token);
    if (!invitation) {
      return NextResponse.json({ 
        error: 'Invitation not found' 
      }, { status: 404 });
    }

    const workspaceData = workspace as any;
    
    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        invitedAt: invitation.invitedAt,
        expiresAt: invitation.expiresAt,
        invitedBy: invitation.invitedBy
      },
      workspace: {
        _id: workspaceData._id,
        name: workspaceData.name,
        description: workspaceData.description,
        owner: workspaceData.owner
      }
    });

  } catch (error) {
    console.error('Error fetching invitation details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 