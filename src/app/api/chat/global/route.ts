import { auth } from '@clerk/nextjs/server'
import { getGlobalUserChat } from '@/lib/services/chatService'
import { connectToDatabase } from '@/lib/mongodb/connect'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { userId } = await auth();
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

    await connectToDatabase()
    const messages = await getGlobalUserChat(userId)

    const formatted = messages.map(msg => ({
      sender: { firstName: msg.sender.firstName || 'Unknown' },
      text: msg.message,
      timestamp: msg.timestamp,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Error in /chat/global:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
