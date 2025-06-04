import { auth, currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb/connect'
import  User from '@/lib/mongodb/models/User'

export default async function Dashboard() {
  const { userId } = await auth()
  const clerkUser = await currentUser()
  
  // Get additional user data from your database
  await connectToDatabase()
  const dbUser = await User.findOne({ clerkId: userId })

  return (
    <div>
      <h1>Welcome, {clerkUser?.firstName}!</h1>
      <p>Email: {clerkUser?.emailAddresses[0]?.emailAddress}</p>
      <p>Database ID: {dbUser?._id}</p>
    </div>
  )
}