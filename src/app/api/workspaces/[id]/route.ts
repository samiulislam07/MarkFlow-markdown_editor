import mongoose from 'mongoose'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { connectToDatabase } from '@/lib/mongodb/connect'
import User from '@/lib/mongodb/models/User'
import Workspace from '@/lib/mongodb/models/Workspace'
import Note from '@/lib/mongodb/models/Note'
import Comment from '@/lib/mongodb/models/Comment'
import Folder from '@/lib/mongodb/models/Folder'
import File from '@/lib/mongodb/models/File'
import Collaborator from '@/lib/mongodb/models/Collaborator'
import WorkspaceChat from '@/lib/mongodb/models/WorkspaceChat'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: any }
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

    if (workspace.owner.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden: Only the owner can delete this workspace.' }, { status: 403 })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const notesInWorkspace = await Note.find({ workspace: workspaceId }).select('_id').session(session)
      const noteIds = notesInWorkspace.map(n => n._id)

      if (noteIds.length > 0) {
        await Comment.deleteMany({ note: { $in: noteIds } }, { session })
      }

      await Note.deleteMany({ workspace: workspaceId }, { session })
      await Folder.deleteMany({ workspace: workspaceId }, { session })
      await File.deleteMany({ workspace: workspaceId }, { session })
      await Collaborator.deleteMany({ workspace: workspaceId }, { session })
      await WorkspaceChat.deleteOne({ workspace: workspaceId }, { session })

      await Workspace.findByIdAndDelete(workspaceId, { session })

      await session.commitTransaction()
      return NextResponse.json({ message: 'Workspace and all associated data deleted successfully.' })
    } catch (error) {
      await session.abortTransaction()
      console.error('Error during workspace deletion transaction:', error)
      return NextResponse.json({ error: 'Failed to delete workspace. The operation was rolled back.' }, { status: 500 })
    } finally {
      session.endSession()
    }
  } catch (error) {
    console.error('Error deleting workspace:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


