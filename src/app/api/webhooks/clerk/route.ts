import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { connectToDatabase } from '@/lib/mongodb/connect'
import User from '@/lib/mongodb/models/User'
import { Session } from '@/lib/mongodb/models/session'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const headersList = headers()
  
  const heads = {
    'svix-id':  (await headersList).get('svix-id') || '',
    'svix-timestamp': (await headersList).get('svix-timestamp') || '',
    'svix-signature': (await headersList).get('svix-signature') || '',
  }

  const wh = new Webhook(webhookSecret)
  let evt: any

  try {
    evt = wh.verify(payload, heads)
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return NextResponse.json({ message: 'Webhook verification failed' }, { status: 400 })
  }

  const eventType = evt.type
  const { id, email_addresses, first_name, last_name, username, image_url, external_accounts } = evt.data

  try {
    await connectToDatabase()

    // Determine provider
    let provider = 'email'
    if (external_accounts && external_accounts.length > 0) {
      const googleAccount = external_accounts.find((acc: any) => acc.provider === 'google')
      const githubAccount = external_accounts.find((acc: any) => acc.provider === 'github')
      
      if (googleAccount) provider = 'google'
      else if (githubAccount) provider = 'github'
    }

    switch (eventType) {
      case 'user.created':
        console.log('🆕 Creating new user:', id)
        await User.create({
          clerkId: id,
          email: email_addresses[0]?.email_address,
          firstName: first_name,
          lastName: last_name,
          username: username,
          avatar: image_url,
          provider: provider,
          emailVerified: email_addresses[0]?.verification?.status === 'verified',
          lastSignIn: new Date(),
        })
        console.log('✅ User created successfully')
        break

      case 'user.updated':
        console.log('🔄 Updating user:', id)
        await User.findOneAndUpdate(
          { clerkId: id },
          {
            email: email_addresses[0]?.email_address,
            firstName: first_name,
            lastName: last_name,
            username: username,
            avatar: image_url,
            provider: provider,
            emailVerified: email_addresses[0]?.verification?.status === 'verified',
            updatedAt: new Date(),
          }
        )
        break

      case 'user.deleted':
        console.log('🗑️ Deleting user:', id)
        await User.findOneAndDelete({ clerkId: id })
        await Session.deleteMany({ clerkUserId: id })
        break

      case 'session.created':
        console.log('🔐 Session created:', evt.data.id)
        await Session.create({
          clerkSessionId: evt.data.id,
          clerkUserId: evt.data.user_id,
          status: evt.data.status,
          lastActiveAt: new Date(evt.data.last_active_at),
          expireAt: new Date(evt.data.expire_at),
        })
        
        // Update user's last sign in
        await User.findOneAndUpdate(
          { clerkId: evt.data.user_id },
          { lastSignIn: new Date() }
        )
        break

      case 'session.ended':
      case 'session.removed':
        console.log('🔚 Session ended:', evt.data.id)
        await Session.findOneAndUpdate(
          { clerkSessionId: evt.data.id },
          { status: 'ended' }
        )
        break

      default:
        console.log('ℹ️ Unhandled event type:', eventType)
    }

    return NextResponse.json({ message: 'Webhook processed successfully' })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}