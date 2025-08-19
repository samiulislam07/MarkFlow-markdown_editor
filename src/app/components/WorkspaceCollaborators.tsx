'use client';

import { useState } from 'react';
import { Users, UserPlus, MoreVertical, Shield, Eye, MessageSquare, Edit3, Trash2 } from 'lucide-react';
import InvitationManager from './InvitationManager';
import ConfirmationModal from './ConfirmationModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Collaborator {
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  role: 'editor' | 'commenter' | 'viewer';
  joinedAt: Date;
}

interface Owner {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface WorkspaceCollaboratorsProps {
  workspaceId: string;
  owner: Owner;
  collaborators: Collaborator[];
  userRole: string;
}

export default function WorkspaceCollaborators({
  workspaceId,
  owner,
  collaborators,
  userRole
}: WorkspaceCollaboratorsProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [collaboratorToRemove, setCollaboratorToRemove] = useState<Collaborator | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [localCollaborators, setLocalCollaborators] = useState<Collaborator[]>(collaborators);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'editor':
        return <Edit3 className="w-4 h-4" />;
      case 'commenter':
        return <MessageSquare className="w-4 h-4" />;
      case 'viewer':
        return <Eye className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
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
        return 'bg-purple-100 text-purple-800';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'editor':
        return 'Can create, edit, and delete documents';
      case 'commenter':
        return 'Can view documents and add comments';
      case 'viewer':
        return 'Can only view documents';
      default:
        return '';
    }
  };

  const handleRemoveCollaborator = async () => {
    if (!collaboratorToRemove) return;

    setIsRemoving(true);
    setRemoveError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/collaborators`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collaboratorUserId: collaboratorToRemove.user._id,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.indexOf('application/json') !== -1) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to remove collaborator');
        } else {
          throw new Error('Authentication session may have expired. Please refresh and try again.');
        }
      }

      // Remove collaborator from local state
      setLocalCollaborators(current => 
        current.filter(collab => collab.user._id !== collaboratorToRemove.user._id)
      );
      setCollaboratorToRemove(null);

    } catch (err: any) {
      console.error("Remove collaborator error:", err);
      setRemoveError(err.message);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {localCollaborators.length + 1}
              </span>
            </div>
            {(userRole === 'owner' || userRole === 'editor') && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Invite
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {/* Owner */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {owner.avatar ? (
                  <img
                    className="h-10 w-10 rounded-full"
                    src={owner.avatar}
                    alt={owner.name}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-purple-600">
                      {owner.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{owner.name}</p>
                  <p className="text-sm text-gray-500">{owner.email}</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <Shield className="w-3 h-3 mr-1" />
                  Owner
                </span>
              </div>
            </div>

            {/* Collaborators */}
            {localCollaborators.map((collaborator) => (
              <div key={collaborator.user._id} className="flex items-center justify-between">
                <div className="flex items-center">
                  {collaborator.user.avatar ? (
                    <img
                      className="h-10 w-10 rounded-full"
                      src={collaborator.user.avatar}
                      alt={collaborator.user.name}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {collaborator.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{collaborator.user.name}</p>
                    <p className="text-sm text-gray-500">{collaborator.user.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {getRoleDescription(collaborator.role)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(collaborator.role)}`}>
                    {getRoleIcon(collaborator.role)}
                    <span className="ml-1 capitalize">{collaborator.role}</span>
                  </span>
                  {userRole === 'owner' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => setCollaboratorToRemove(collaborator)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}

            {localCollaborators.length === 0 && (
              <div className="text-center py-6">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No collaborators yet</p>
                {(userRole === 'owner' || userRole === 'editor') && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Invite team members
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invitation Modal */}
      <InvitationManager
        workspaceId={workspaceId}
        userRole={userRole}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {/* Remove Collaborator Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!collaboratorToRemove}
        onClose={() => {
          setCollaboratorToRemove(null);
          setRemoveError(null);
        }}
        onConfirm={handleRemoveCollaborator}
        title="Remove Collaborator"
        message={`Are you sure you want to remove "${collaboratorToRemove?.user.name}" from this workspace? They will lose access to all documents and chat in this workspace.`}
        confirmText="Yes, Remove"
        isLoading={isRemoving}
        isDestructive={true}
        errorMessage={removeError}
      />
    </>
  );
} 