import { auth, currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb/connect'
import User from '@/lib/mongodb/models/User'
import Workspace from '@/lib/mongodb/models/Workspace'
import Note from '@/lib/mongodb/models/Note'
import { ArrowLeft, Plus, Users, Settings, FileText, Clock, UserPlus } from 'lucide-react'
import Link from 'next/link'
import WorkspaceCollaborators from '@/app/components/WorkspaceCollaborators'

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

    // Get workspace with collaborators
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

    // Type assertion for workspace data
    const workspaceData = workspaceRaw as any

    // Check if user has access to this workspace
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

    // Convert workspace to plain object
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
      settings: workspaceData.settings,
      createdAt: new Date(workspaceData.createdAt),
      updatedAt: new Date(workspaceData.updatedAt)
    }

    // Get workspace documents
    const notesRaw = await Note.find({
      workspace: id,
      isArchived: false
    })
    .populate('author', 'name email avatar')
    .populate('lastEditedBy', 'name email avatar')
    .sort({ lastEditedAt: -1 })
    .lean()

    const notes = notesRaw.map((note: any) => ({
      _id: note._id.toString(),
      title: note.title,
      content: note.content || '',
      wordCount: note.wordCount || 0,
      readingTime: note.readingTime || 0,
      author: {
        _id: note.author._id.toString(),
        name: note.author.name,
        email: note.author.email,
        avatar: note.author.avatar
      },
      lastEditedBy: note.lastEditedBy ? {
        _id: note.lastEditedBy._id.toString(),
        name: note.lastEditedBy.name,
        email: note.lastEditedBy.email,
        avatar: note.lastEditedBy.avatar
      } : note.author,
      createdAt: new Date(note.createdAt),
      lastEditedAt: new Date(note.lastEditedAt)
    }))

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
                {userRole === 'owner' && (
                  <Link
                    href={`/workspace/${workspace._id}/settings`}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <Settings className="w-5 h-5" />
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

          {/* Documents Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Documents</h2>
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {notes.length}
                  </span>
                </div>
                {(userRole === 'owner' || userRole === 'editor') && (
                  <Link
                    href={`/editor?workspace=${workspace._id}`}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Document
                  </Link>
                )}
              </div>
            </div>

            <div className="p-6">
              {notes.length > 0 ? (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <Link
                      key={note._id}
                      href={`/editor/${note._id}`}
                      className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">{note.title}</h3>
                          {note.content && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {note.content.substring(0, 150)}...
                            </p>
                          )}
                          <div className="flex items-center text-xs text-gray-500 space-x-4">
                            <span>{note.wordCount} words</span>
                            <span>{note.readingTime} min read</span>
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>
                                Last edited {new Date(note.lastEditedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex items-center">
                          {note.lastEditedBy.avatar ? (
                            <img
                              className="h-6 w-6 rounded-full"
                              src={note.lastEditedBy.avatar}
                              alt={note.lastEditedBy.name}
                              title={`Last edited by ${note.lastEditedBy.name}`}
                            />
                          ) : (
                            <div 
                              className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center"
                              title={`Last edited by ${note.lastEditedBy.name}`}
                            >
                              <span className="text-xs font-medium text-gray-600">
                                {note.lastEditedBy.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                  <p className="text-gray-600 mb-4">Start creating documents in this workspace.</p>
                  {(userRole === 'owner' || userRole === 'editor') && (
                    <Link
                      href={`/editor?workspace=${workspace._id}`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Document
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
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