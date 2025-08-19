// src/app/api/chat/workspace/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getWorkspaceChat } from '@/lib/services/chatService'
import { connectToDatabase } from '@/lib/mongodb/connect'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')
    console.log('Fetching workspace chat for:', workspaceId)

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    await connectToDatabase()
    const messages = await getWorkspaceChat(workspaceId)

    //console.log('Fetched messages:', messages)

    const formatted = messages.map(msg => ({
      sender: { firstName: msg.sender?.firstName || 'Unknown' },
      text: msg.message,
      fileName: msg.fileName || null, // Use fileName if available
      fileUrl: msg.fileUrl || null, // Use fileUrl if available
      timestamp: msg.timestamp,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Error in /chat/workspace:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
