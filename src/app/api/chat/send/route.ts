import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb/connect'
import Chat from '@/lib/mongodb/models/WorkspaceChat'
import ChatMessage from '@/lib/mongodb/models/ChatMessage'
import fs from 'fs/promises'
import path from 'path'

export const config = {
  runtime: 'nodejs',
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }


    const formData = await request.formData()
    
    const message = formData.get('message') as string
    const workspaceId = formData.get('workspaceId') as string
    const file = formData.get('file') as File | null

    if (!workspaceId || (!message && !file)) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    await connectToDatabase()
    const User = (await import('@/lib/mongodb/models/User')).default
    const user = await User.findOne({ clerkId: userId })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const chat = await Chat.findOne({ workspace: workspaceId })
    if (!chat) {
      return NextResponse.json({ message: 'Chat not found' }, { status: 404 })
    }


    let fileUrl = null
    if (file) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      await fs.mkdir(uploadsDir, { recursive: true })

      const filename = `${Date.now()}-${file.name}`
      const filePath = path.join(uploadsDir, filename)

      await fs.writeFile(filePath, buffer)
      fileUrl = `/uploads/${filename}`
    }

    if (!message && !fileUrl) {
      return NextResponse.json({ message: 'You must send a message or file' }, { status: 400 })
    }

   console.log('file:', file);
    console.log('file.name:', file?.name);;

    const newMessage = await ChatMessage.create({
      workspace: chat.workspace,
      sender: user._id,
      message: message || '',
      fileUrl: fileUrl || null,
      fileName: file?.name || null,
      timestamp: new Date(),
    })

    console.log('New message created:', newMessage)

    return NextResponse.json({
      sender: { firstName: user.firstName || 'You' },
      text: newMessage.message,
      fileUrl: newMessage.fileUrl,
      fileName: newMessage.fileName,
      timestamp: newMessage.timestamp,
    })
  } catch (error: any) {
    console.error('❌ Error sending chat message:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 })
  }
}
