import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb/connect'
import User from '@/lib/mongodb/models/User'
import Workspace from '@/lib/mongodb/models/Workspace'
import { syncChatParticipants } from '@/lib/services/chatService'

// DELETE - Remove a collaborator from a workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()

    const user = await User.findOne({ clerkId: userId })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const workspace = await Workspace.findById(workspaceId)
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Only workspace owner can remove collaborators
    if (workspace.owner.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden: Only the workspace owner can remove collaborators' }, { status: 403 })
    }

    // Get the collaborator user ID from request body
    const { collaboratorUserId } = await request.json()
    if (!collaboratorUserId) {
      return NextResponse.json({ error: 'Collaborator user ID is required' }, { status: 400 })
    }

    // Check if the collaborator exists in the workspace
    const collaboratorIndex = workspace.collaborators.findIndex(
      (collab: any) => collab.user.toString() === collaboratorUserId
    )

    if (collaboratorIndex === -1) {
      return NextResponse.json({ error: 'Collaborator not found in this workspace' }, { status: 404 })
    }

    // Remove the collaborator from the workspace
    workspace.collaborators.splice(collaboratorIndex, 1)
    workspace.updatedAt = new Date()
    await workspace.save()

    // Sync chat participants to remove the user from workspace chat
    await syncChatParticipants(workspaceId)

    return NextResponse.json({ 
      message: 'Collaborator removed successfully',
      removedUserId: collaboratorUserId 
    })

  } catch (error) {
    console.error('Error removing collaborator:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
