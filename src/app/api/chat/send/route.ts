import { NextRequest, NextResponse } from 'next/server'
import Chat from '@/lib/mongodb/models/WorkspaceChat'
import ChatMessage from '@/lib/mongodb/models/ChatMessage'
import { auth } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb/connect'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, message: messageText } = body

    if (!workspaceId || !messageText) {
      return NextResponse.json({ message: 'Missing required fields', workspaceId, messageText }, { status: 400 })
    }

    await connectToDatabase()

    // Find user in DB
    const User = (await import('@/lib/mongodb/models/User')).default
    const user = await User.findOne({ clerkId: userId })
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Find chat for workspace
    const chat = await Chat.findOne({ workspace: workspaceId })
    if (!chat) {
      return NextResponse.json({ message: 'Chat not found' }, { status: 404 })
    }

    // Save message
    const newMessage = await ChatMessage.create({
      workspace: chat.workspace,
      sender: user._id,
      message: messageText,
      timestamp: new Date(),
    })

    return NextResponse.json({
      sender: { firstName: user.firstName || 'You' },
      text: newMessage.message,
      timestamp: newMessage.timestamp,
    })
  } catch (error: any) {
    console.error('❌ Error in /api/chat/send:', error)
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}