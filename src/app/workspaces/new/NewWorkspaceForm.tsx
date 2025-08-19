'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, UserIcon, Plus, X, AlertCircle } from 'lucide-react'

interface CollaboratorEmail {
  id: string
  email: string
  role: 'editor' | 'commenter' | 'viewer'
}

export default function NewWorkspaceForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPersonal: false
  })
  const [collaborators, setCollaborators] = useState<CollaboratorEmail[]>([])
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('')

  const addCollaborator = () => {
    if (!newCollaboratorEmail.trim()) return
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newCollaboratorEmail)) {
      setError('Please enter a valid email address')
      return
    }

    if (collaborators.some(c => c.email === newCollaboratorEmail)) {
      setError('This collaborator has already been added')
      return
    }

    const newCollaborator: CollaboratorEmail = {
      id: Date.now().toString(),
      email: newCollaboratorEmail.trim(),
      role: 'editor'
    }

    setCollaborators([...collaborators, newCollaborator])
    setNewCollaboratorEmail('')
    setError('')
  }

  const removeCollaborator = (id: string) => {
    setCollaborators(collaborators.filter(c => c.id !== id))
  }

  const updateCollaboratorRole = (id: string, role: 'editor' | 'commenter' | 'viewer') => {
    setCollaborators(collaborators.map(c => 
      c.id === id ? { ...c, role } : c
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!formData.name.trim()) {
      setError('Workspace name is required')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          isPersonal: formData.isPersonal,
          collaboratorEmails: collaborators.map(c => ({
            email: c.email,
            role: c.role
          }))
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create workspace')
      }

      const result = await response.json()
      
      // Show invitation results if any collaborators were invited
      if (result.invitationResults && result.invitationResults.length > 0) {
        const successCount = result.invitationResults.filter((r: any) => r.emailSent).length
        const failCount = result.invitationResults.length - successCount
        
        if (successCount > 0) {
          console.log(`✅ ${successCount} invitation(s) sent successfully`)
        }
        if (failCount > 0) {
          console.log(`⚠️ ${failCount} invitation(s) failed to send (but workspace created successfully)`)
        }
      }
      
      router.push(`/workspace/${result._id}`)
    } catch (err) {
      console.error('Error creating workspace:', err)
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Workspace Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, isPersonal: true })}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              formData.isPersonal
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center mb-2">
              <UserIcon className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-medium text-gray-900">Personal Workspace</span>
            </div>
            <p className="text-sm text-gray-600">
              A private workspace for your personal documents
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFormData({ ...formData, isPersonal: false })}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              !formData.isPersonal
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center mb-2">
              <Users className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-medium text-gray-900">Team Workspace</span>
            </div>
            <p className="text-sm text-gray-600">
              A collaborative workspace for team projects
            </p>
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Workspace Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Marketing Team, Personal Notes, Project Alpha"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the purpose of this workspace..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {!formData.isPersonal && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Invite Collaborators (Optional)
          </label>
          
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              value={newCollaboratorEmail}
              onChange={(e) => setNewCollaboratorEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCollaborator())}
            />
            <button
              type="button"
              onClick={addCollaborator}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {collaborators.length > 0 && (
            <div className="space-y-2">
              {collaborators.map((collaborator) => (
                <div key={collaborator.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-900">{collaborator.email}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={collaborator.role}
                      onChange={(e) => updateCollaboratorRole(collaborator.id, e.target.value as 'editor' | 'commenter' | 'viewer')}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="editor">Editor - Can create & edit</option>
                      <option value="commenter">Commenter - Can comment</option>
                      <option value="viewer">Viewer - Can only view</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeCollaborator(collaborator.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end space-x-4 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !formData.name.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Creating...' : 'Create Workspace'}
        </button>
      </div>
    </form>
  )
} 