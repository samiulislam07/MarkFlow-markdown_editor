'use client'

import { useState, useEffect, useCallback } from 'react'
import { Folder, FileText, Plus, Upload, Home } from 'lucide-react'
import Link from 'next/link'
import CreateFolderModal from './CreateFolderModal'
import UploadFileModal from './UploadFileModal'
import ConfirmationModal from './ConfirmationModal' // Import ConfirmationModal
import ItemContextMenu from './ItemContextMenu' // Import ItemContextMenu
import supabase from '@/lib/supabase'

// Define types for our data structures
type ItemType = 'folder' | 'note' | 'file';

interface User {
  _id: string;
  name: string;
  avatar?: string;
}

interface Note {
  _id: string;
  title: string;
  updatedAt: string;
}

interface FileItem {
  _id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  uploader: User;
  createdAt: string;
}

interface FolderItem {
  _id: string;
  name: string;
  notes: Note[];
  files: FileItem[];
  creator: User;
  createdAt: string;
}

interface FileManagerProps {
  workspaceId: string;
  userRole: 'owner' | 'editor' | 'commenter' | 'viewer';
}

export default function FileManager({ workspaceId, userRole }: FileManagerProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Workspace Root' }])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  
  // State for deletion
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: ItemType } | null>(null);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = userRole === 'owner' || userRole === 'editor';

  const fetchData = useCallback(async (folderId: string | null) => {
    setIsLoading(true)
    setError(null)
    try {
      // Construct proper URL with workspaceId
      let url = `/api/files?workspaceId=${workspaceId}`;
      
      // Add folderId if it exists
      if (folderId) {
        url += `&folderId=${folderId}`;
      }
  
      const [folderRes, fileRes, notesRes] = await Promise.all([
        fetch(`/api/folders?workspaceId=${workspaceId}${folderId ? `&parentId=${folderId}` : ''}`),
        fetch(url), // Use the constructed URL
        fetch(`/api/notes?workspaceId=${workspaceId}${folderId ? `&folderId=${folderId}` : '&folder=null'}`)
      ]);
  
      // Rest of the code remains the same
      if (!folderRes.ok) throw new Error('Failed to fetch folders');
      if (!fileRes.ok) throw new Error('Failed to fetch files');
      if (!notesRes.ok) throw new Error('Failed to fetch notes');
  
      const [folderData, fileData, notesData] = await Promise.all([
        folderRes.json(),
        fileRes.json(),
        notesRes.json()
      ]);
      
      setFolders(folderData);
      setFiles(fileData);
      setNotes(notesData);
  
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchData(currentFolderId)
  }, [currentFolderId, fetchData])

  const handleFolderClick = (folder: FolderItem) => {
    setCurrentFolderId(folder._id)
    setBreadcrumb(prev => [...prev, { id: folder._id, name: folder.name }])
  }

  const handleBreadcrumbClick = (folderId: string | null, index: number) => {
    setCurrentFolderId(folderId)
    setBreadcrumb(prev => prev.slice(0, index + 1))
  }
  
  const handleCreateFolder = async (folderName: string) => {
    const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: folderName,
            workspaceId,
            parentId: currentFolderId,
        }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create folder');
    }
    await fetchData(currentFolderId); 
  };
  
  const handleUploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', workspaceId);
    if (currentFolderId) {
      formData.append('folderId', currentFolderId);
    }

    const res = await fetch('/api/files', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to upload file');
    }
    await fetchData(currentFolderId);
  };

  const handleDeleteClick = (id: string, name: string, type: ItemType) => {
    setItemToDelete({ id, name, type });
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/${itemToDelete.type}s/${itemToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to delete ${itemToDelete.type}`);
      }

      setConfirmModalOpen(false);
      setItemToDelete(null);
      await fetchData(currentFolderId); // Refresh the list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">File Manager</h2>
            {canEdit && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCreateFolderModalOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-600 text-sm rounded-lg hover:bg-indigo-200 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Folder
                </button>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-600 text-sm rounded-lg hover:bg-green-200 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload File
                </button>
              </div>
            )}
          </div>
          <nav className="flex items-center text-sm text-gray-500">
            {breadcrumb.map((crumb, index) => (
              <div key={crumb.id || 'root'} className="flex items-center">
                {index > 0 && <span className="mx-2">/</span>}
                <button
                  onClick={() => handleBreadcrumbClick(crumb.id, index)}
                  className={`hover:text-gray-700 ${index === breadcrumb.length - 1 ? 'font-semibold text-gray-800' : ''}`}
                >
                  {index === 0 ? <Home className="w-4 h-4 inline-block mr-1" /> : null}
                  {crumb.name}
                </button>
              </div>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {isLoading && <div className="text-center text-gray-500">Loading...</div>}
          {error && <div className="text-center text-red-500">Error: {error}</div>}
          
          {!isLoading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.map(folder => (
                <div
                  key={folder._id}
                  onClick={() => handleFolderClick(folder)}
                  className="group flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 cursor-pointer transition-colors"
                >
                  <div className="flex items-center overflow-hidden">
                    <Folder className="w-6 h-6 text-indigo-500 mr-4 flex-shrink-0" />
                    <span className="font-medium text-gray-800 truncate">{folder.name}</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ItemContextMenu canEdit={canEdit} onDelete={() => handleDeleteClick(folder._id, folder.name, 'folder')} />
                  </div>
                </div>
              ))}

              {notes.map(note => (
                <div key={note._id} className="group flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">
                  <Link href={`/editor/${note._id}`} className="flex items-center flex-grow overflow-hidden">
                    <FileText className="w-6 h-6 text-blue-500 mr-4 flex-shrink-0" />
                    <span className="font-medium text-gray-800 truncate">{note.title}</span>
                  </Link>
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ItemContextMenu canEdit={canEdit} onDelete={() => handleDeleteClick(note._id, note.title, 'note')} />
                  </div>
                </div>
              ))}

              {files.map(file => (
                 <div key={file._id} className="group flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">
                  <a href={file.storageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center flex-grow overflow-hidden">
                    <FileText className="w-6 h-6 text-green-500 mr-4 flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                        <span className="font-medium text-gray-800 block truncate">{file.fileName}</span>
                        <span className="text-xs text-gray-500">{(file.fileSize / 1024).toFixed(2)} KB</span>
                    </div>
                  </a>
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ItemContextMenu canEdit={canEdit} onDelete={() => handleDeleteClick(file._id, file.fileName, 'file')} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && folders.length === 0 && files.length === 0 && notes.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">This folder is empty.</p>
            </div>
          )}
        </div>
      </div>
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setCreateFolderModalOpen(false)}
        onCreate={handleCreateFolder}
        parentId={currentFolderId}
      />
      <UploadFileModal
        isOpen={isUploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUploadFile}
        workspaceId={workspaceId}
        parentId={currentFolderId}
      />
      {itemToDelete && (
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title={`Delete ${itemToDelete.type}`}
          message={`Are you sure you want to delete "${itemToDelete.name}"? ${itemToDelete.type === 'folder' ? 'All of its contents will also be permanently deleted.' : ''} This action cannot be undone.`}
          confirmText="Delete"
          isLoading={isDeleting}
        />
      )}
    </>
  )
}
