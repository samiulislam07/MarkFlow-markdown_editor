import { auth, currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb/connect'
import User from '@/lib/mongodb/models/User'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import NewWorkspaceForm from './NewWorkspaceForm'

export default async function NewWorkspacePage() {
  try {
    const { userId } = await auth()
    const clerkUser = await currentUser()
    
    if (!userId || !clerkUser) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Error</h1>
            <p className="text-gray-600">Please sign in to create a workspace.</p>
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

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-6">
              <Link
                href="/workspaces"
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create New Workspace</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Set up a collaborative space for your team to work on documents
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-8">
              <NewWorkspaceForm />
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('New workspace page error:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
            <p className="text-red-700 mb-4">There was an error loading the workspace creation page.</p>
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