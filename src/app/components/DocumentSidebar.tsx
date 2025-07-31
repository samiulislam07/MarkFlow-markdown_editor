'use client';

import { useState, useEffect, useCallback, FC } from 'react';
import { ChevronRight, Folder, FileText, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

// --- TYPE DEFINITIONS ---
// Using more specific names to avoid conflicts and improve clarity.
interface NoteItem {
  _id: string;
  title: string;
}

interface FolderItem {
  _id: string;
  name: string;
}

interface FolderChildren {
  folders: FolderItem[];
  notes: NoteItem[];
}

// --- PROPS ---
interface DocumentSidebarProps {
  currentDocumentId?: string;
  currentWorkspaceId?: string;
  onNewDocument: (workspaceId: string, folderId?: string) => void;
  className?: string;
}

interface FolderProps {
  folder: FolderItem;
  level: number;
  currentDocumentId?: string;
  onNewDocument: (workspaceId: string, folderId?: string) => void;
  currentWorkspaceId: string;
}

// --- RECURSIVE FOLDER COMPONENT ---
// This component renders a single folder and fetches its children when expanded.
const FolderTreeItem: FC<FolderProps> = ({
  folder,
  level,
  currentDocumentId,
  onNewDocument,
  currentWorkspaceId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [children, setChildren] = useState<FolderChildren | null>(null);

  const fetchChildren = useCallback(async () => {
    if (children) return; // Already fetched

    setIsLoading(true);
    try {
      const [foldersRes, notesRes] = await Promise.all([
        fetch(`/api/folders?workspaceId=${currentWorkspaceId}&parentId=${folder._id}`),
        fetch(`/api/notes?workspaceId=${currentWorkspaceId}&folderId=${folder._id}`),
      ]);

      if (!foldersRes.ok || !notesRes.ok) {
        throw new Error('Failed to fetch folder contents');
      }

      const foldersData = await foldersRes.json();
      const notesData = await notesRes.json();

      setChildren({
        folders: foldersData,
        notes: Array.isArray(notesData) ? notesData : notesData.notes || [],
      });
    } catch (error) {
      console.error(`Error fetching children for folder ${folder._id}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [folder._id, currentWorkspaceId, children]);

  const handleToggle = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    if (newExpandedState && !children) {
      fetchChildren();
    }
  };

  const paddingLeft = `${level * 16}px`;

  return (
    <div>
      {/* Folder Row */}
      <div
        className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 cursor-pointer"
        style={{ paddingLeft }}
        onClick={handleToggle}
      >
        <div className="flex items-center truncate">
          <ChevronRight
            className={`w-4 h-4 mr-2 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
          <Folder className="w-4 h-4 mr-2 text-gray-600 flex-shrink-0" />
          <span className="text-sm text-gray-800 truncate">{folder.name}</span>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
      </div>

      {/* Children (Sub-folders and Notes) */}
      {isExpanded && children && (
        <div className="border-l border-gray-200 ml-4">
          {/* Render Sub-folders */}
          {children.folders.map((subFolder) => (
            <FolderTreeItem
              key={subFolder._id}
              folder={subFolder}
              level={level + 1}
              currentDocumentId={currentDocumentId}
              onNewDocument={onNewDocument}
              currentWorkspaceId={currentWorkspaceId}
            />
          ))}
          {/* Render Notes in this folder */}
          {children.notes.map((note) => (
            <Link
              href={`/editor/${note._id}`}
              key={note._id}
              className={`flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer ${
                currentDocumentId === note._id ? 'bg-blue-50' : ''
              }`}
              style={{ paddingLeft: `${(level + 1) * 16}px` }}
            >
              <FileText className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
              <span
                className={`text-sm truncate ${
                  currentDocumentId === note._id
                    ? 'text-blue-700 font-medium'
                    : 'text-gray-700'
                }`}
              >
                {note.title || 'Untitled'}
              </span>
            </Link>
          ))}
           {/* Add new document button inside folder */}
           <button
             onClick={() => onNewDocument(currentWorkspaceId, folder._id)}
             className="flex items-center w-full text-left p-2 rounded-md hover:bg-gray-100 text-gray-500"
             style={{ paddingLeft: `${(level + 1) * 16}px` }}
           >
             <Plus className="w-4 h-4 mr-2" />
             <span className="text-sm">New Document</span>
           </button>
        </div>
      )}
    </div>
  );
};


// --- MAIN SIDEBAR COMPONENT ---
const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  currentDocumentId,
  currentWorkspaceId,
  onNewDocument,
  className = '',
}) => {
  const [rootFolders, setRootFolders] = useState<FolderItem[]>([]);
  const [rootNotes, setRootNotes] = useState<NoteItem[]>([]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaceRootContent = useCallback(async (workspaceId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch workspace details, root folders, and root notes in parallel
      const [workspaceRes, foldersRes, notesRes] = await Promise.all([
        fetch(`/api/workspaces?id=${workspaceId}`), // Assuming an endpoint to get workspace details by ID
        fetch(`/api/folders?workspaceId=${workspaceId}&parentId=null`),
        fetch(`/api/notes?workspaceId=${workspaceId}&folder=null`),
      ]);

      if (!workspaceRes.ok || !foldersRes.ok || !notesRes.ok) {
        throw new Error('Failed to load workspace content');
      }

      const workspaceData = await workspaceRes.json();
      const foldersData = await foldersRes.json();
      const notesData = await notesRes.json();

      setWorkspaceName(workspaceData.name || 'Workspace');
      setRootFolders(foldersData);
      setRootNotes(Array.isArray(notesData) ? notesData : notesData.notes || []);

    } catch (err) {
      console.error('Error fetching workspace content:', err);
      setError('Failed to load content.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentWorkspaceId) {
      fetchWorkspaceRootContent(currentWorkspaceId);
    } else {
      setIsLoading(false);
      setError('No workspace selected.');
    }
  }, [currentWorkspaceId, fetchWorkspaceRootContent]);

  if (isLoading) {
    return (
      <div className={`w-64 bg-gray-50 border-r border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-64 bg-gray-50 border-r border-gray-200 p-4 ${className}`}>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`w-64 bg-gray-50 border-r border-gray-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 mt-12">
        <h2 className="text-sm font-semibold text-gray-900 truncate">
          {workspaceName}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* New Document at Root */}
        <button
          onClick={() => onNewDocument(currentWorkspaceId!)}
          className="flex items-center w-full p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Document
        </button>

        {/* Root Folders */}
        {rootFolders.map((folder) => (
          <FolderTreeItem
            key={folder._id}
            folder={folder}
            level={0}
            currentDocumentId={currentDocumentId}
            onNewDocument={onNewDocument}
            currentWorkspaceId={currentWorkspaceId!}
          />
        ))}

        {/* Root Notes */}
        {rootNotes.map((note) => (
          <Link
            href={`/editor/${note._id}`}
            key={note._id}
            className={`flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer ${
              currentDocumentId === note._id ? 'bg-blue-50' : ''
            }`}
          >
            <FileText className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
            <span
              className={`text-sm truncate ${
                currentDocumentId === note._id
                  ? 'text-blue-700 font-medium'
                  : 'text-gray-700'
              }`}
            >
              {note.title || 'Untitled'}
            </span>
          </Link>
        ))}
         {!isLoading && rootFolders.length === 0 && rootNotes.length === 0 && (
            <p className="p-4 text-xs text-gray-500 text-center">This workspace is empty.</p>
        )}
      </div>
    </div>
  );
};

export default DocumentSidebar;
