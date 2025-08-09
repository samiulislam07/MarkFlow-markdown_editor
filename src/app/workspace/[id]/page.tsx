
import { auth, currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb/connect'
import User from '@/lib/mongodb/models/User'
import Workspace from '@/lib/mongodb/models/Workspace'
import Note from '@/lib/mongodb/models/Note'
import { ArrowLeft, Plus, Settings, FileText, Clock } from 'lucide-react'
import Link from 'next/link'
import WorkspaceCollaborators from '@/app/components/WorkspaceCollaborators'
import FileManager from '@/app/components/FileManager' // Import the new component

interface WorkspacePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = await params
  try {
    const { userId } = await auth()
    const clerkUser = await currentUser()
    
    if (!userId || !clerkUser) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Error</h1>
            <p className="text-gray-600">Please sign in to access this workspace.</p>
            <Link href="/sign-in" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Sign In
            </Link>
          </div>
        </div>
      )
    }

    await connectToDatabase()
    
    const dbUser = await User.findOne({ clerkId: userId })
    if (!dbUser) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">User Not Found</h1>
            <p className="text-gray-600">Please contact support.</p>
          </div>
        </div>
      )
    }

    const workspaceRaw = await Workspace.findById(id)
      .populate('owner', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .lean()

    if (!workspaceRaw) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Workspace Not Found</h1>
            <p className="text-gray-600">The workspace you're looking for doesn't exist or has been deleted.</p>
            <Link href="/workspaces" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Back to Workspaces
            </Link>
          </div>
        </div>
      )
    }

    const workspaceData = workspaceRaw as any

    const isOwner = workspaceData.owner._id.toString() === dbUser._id.toString()
    const isCollaborator = workspaceData.collaborators.some((collab: any) => 
      collab.user._id.toString() === dbUser._id.toString()
    )

    if (!isOwner && !isCollaborator) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this workspace.</p>
            <Link href="/workspaces" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Back to Workspaces
            </Link>
          </div>
        </div>
      )
    }

    const workspace = {
      _id: workspaceData._id.toString(),
      name: workspaceData.name,
      description: workspaceData.description || '',
      isPersonal: workspaceData.isPersonal,
      owner: {
        _id: workspaceData.owner._id.toString(),
        name: workspaceData.owner.name,
        email: workspaceData.owner.email,
        avatar: workspaceData.owner.avatar
      },
      collaborators: workspaceData.collaborators.map((collab: any) => ({
        user: {
          _id: collab.user._id.toString(),
          name: collab.user.name,
          email: collab.user.email,
          avatar: collab.user.avatar
        },
        role: collab.role,
        joinedAt: new Date(collab.joinedAt)
      })),
    }

    const userRole = isOwner ? 'owner' : 
      workspace.collaborators.find((c: any) => c.user._id === dbUser._id.toString())?.role || 'viewer'

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link
                  href="/workspaces"
                  className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <div className="flex items-center">
                    <h1 className="text-3xl font-bold text-gray-900 mr-3">{workspace.name}</h1>
                    {workspace.isPersonal && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Personal
                      </span>
                    )}
                  </div>
                  {workspace.description && (
                    <p className="mt-1 text-sm text-gray-500">{workspace.description}</p>
                  )}
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <span className="mr-4">{workspace.collaborators.length + 1} member{workspace.collaborators.length !== 0 ? 's' : ''}</span>
                    <span>Your role: <span className="capitalize font-medium">{userRole}</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {(userRole === 'owner' || userRole === 'editor') && (
                  <Link
                    href={`/editor?workspace=${workspace._id}`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    New Document
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Collaborators Section */}
          <WorkspaceCollaborators
            workspaceId={workspace._id}
            owner={workspace.owner}
            collaborators={workspace.collaborators}
            userRole={userRole}
          />

          {/* START: New File Manager Section */}
          <div className="mt-8">
            <FileManager workspaceId={workspace._id} userRole={userRole} />
          </div>
          {/* END: New File Manager Section */}

        </div>
      </div>
    )
  } catch (error) {
    console.error('Workspace page error:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
            <p className="text-red-700 mb-4">There was an error loading this workspace.</p>
            <Link
              href="/workspaces"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-block"
            >
              Back to Workspaces
            </Link>
          </div>
        </div>
      </div>
    )
  }
}
