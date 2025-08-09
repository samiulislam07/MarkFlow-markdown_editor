'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Mail, Clock, CheckCircle, XCircle, Copy } from 'lucide-react';

interface Invitation {
  email: string;
  role: 'editor' | 'commenter' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitedAt: string;
  expiresAt: string;
  token: string;
  invitedBy: {
    name: string;
    email: string;
  };
}

interface InvitationManagerProps {
  workspaceId: string;
  userRole: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function InvitationManager({ 
  workspaceId, 
  userRole, 
  isOpen, 
  onClose 
}: InvitationManagerProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newInvitation, setNewInvitation] = useState({
    email: '',
    role: 'viewer' as 'editor' | 'commenter' | 'viewer'
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`);
      const data = await response.json();
      
      if (response.ok) {
        setInvitations(data.invitations || []);
      } else {
        setError(data.error || 'Failed to load invitations');
      }
    } catch (err) {
      console.error('Failed to load invitations:', err);
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (isOpen) {
      fetchInvitations();
    }
  }, [isOpen, workspaceId, fetchInvitations]);

  // Only show if user has permission and modal is open
  if (!isOpen || (userRole !== 'owner' && userRole !== 'editor')) {
    return null;
  }

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newInvitation.email.trim()) {
      setError('Email is required');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newInvitation),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.emailSent) {
          setSuccess(`Invitation email sent successfully to ${newInvitation.email}`);
        } else {
          if (data.emailError?.includes('Gmail credentials not configured')) {
            setError(`Gmail credentials not configured. Please set up Gmail SMTP. Invitation created - you can copy the link below.`);
          } else {
            setSuccess(`Invitation created successfully. ${data.emailError ? 'Email delivery failed - you can copy the invitation link below.' : 'Please share the invitation link manually.'}`);
          }
        }
        setNewInvitation({ email: '', role: 'viewer' });
        fetchInvitations(); // Refresh the list
      } else {
        setError(data.error || 'Failed to send invitation');
      }
    } catch (err) {
      setError('Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const cancelInvitation = async (token: string) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations?token=${token}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchInvitations(); // Refresh the list
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to cancel invitation');
      }
    } catch (err) {
      setError('Failed to cancel invitation');
    }
  };

  const copyInvitationLink = async (token: string) => {
    const invitationLink = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setSuccess('Invitation link copied to clipboard');
    } catch (err) {
      setError('Failed to copy invitation link');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'editor':
        return 'bg-green-100 text-green-800';
      case 'commenter':
        return 'bg-yellow-100 text-yellow-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Manage Invitations</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Send New Invitation */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Send New Invitation</h3>
            <form onSubmit={sendInvitation} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={newInvitation.email}
                  onChange={(e) => setNewInvitation(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={newInvitation.role}
                  onChange={(e) => setNewInvitation(prev => ({ 
                    ...prev, 
                    role: e.target.value as 'editor' | 'commenter' | 'viewer' 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="viewer">Viewer - Can only view documents</option>
                  <option value="commenter">Commenter - Can view documents and add comments</option>
                  <option value="editor">Editor - Can create, edit, and delete documents</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Invitation'}
              </button>
            </form>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {/* Existing Invitations */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Invitations</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading invitations...</p>
              </div>
            ) : invitations.length > 0 ? (
              <div className="space-y-3">
                {invitations.map((invitation, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">{invitation.email}</span>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(invitation.role)}`}>
                            {invitation.role}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <div className="flex items-center">
                            {getStatusIcon(invitation.status)}
                            <span className="ml-1 capitalize">{invitation.status}</span>
                          </div>
                          <span>
                            Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                          </span>
                          <span>
                            Invited by: {invitation.invitedBy.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {invitation.status === 'pending' && (
                          <>
                            <button
                              onClick={() => copyInvitationLink(invitation.token)}
                              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                              title="Copy invitation link"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => cancelInvitation(invitation.token)}
                              className="p-2 text-red-400 hover:text-red-600 rounded-lg"
                              title="Cancel invitation"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No pending invitations</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 