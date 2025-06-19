// "use client"
import { auth, currentUser } from '@clerk/nextjs/server'
import mongoose from 'mongoose'
import { connectToDatabase } from '@/lib/mongodb/connect'
import User from '@/lib/mongodb/models/User'
import Note from '@/lib/mongodb/models/Note'
import Workspace from '@/lib/mongodb/models/Workspace'
import { FileText, Plus, Clock, Search, Filter, Grid, List, Bookmark, Users, Settings, FolderOpen, UserIcon } from 'lucide-react'
import Link from 'next/link'
import DashboardDocuments from '../components/DashboardDocuments'
import ChatLauncher from '../components/ChatLauncher';

interface DashboardNote {
  _id: string
  title: string
  content: string
  lastEditedAt: Date
  createdAt: Date
  wordCount: number
  readingTime: number
  isArchived: boolean
  workspace?: {
    _id: string
    name: string
  }
  tags?: {
    _id: string
    name: string
    color: string
  }[]
}

interface DashboardWorkspace {
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

export default async function Dashboard() {
  try {
    const { userId } = await auth()
    const clerkUser = await currentUser()
    
    if (!userId || !clerkUser) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Error</h1>
            <p className="text-gray-600">Please sign in to access the dashboard.</p>
            <Link href="/sign-in" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Sign In
            </Link>
          </div>
        </div>
      )
    }

    // Connect to database and ensure connection is established
    await connectToDatabase()
    
    // Make sure mongoose is connected before proceeding
    if (mongoose.connection.readyState !== 1) {
      // Wait for connection to be fully established
      await new Promise(resolve => {
        const checkConnection = () => {
          if (mongoose.connection.readyState === 1) {
            resolve(true)
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        checkConnection()
      })
    }
    
    // Get or create user - improved logic to handle existing users
    let dbUser = await User.findOne({ clerkId: userId })
    
    if (!dbUser) {
      // Check if user exists with same email but different clerkId
      const existingUserByEmail = await User.findOne({ 
        email: clerkUser.emailAddresses[0]?.emailAddress 
      })
      
      if (existingUserByEmail) {
        // Update existing user with new clerkId instead of creating duplicate
        console.log('🔄 Updating existing user with new Clerk ID:', userId)
        const emailUserUpdate: any = {
          clerkId: userId,
          firstName: clerkUser.firstName || existingUserByEmail.firstName,
          lastName: clerkUser.lastName || existingUserByEmail.lastName,
          avatar: clerkUser.imageUrl || existingUserByEmail.avatar,
          emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified' || existingUserByEmail.emailVerified,
          lastLogin: new Date(),
          updatedAt: new Date()
        }
        
        // Only update username if Clerk has a valid username
        if (clerkUser.username && clerkUser.username.trim()) {
          emailUserUpdate.username = clerkUser.username.trim()
        }
        
        dbUser = await User.findByIdAndUpdate(
          existingUserByEmail._id,
          emailUserUpdate,
          { new: true }
        )
      } else {
        // Create new user only if no existing user found
        console.log('🆕 Creating new user in dashboard:', userId)
        try {
          // Generate a unique username if not provided by Clerk
          let username = clerkUser.username || '';
          if (!username) {
            // Create a base username from email or name
            const emailBase = clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] || '';
            const nameBase = `${clerkUser.firstName || ''}${clerkUser.lastName || ''}`.toLowerCase().replace(/\s+/g, '');
            username = emailBase || nameBase || `user${Date.now().toString().slice(-6)}`;
            
            // Check if username exists and append random numbers if needed
            const usernameExists = await User.findOne({ username });
            if (usernameExists) {
              username = `${username}${Math.floor(Math.random() * 10000)}`;
            }
          }
          
          const userData: any = {
            clerkId: userId,
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Unknown User',
            firstName: clerkUser.firstName || '',
            lastName: clerkUser.lastName || '',
            username: username,
            avatar: clerkUser.imageUrl || '',
            emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified' || false,
            provider: 'email',
            preferences: {
              theme: 'dark',
              language: 'en',
              notifications: { email: true, push: true, mentions: true, comments: true }
            },
            subscription: { plan: 'free', status: 'active' },
            isActive: true,
            lastLogin: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
          
          dbUser = await User.create(userData)
          console.log('✅ New user created successfully:', dbUser._id)
        } catch (error) {
          console.error('❌ Error creating user:', error)
          throw new Error('Failed to create user account')
        }
      }
    } else {
      // Update last login for existing user
      await User.findByIdAndUpdate(dbUser._id, {
        lastLogin: new Date(),
        updatedAt: new Date()
      })
    }

    // Ensure user has a default personal workspace
    let personalWorkspace = await Workspace.findOne({ 
      owner: dbUser._id, 
      isPersonal: true,
      isArchived: false 
    })

    if (!personalWorkspace) {
      console.log('📁 Creating default personal workspace for user:', dbUser._id)
      personalWorkspace = await Workspace.create({
        name: `${clerkUser.firstName || 'My'} Personal Workspace`,
        description: 'Your personal workspace for private documents and collaboration',
        owner: dbUser._id,
        collaborators: [],
        isPersonal: true,
        isArchived: false,
        settings: {
          theme: 'auto',
          defaultView: 'split'
        }
      })
    }

    // Get user's workspaces with detailed information
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
    const workspaces: DashboardWorkspace[] = workspacesRaw.map((workspace: Record<string, any>) => ({
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

    const workspaceIds = workspaces.map(w => w._id)

    // Get user's notes from all accessible workspaces
    const notesRaw = await Note.find({
      workspace: { $in: workspaceIds },
      isArchived: false
    })
    .populate('workspace', 'name')
    .sort({ lastEditedAt: -1 })
    .limit(20)
    .lean()

    // Convert to plain objects for client components
    const notes: DashboardNote[] = notesRaw.map((note: Record<string, any>) => ({
      _id: note._id.toString(),
      title: note.title || '',
      content: note.content || '',
      lastEditedAt: new Date(note.lastEditedAt),
      createdAt: new Date(note.createdAt),
      wordCount: note.wordCount || 0,
      readingTime: note.readingTime || 0,
      isArchived: note.isArchived || false,
      workspace: note.workspace ? {
        _id: (note.workspace as Record<string, any>)._id.toString(),
        name: (note.workspace as Record<string, any>).name
      } : undefined,
      tags: note.tags ? (note.tags as Record<string, any>[]).map((tag: Record<string, any>) => ({
        _id: tag._id.toString(),
        name: tag.name,
        color: tag.color
      })) : []
    }))

    // Get recent notes (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentNotesCount = notes.filter(note => new Date(note.lastEditedAt) >= sevenDaysAgo).length

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {clerkUser?.firstName || 'User'}! 👋
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your documents and collaborate with your team
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href={workspaces.length > 0 ? `/workspace/${workspaces[0]._id}` : "/workspaces/new"}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {workspaces.length > 0 ? "New Document" : "Create Workspace"}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Documents</p>
                  <p className="text-2xl font-bold text-gray-900">{notes.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Recent Activity</p>
                  <p className="text-2xl font-bold text-gray-900">{recentNotesCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Grid className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Workspaces</p>
                  <p className="text-2xl font-bold text-gray-900">{workspaces.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Bookmark className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Plan</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">{dbUser?.subscription?.plan || 'Free'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Workspaces Section */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">My Workspaces</h2>
                <Link
                  href="/workspaces/new"
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Workspace
                </Link>
              </div>
            </div>

            <div className="p-6">
              {workspaces.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workspaces.map((workspace) => (
                    <Link
                      key={workspace._id}
                      href={`/workspace/${workspace._id}`}
                      className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          {workspace.isPersonal ? (
                            <UserIcon className="w-5 h-5 text-blue-600 mr-2" />
                          ) : (
                            <Users className="w-5 h-5 text-green-600 mr-2" />
                          )}
                          <h3 className="font-medium text-gray-900 truncate">{workspace.name}</h3>
                        </div>
                        {workspace.isPersonal && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Personal
                          </span>
                        )}
                      </div>
                      
                      {workspace.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{workspace.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center">
                          <span>{workspace.collaborators.length + 1} member{workspace.collaborators.length !== 0 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>
                            {new Date(workspace.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      {workspace.collaborators.length > 0 && (
                        <div className="flex items-center mt-3 pt-3 border-t border-gray-200">
                          <div className="flex -space-x-2 overflow-hidden">
                            {workspace.collaborators.slice(0, 3).map((collab, index) => (
                              <div
                                key={collab.user._id}
                                className="inline-block h-6 w-6 rounded-full ring-2 ring-white"
                                title={`${collab.user.name} (${collab.role})`}
                              >
                                {collab.user.avatar ? (
                                  <img
                                    className="h-6 w-6 rounded-full"
                                    src={collab.user.avatar}
                                    alt={collab.user.name}
                                  />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-600">
                                      {collab.user.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                            {workspace.collaborators.length > 3 && (
                              <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  +{workspace.collaborators.length - 3}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="ml-2 text-xs text-gray-500">collaborating</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
                  <p className="text-gray-600 mb-4">Create your first workspace to start collaborating on documents.</p>
                  <Link
                    href="/workspaces/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Workspace
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Documents Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Recent Documents</h2>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Filter className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <DashboardDocuments initialNotes={notes} />

            {notes.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {notes.length} of your recent documents
                  </p>
                  <Link
                    href="/documents"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    View all documents →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              href="/workspaces/new"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-lg p-3 group-hover:bg-blue-200 transition-colors">
                  <Plus className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Create Workspace</h3>
                  <p className="text-sm text-gray-500">Start a new collaborative project</p>
                </div>
              </div>
            </Link>

            <Link
              href="/workspaces"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center">
                <div className="bg-green-100 rounded-lg p-3 group-hover:bg-green-200 transition-colors">
                  <Grid className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Manage Workspaces</h3>
                  <p className="text-sm text-gray-500">View and organize your workspaces</p>
                </div>
              </div>
            </Link>

            <Link
              href="/settings"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center">
                <div className="bg-purple-100 rounded-lg p-3 group-hover:bg-purple-200 transition-colors">
                  <Settings className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Account Settings</h3>
                  <p className="text-sm text-gray-500">Manage your preferences</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <ChatLauncher />
      </div>
    )
  } catch (error) {
    console.error('Dashboard error:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Dashboard Error</h1>
            <p className="text-red-700 mb-4">There was an error loading your dashboard. Please try refreshing the page.</p>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Refresh Page
            </Link>
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-red-600 font-medium">Error Details</summary>
              <pre className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded overflow-auto">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </pre>
            </details>
          </div>
        </div>
      </div>
    )
  }
}