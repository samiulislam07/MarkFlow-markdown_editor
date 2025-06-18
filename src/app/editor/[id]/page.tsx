import EnhancedMarkdownEditor from '@/app/components/EnhancedMarkdownEditor'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { connectToDatabase } from '@/lib/mongodb/connect'
import Note from '@/lib/mongodb/models/Note'
import User from '@/lib/mongodb/models/User'
import Workspace from '@/lib/mongodb/models/Workspace'
import Folder from '@/lib/mongodb/models/Folder'
import Tag from '@/lib/mongodb/models/Tag'

interface EditorPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function DocumentEditorPage({ params }: EditorPageProps) {
  const { id } = await params;
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  try {
    await connectToDatabase()
    
    // Get user from database
    const dbUser = await User.findOne({ clerkId: userId })
    if (!dbUser) {
      redirect('/sign-in')
    }

    // Get the specific note
    const note = await Note.findById(id)
      .populate('workspace', 'name owner collaborators')
      .lean()

    if (!note) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Not Found</h1>
            <p className="text-gray-600 mb-4">The document you're looking for doesn't exist or has been deleted.</p>
            <a href="/dashboard" className="text-blue-600 hover:text-blue-800">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      )
    }

    // Check if user has access to this note
    const workspace = (note as any).workspace
    const hasAccess = workspace.owner.toString() === dbUser._id.toString() ||
      workspace.collaborators.some((collab: any) => 
        collab.user.toString() === dbUser._id.toString()
      )

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">You don't have permission to access this document.</p>
            <a href="/dashboard" className="text-blue-600 hover:text-blue-800">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      )
    }

    return (
      <EnhancedMarkdownEditor 
        documentId={id}
        initialTitle={(note as any).title}
        initialContent={(note as any).content}
      />
    )
  } catch (error) {
    console.error('Error loading document:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading Document</h1>
          <p className="text-gray-600 mb-4">There was an error loading the document. Please try again.</p>
          <a href="/dashboard" className="text-blue-600 hover:text-blue-800">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    )
  }
} 