import { auth, currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb/connect'
import User from '@/lib/mongodb/models/User'
import Note from '@/lib/mongodb/models/Note'
import Workspace from '@/lib/mongodb/models/Workspace'
import { FileText, Plus, Clock, Search, Filter, Grid, List, Bookmark } from 'lucide-react'
import Link from 'next/link'
import DashboardDocuments from '../components/DashboardDocuments'

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

    // Connect to database
    await connectToDatabase()
    
    // Get or create user
    let dbUser = await User.findOne({ clerkId: userId })
    if (!dbUser) {
      dbUser = await User.create({
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Unknown User',
        firstName: clerkUser.firstName || '',
        lastName: clerkUser.lastName || '',
        username: clerkUser.username || '',
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
      })
    } else {
      await User.findByIdAndUpdate(dbUser._id, { 
        lastLogin: new Date(),
        updatedAt: new Date()
      })
    }

    // Get user's workspaces
    const workspaces = await Workspace.find({
      $or: [
        { owner: dbUser._id },
        { 'collaborators.user': dbUser._id }
      ],
      isArchived: false
    }).select('_id name').lean()

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
                  href="/editor"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  New Document
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
              href="/editor"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-lg p-3 group-hover:bg-blue-200 transition-colors">
                  <Plus className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">New Document</h3>
                  <p className="text-sm text-gray-500">Start writing a new document</p>
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
                  <h3 className="text-lg font-medium text-gray-900">Browse Workspaces</h3>
                  <p className="text-sm text-gray-500">Manage your team workspaces</p>
                </div>
              </div>
            </Link>

            <Link
              href="/settings"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center">
                <div className="bg-purple-100 rounded-lg p-3 group-hover:bg-purple-200 transition-colors">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Account Settings</h3>
                  <p className="text-sm text-gray-500">Manage your preferences</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
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
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-block"
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