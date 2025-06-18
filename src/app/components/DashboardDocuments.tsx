'use client'
import { useState } from 'react'
import { FileText, Calendar } from 'lucide-react'
import Link from 'next/link'
import DeleteButton from './DeleteButton'

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

interface DashboardDocumentsProps {
  initialNotes: DashboardNote[]
}

export default function DashboardDocuments({ initialNotes }: DashboardDocumentsProps) {
  const [notes, setNotes] = useState<DashboardNote[]>(initialNotes)

  const handleDelete = (noteId: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note._id !== noteId))
  }

  if (notes.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
        <p className="text-gray-500 mb-6">Create your first document to get started</p>
        <Link
          href="/editor"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FileText className="w-5 h-5 mr-2" />
          Create Document
        </Link>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {notes.map((note) => (
        <div key={note._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/editor/${note._id}`}
                    className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors truncate block"
                  >
                    {note.title || 'Untitled Document'}
                  </Link>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-sm text-gray-500">
                      in {note.workspace?.name || 'Unknown Workspace'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {note.wordCount} words
                    </span>
                    <span className="text-sm text-gray-500">
                      {note.readingTime} min read
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Preview of content */}
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                {note.content?.substring(0, 150) || 'No content yet...'}
                {note.content && note.content.length > 150 && '...'}
              </p>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="text-right">
                <p>Last edited</p>
                <p className="font-medium">
                  {new Date(note.lastEditedAt).toLocaleDateString()}
                </p>
              </div>
              <Calendar className="w-4 h-4" />
              <DeleteButton 
                noteId={note._id} 
                noteTitle={note.title || 'Untitled Document'}
                onDelete={handleDelete}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 