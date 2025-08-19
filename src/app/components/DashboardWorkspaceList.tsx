// src/app/components/DashboardWorkspaceList.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MoreVertical, Trash2, Users, UserIcon, Clock } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";

// Define interfaces for the props we'll receive from the server component
interface User {
  _id: string;
}

interface Workspace {
  _id: string;
  name: string;
  description?: string;
  owner: { _id: string };
  collaborators: any[];
  isPersonal: boolean;
  updatedAt: Date;
}

interface DashboardWorkspaceListProps {
  initialWorkspaces: Workspace[];
  currentUser: User;
}

export default function DashboardWorkspaceList({ initialWorkspaces, currentUser }: DashboardWorkspaceListProps) {
  // Use state to manage the list of workspaces so we can update it after deletion
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  
  // State for the confirmation modal
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Keep state in sync with props if they change
  useEffect(() => {
    setWorkspaces(initialWorkspaces);
  }, [initialWorkspaces]);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!workspaceToDelete) return;
  
    setIsDeleting(true);
    setDeleteError(null);
  
    try {
      const response = await fetch(`/api/workspaces/${workspaceToDelete._id}`, {
        method: 'DELETE',
      });
  
      // If the response is not OK, we need to handle it carefully
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        
        // Check if the server sent a JSON error
        if (contentType && contentType.indexOf('application/json') !== -1) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'An unknown server error occurred.');
        } else {
          // If not JSON, it's likely an HTML page from an auth redirect
          throw new Error('Authentication session may have expired. Please refresh and try again.');
        }
      }
  
      // On success, update the UI
      setWorkspaces(current => current.filter(ws => ws._id !== workspaceToDelete._id));
      setWorkspaceToDelete(null);
  
    } catch (err: any) {
      console.error("Delete Error:", err);
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((workspace) => (
          <div key={workspace._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col justify-between hover:border-blue-400 transition-colors">
            <div>
              <div className="flex items-start justify-between mb-3">
                <Link href={`/workspace/${workspace._id}`} className="flex items-center group">
                  {workspace.isPersonal ? (
                    <UserIcon className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                  ) : (
                    <Users className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                  )}
                  <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600">{workspace.name}</h3>
                </Link>
                
                {/* === The Three-Dot Menu === */}
                {currentUser._id === workspace.owner._id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded-full text-gray-400 hover:bg-gray-200 ml-2">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={() => setWorkspaceToDelete(workspace)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {workspace.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{workspace.description}</p>
              )}

              {Array.isArray(workspace.collaborators) && workspace.collaborators.length > 0 && (
                <div className="flex items-center mb-3 pb-3 border-b border-gray-200">
                  <div className="flex -space-x-2 overflow-hidden">
                    {workspace.collaborators.slice(0, 4).map((collab: any) => (
                      <div
                        key={collab.user?._id || collab._id}
                        className="inline-block h-8 w-8 rounded-full ring-2 ring-white"
                        title={collab.user ? `${collab.user.name} (${collab.role})` : ''}
                      >
                        {collab.user?.avatar ? (
                          <img
                            className="h-8 w-8 rounded-full object-cover"
                            src={collab.user.avatar}
                            alt={collab.user.name}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {(collab.user?.name || '?').charAt(0).toUpperCase()}
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
                  <span className="ml-3 text-xs text-gray-500">collaborating</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
              <div className="flex items-center">
                <span>{workspace.collaborators.length + 1} member{workspace.collaborators.length !== 0 ? 's' : ''}</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                <span>{new Date(workspace.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Confirmation Modal Render */}
      <ConfirmationModal
        isOpen={!!workspaceToDelete}
        onClose={() => setWorkspaceToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Workspace"
        message={`Are you sure you want to permanently delete "${workspaceToDelete?.name}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        isLoading={isDeleting}
        isDestructive={true}
        errorMessage={deleteError}
      />
    </>
  );
}