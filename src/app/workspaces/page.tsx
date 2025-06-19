import { auth, currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb/connect'
import User from '@/lib/mongodb/models/User'
import Workspace from '@/lib/mongodb/models/Workspace'
import { Plus, Users, UserIcon, Clock, Settings, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface WorkspacePageData {
  _id: string
  name: string
  description: string
  isPersonal: boolean
  owner: {
    _id: string
    name: string
    email: string
    avatar: string
  }
  collaborators: {
    user: {
      _id: string
      name: string
      email: string
      avatar: string
    }
    role: string
    joinedAt: Date
  }[]
  settings: {
    theme: string
    defaultView: string
  }
  createdAt: Date
  updatedAt: Date
}

export default async function WorkspacesPage() {
  try {
    const { userId } = await auth()
    const clerkUser = await currentUser()
    
    if (!userId || !clerkUser) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Error</h1>
            <p className="text-gray-600">Please sign in to access workspaces.</p>
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

    // Get user's workspaces
    const workspacesRaw = await Workspace.find({
      $or: [
        { owner: dbUser._id },
        { 'collaborators.user': dbUser._id }
      ],
      isArchived: false
    })
    .populate('owner', 'name email avatar')
    .populate('collaborators.user', 'name email avatar')
    .sort({ updatedAt: -1 })
    .lean()

    // Convert to plain objects for client components
    const workspaces: WorkspacePageData[] = workspacesRaw.map((workspace: Record<string, any>) => ({
      _id: workspace._id.toString(),
      name: workspace.name,
      description: workspace.description || '',
      isPersonal: workspace.isPersonal,
      owner: {
        _id: (workspace.owner as Record<string, any>)._id.toString(),
        name: (workspace.owner as Record<string, any>).name,
        email: (workspace.owner as Record<string, any>).email,
        avatar: (workspace.owner as Record<string, any>).avatar
      },
      collaborators: (workspace.collaborators as Record<string, any>[]).map((collab: Record<string, any>) => ({
        user: {
          _id: (collab.user as Record<string, any>)._id.toString(),
          name: (collab.user as Record<string, any>).name,
          email: (collab.user as Record<string, any>).email,
          avatar: (collab.user as Record<string, any>).avatar
        },
        role: collab.role,
        joinedAt: new Date(collab.joinedAt)
      })),
      settings: workspace.settings,
      createdAt: new Date(workspace.createdAt),
      updatedAt: new Date(workspace.updatedAt)
    }))

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link
                  href="/dashboard"
                  className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Workspaces</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage your collaborative projects and teams
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href="/workspaces/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  New Workspace
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {workspaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
                <div
                  key={workspace._id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        {workspace.isPersonal ? (
                          <UserIcon className="w-6 h-6 text-blue-600 mr-3" />
                        ) : (
                          <Users className="w-6 h-6 text-green-600 mr-3" />
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{workspace.name}</h3>
                          {workspace.isPersonal && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                              Personal
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/workspace/${workspace._id}/settings`}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Settings className="w-4 h-4" />
                      </Link>
                    </div>
                    
                    {workspace.description && (
                      <p className="text-sm text-gray-600 mb-4">{workspace.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center">
                        <span>{workspace.collaborators.length + 1} member{workspace.collaborators.length !== 0 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>Updated {new Date(workspace.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {workspace.collaborators.length > 0 && (
                      <div className="flex items-center mb-4 pb-4 border-b border-gray-200">
                        <div className="flex -space-x-2 overflow-hidden">
                          {workspace.collaborators.slice(0, 4).map((collab) => (
                            <div
                              key={collab.user._id}
                              className="inline-block h-8 w-8 rounded-full ring-2 ring-white"
                              title={`${collab.user.name} (${collab.role})`}
                            >
                              {collab.user.avatar ? (
                                <img
                                  className="h-8 w-8 rounded-full"
                                  src={collab.user.avatar}
                                  alt={collab.user.name}
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    {collab.user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                          {workspace.collaborators.length > 4 && (
                            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                +{workspace.collaborators.length - 4}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="ml-3 text-sm text-gray-500">collaborating</span>
                      </div>
                    )}
                    
                    <Link
                      href={`/workspace/${workspace._id}`}
                      className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Open Workspace
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No workspaces yet</h3>
              <p className="text-gray-600 mb-6">Create your first workspace to start collaborating on documents.</p>
              <Link
                href="/workspaces/new"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Workspace
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  } catch (error) {
    console.error('Workspaces page error:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
            <p className="text-red-700 mb-4">There was an error loading your workspaces.</p>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-block"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }
} 