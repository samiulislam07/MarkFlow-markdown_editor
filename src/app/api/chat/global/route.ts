import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb/connect'
import User from '@/lib/mongodb/models/User'
import Workspace from '@/lib/mongodb/models/Workspace'

export async function GET(req: Request) {
  await connectToDatabase()

  const clerkUser = await currentUser()
  if (!clerkUser) return new Response('Unauthorized', { status: 401 })

  // Get MongoDB user document
  const dbUser = await User.findOne({ clerkId: clerkUser.id })
  if (!dbUser || !dbUser._id) return new Response('User not found', { status: 404 })

  // Fetch all workspaces where user is owner or collaborator
  const workspaces = await Workspace.find({
    $or: [
      { owner: dbUser._id },
      { 'collaborators.user': dbUser._id }
    ],
    isArchived: false
  })
    .populate('owner', 'name')
    .populate('collaborators.user', 'name email')
    .lean()

  const chatList = workspaces.map(ws => ({
    _id: (ws._id as string | { toString(): string }).toString(),
    name: ws.name,
    isPersonal: ws.isPersonal,
    participants: [
      {
        _id: ws.owner?._id.toString(),
        name: ws.owner?.name,
        role: 'owner'
      },
      ...(ws.collaborators || []).map((collab: any) => ({
        _id: collab.user._id.toString(),
        name: collab.user.name,
        role: collab.role
      }))
    ]
  }))

  return Response.json(chatList)
}
