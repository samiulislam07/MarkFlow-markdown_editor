import { connectToDatabase } from '@/lib/mongodb/connect'
import mongoose from 'mongoose'
import Workspace from '@/lib/mongodb/models/Workspace'
import WorkspaceChat from '@/lib/mongodb/models/WorkspaceChat'
import ChatMessage from '@/lib/mongodb/models/ChatMessage'
import User from '@/lib/mongodb/models/User'

// Create WorkspaceChat when a workspace is created
export async function createWorkspaceChat(workspaceId: string) {
  try {
    await connectToDatabase()
    const workspace = await Workspace.findById(workspaceId).populate('collaborators.user')

    if (!workspace) throw new Error('Workspace not found')

    const collaboratorIds = workspace.collaborators.map((collab: any) => collab.user._id)

    const newChat = await WorkspaceChat.create({
      workspace: workspace._id,
      participants: collaboratorIds,
    })

    console.log('Created WorkspaceChat:', newChat)
    return newChat
  } catch (err) {
    console.error('Error creating WorkspaceChat:', err)
    return null
  }
}

export async function syncChatParticipants(workspaceId: string) {
  try {
    await connectToDatabase()

    const workspace = await Workspace.findById(workspaceId).populate('collaborators.user')
    if (!workspace) throw new Error('Workspace not found')

    const collaboratorIds = workspace.collaborators.map((c: any) => c.user._id)


    const chat = await WorkspaceChat.findOne({ workspace: workspace._id })

    if (!chat) {
    await WorkspaceChat.create({
        workspace: workspace._id,
        participants: collaboratorIds,
    })
    } else {
    await WorkspaceChat.findByIdAndUpdate(chat._id, {
        $set: { participants: collaboratorIds },
    })
    }

    await WorkspaceChat.findOneAndUpdate(
      { workspace: workspace._id },
      { $set: { participants: collaboratorIds } }
    )
  } catch (error) {
    console.error('Error syncing chat participants:', error)
  }
}



// Send a message in a workspace
export async function sendMessage({
  senderId,
  workspaceId,
  message,
}: {
  senderId: string
  workspaceId: string
  message: string
}) {
  try {
    await connectToDatabase()

    const senderObjectId = new mongoose.Types.ObjectId(senderId)

    const chat = await WorkspaceChat.findOne({ workspace: workspaceId })

    if (!chat || !chat.participants.some((p: mongoose.Types.ObjectId) => p.equals(senderObjectId))) {
    throw new Error('User not authorized to send message in this workspace')
    }

    const newMessage = await ChatMessage.create({
      workspace: workspaceId,
      sender: senderId,
      message,
      fileUrl: null, // Assuming no file upload for this example
      timestamp: new Date(),
    })

    return newMessage
  } catch (error) {
    console.error('Error sending message:', error)
    return null
  }
}

export async function getWorkspaceChatlist(userid: string) {
  try {
    await connectToDatabase()
    const chats = await WorkspaceChat.find({ participants: userid })
      .populate('workspace', 'name')
      .sort({ updatedAt: -1 })

    return chats
  } catch (error) {
    console.error('Error getting workspace chat list:', error)
    return []
  }
}

// Get all chat messages for a specific workspace
export async function getWorkspaceChat(workspaceId: string) {
  try {
    await connectToDatabase()
    return await ChatMessage.find({ workspace: workspaceId })
      .populate('sender', 'firstName lastName avatar')
      .sort({ timestamp: 1 })
  } catch (error) {
    console.error('Error getting workspace chat:', error)
    return []
  }
}

// Get global chat view for a user (messages from all user's workspaces)
export async function getGlobalUserChat(userId: string) {
  try {
    await connectToDatabase()

    // Find all workspace chat IDs the user participates in
    const chats = await WorkspaceChat.find({ participants: userId })
    const workspaceIds = chats.map(chat => chat.workspace)

    return await ChatMessage.find({ workspace: { $in: workspaceIds } })
      .populate('sender', 'firstName lastName avatar')
      .populate('workspace', 'name')
      .sort({ timestamp: -1 })
  } catch (error) {
    console.error('Error getting global user chat:', error)
    return []
  }
}
