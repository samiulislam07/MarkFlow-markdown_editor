import { connectToDatabase } from '@/lib/mongodb/connect'
import  User from '@/lib/mongodb/models/User'
import { currentUser } from '@clerk/nextjs/server'

export async function createOrUpdateUser() {
  try {
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    await connectToDatabase()

    // Check if user exists
    const existingUser = await User.findOne({ clerkId: clerkUser.id })

    // Determine provider
    let provider = 'email'
    if (clerkUser.externalAccounts && clerkUser.externalAccounts.length > 0) {
      const googleAccount = clerkUser.externalAccounts.find(acc => acc.provider === 'google')
      const githubAccount = clerkUser.externalAccounts.find(acc => acc.provider === 'github')
      
      if (googleAccount) provider = 'google'
      else if (githubAccount) provider = 'github'
    }

    const userData = {
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      username: clerkUser.username,
      avatar: clerkUser.imageUrl,
      provider: provider,
      emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
      lastSignIn: new Date(),
      updatedAt: new Date(),
    }

    if (!existingUser) {
      // Create new user
      console.log('🆕 Creating new user via service:', clerkUser.id)
      const newUser = await User.create(userData)
      return newUser
    } else {
      // Update existing user
      console.log('🔄 Updating existing user via service:', clerkUser.id)
      const updatedUser = await User.findOneAndUpdate(
        { clerkId: clerkUser.id },
        userData,
        { new: true }
      )
      return updatedUser
    }
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error)
    return null
  }
}

export async function getUserByClerkId(clerkId: string) {
  try {
    await connectToDatabase()
    return await User.findOne({ clerkId })
  } catch (error) {
    console.error('Error getting user by Clerk ID:', error)
    return null
  }
}

export async function getUserSessions(clerkUserId: string) {
  try {
    await connectToDatabase()
    const { Session } = await import('@/lib/mongodb/models/session')
    return await Session.find({ clerkUserId, status: 'active' }).sort({ createdAt: -1 })
  } catch (error) {
    console.error('Error getting user sessions:', error)
    return []
  }
}