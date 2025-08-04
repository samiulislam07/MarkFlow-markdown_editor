'use client';

import { useState, useEffect, useCallback, FC, useRef } from 'react';
import { ChevronRight, Folder, FileText, Plus, Loader2, Upload, MoreHorizontal, Trash2, Download, FolderPlus, Edit, Image } from 'lucide-react';
import Link from 'next/link';
import ConfirmationModal from './ConfirmationModal';

// --- TYPE DEFINITIONS ---
interface NoteItem { _id: string; title: string; }
interface FolderItem { _id: string; name: string; }
interface FileItem { _id: string; fileName: string; storageUrl: string; content?: string; }
interface FolderChildren { folders: FolderItem[]; notes: NoteItem[]; files: FileItem[]; }

// --- PROPS ---
interface DocumentSidebarProps {
  currentDocumentId?: string;
  currentWorkspaceId?: string;
  onNewDocument: (workspaceId: string, folderId?: string) => void;
  className?: string;
}

interface InlineInputProps {
  level: number;
  initialName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
  icon: React.ReactNode;
}

const InlineInput: FC<InlineInputProps> = ({ level, initialName, onSave, onCancel, icon }) => {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) onCancel();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); onSave(name.trim()); } 
    else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  const paddingLeft = `${level * 16}px`;

  return (
    <div className="flex items-center p-2" style={{ paddingLeft }}>
      {icon}
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onSave(name.trim())}
        className="text-sm bg-white border border-indigo-500 rounded px-1 py-0.5 w-full h-7 focus:outline-none"
      />
    </div>
  );
};

interface ItemContextMenuProps { item: NoteItem | FileItem; onDelete: () => void; onDownload: () => void; onDescribe: () => void; }
const ItemContextMenu: FC<ItemContextMenuProps> = ({ onDelete, onDownload, onDescribe }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (
        <div className="relative" ref={menuRef}>
            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsOpen(!isOpen); }} className="p-1 rounded hover:bg-gray-200" title="More options"><MoreHorizontal className="w-4 h-4 text-gray-500" /></button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                    <button onClick={(e) => { e.stopPropagation(); onDownload(); setIsOpen(false); }} className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"><Download className="w-4 h-4 mr-2" /> Download</button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }} className="flex items-center w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4 mr-2" /> Delete</button>
                    <button onClick={(e) => { e.stopPropagation(); onDescribe(); setIsOpen(false); }} className="flex items-center w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Image className="w-4 h-4 mr-2" /> Describe</button>
                </div>
            )}
        </div>
    );
};

interface FolderContextMenuProps { onUpload: () => void; onNewFolder: () => void; onRename: () => void; onDelete: () => void; }
const FolderContextMenu: FC<FolderContextMenuProps> = ({ onUpload, onNewFolder, onRename, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (
        <div className="relative" ref={menuRef}>
            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsOpen(!isOpen); }} className="p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" title="Folder options"><MoreHorizontal className="w-4 h-4 text-gray-500" /></button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                    <button onClick={(e) => { e.stopPropagation(); onUpload(); setIsOpen(false); }} className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"><Upload className="w-4 h-4 mr-2" /> Upload File</button>
                    <button onClick={(e) => { e.stopPropagation(); onNewFolder(); setIsOpen(false); }} className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"><FolderPlus className="w-4 h-4 mr-2" /> New Folder</button>
                    <button onClick={(e) => { e.stopPropagation(); onRename(); setIsOpen(false); }} className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"><Edit className="w-4 h-4 mr-2" /> Rename</button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }} className="flex items-center w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4 mr-2" /> Delete Folder</button>
                </div>
            )}
        </div>
    );
};

// --- RECURSIVE FOLDER COMPONENT ---
interface FolderProps {
  folder: FolderItem;
  level: number;
  currentDocumentId?: string;
  onNewDocument: (workspaceId: string, folderId?: string) => void;
  onUploadFile: (folderId: string) => void; 
  onDeleteItem: (item: NoteItem | FileItem | FolderItem, type: 'note' | 'file' | 'folder') => void;
  onDownloadItem: (item: NoteItem | FileItem, type: 'note' | 'file') => void;
  onDescribeImage: (imageUrl: string) => void;
  onInitiateNewFolder: (parentId: string | null) => void;
  creatingFolder: { parentId: string | null } | null;
  onSaveFolder: (name: string, parentId: string | null) => void;
  onCancelNewFolder: () => void;
  renamingItemId: string | null;
  onInitiateRename: (itemId: string) => void;
  onSaveRename: (itemId: string, newName: string) => void;
  onCancelRename: () => void;
  currentWorkspaceId: string;
}

const FolderTreeItem: FC<FolderProps> = (props) => {
  const { folder, level, renamingItemId, onInitiateRename, onSaveRename, onCancelRename } = props;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [children, setChildren] = useState<FolderChildren | null>(null);

  const fetchChildren = useCallback(async () => {
    if (children && !props.creatingFolder) return;
    setIsLoading(true);
    try {
      const [foldersRes, notesRes, filesRes] = await Promise.all([
        fetch(`/api/folders?workspaceId=${props.currentWorkspaceId}&parentId=${folder._id}`),
        fetch(`/api/notes?workspaceId=${props.currentWorkspaceId}&folderId=${folder._id}`),
        fetch(`/api/files?workspaceId=${props.currentWorkspaceId}&folderId=${folder._id}`),
      ]);
      if (!foldersRes.ok || !notesRes.ok || !filesRes.ok) throw new Error('Failed to fetch folder contents');
      const [foldersData, notesData, filesData] = await Promise.all([foldersRes.json(), notesRes.json(), filesRes.json()]);
      setChildren({ folders: foldersData, notes: Array.isArray(notesData) ? notesData : notesData.notes || [], files: filesData });
    } catch (error) {
      console.error(`Error fetching children for folder ${folder._id}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [folder._id, props.currentWorkspaceId, children, props.creatingFolder]);

  const handleToggle = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    if (newExpandedState && !children) fetchChildren();
  };

  const paddingLeft = `${level * 16}px`;
  const isRenaming = renamingItemId === folder._id;

  if (isRenaming) {
    return (
        <InlineInput
            level={level}
            initialName={folder.name}
            onSave={(newName) => onSaveRename(folder._id, newName)}
            onCancel={onCancelRename}
            icon={<Folder className="w-4 h-4 mr-2 text-gray-600 flex-shrink-0" />}
        />
    );
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 cursor-pointer" style={{ paddingLeft }} onClick={handleToggle}>
        <div className="flex items-center truncate">
          <ChevronRight className={`w-4 h-4 mr-2 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          <Folder className="w-4 h-4 mr-2 text-gray-600 flex-shrink-0" />
          <span className="text-sm text-gray-800 truncate">{folder.name}</span>
        </div>
        <div className="flex items-center space-x-1">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
          <FolderContextMenu 
            onUpload={() => props.onUploadFile(folder._id)}
            onNewFolder={() => { setIsExpanded(true); props.onInitiateNewFolder(folder._id); }}
            onRename={() => onInitiateRename(folder._id)}
            onDelete={() => props.onDeleteItem(folder, 'folder')}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="border-l border-gray-200 ml-4">
          {children && children.folders.map((subFolder) => (
            <FolderTreeItem key={subFolder._id} {...props} folder={subFolder} level={level + 1} />
          ))}
          {props.creatingFolder?.parentId === folder._id && (
            <InlineInput 
              level={level + 1} 
              onSave={(name) => props.onSaveFolder(name, folder._id)} 
              onCancel={props.onCancelNewFolder}
              initialName="New Folder"
              icon={<Folder className="w-4 h-4 mr-2 text-gray-600 flex-shrink-0" />}
            />
          )}
          {children && children.notes.map((note) => (
            <div key={note._id} className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-100">
                <Link href={`/editor/${note._id}`} className={`flex items-center flex-grow truncate ${props.currentDocumentId === note._id ? 'bg-blue-50' : ''}`} style={{ paddingLeft: `${(level + 1) * 16}px` }}>
                    <FileText className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                    <span className={`text-sm truncate ${props.currentDocumentId === note._id ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{note.title || 'Untitled'}</span>
                </Link>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity"><ItemContextMenu item={note} onDelete={() => props.onDeleteItem(note, 'note')} onDownload={() => props.onDownloadItem(note, 'note')} onDescribe={() => props.onDescribeImage(note._id)} /></div>
            </div>
          ))}
          {children && children.files.map((file) => (
            <div key={file._id} className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-100">
                <a href={file.storageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center flex-grow truncate" style={{ paddingLeft: `${(level + 1) * 16}px` }}>
                    <FileText className="w-4 h-4 mr-2 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{file.fileName}</span>
                </a>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity"><ItemContextMenu item={file} onDelete={() => props.onDeleteItem(file, 'file')} onDownload={() => props.onDownloadItem(file, 'file')} onDescribe={() => props.onDescribeImage(file.storageUrl)} /></div>
            </div>
          ))}
           <button onClick={() => props.onNewDocument(props.currentWorkspaceId, folder._id)} className="flex items-center w-full text-left p-2 rounded-md hover:bg-gray-100 text-gray-500" style={{ paddingLeft: `${(level + 1) * 16}px` }}>
             <Plus className="w-4 h-4 mr-2" /><span className="text-sm">New Document</span>
           </button>
        </div>
      )}
    </div>
  );
};


// --- MAIN SIDEBAR COMPONENT ---
const DocumentSidebar: React.FC<DocumentSidebarProps> = ({ currentDocumentId, currentWorkspaceId, onNewDocument, className = '' }) => {
  const [rootFolders, setRootFolders] = useState<FolderItem[]>([]);
  const [rootNotes, setRootNotes] = useState<NoteItem[]>([]);
  const [rootFiles, setRootFiles] = useState<FileItem[]>([]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(null);

  const [itemToDelete, setItemToDelete] = useState<{ item: NoteItem | FileItem | FolderItem; type: 'note' | 'file' | 'folder' } | null>(null);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState<{ parentId: string | null } | null>(null);
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);

  const fetchWorkspaceRootContent = useCallback(async (workspaceId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [workspaceRes, foldersRes, notesRes, filesRes] = await Promise.all([
        fetch(`/api/workspaces?id=${workspaceId}`),
        fetch(`/api/folders?workspaceId=${workspaceId}&parentId=null`),
        fetch(`/api/notes?workspaceId=${workspaceId}&folder=null`),
        fetch(`/api/files?workspaceId=${workspaceId}&folderId=null`),
      ]);

      if (!workspaceRes.ok || !foldersRes.ok || !notesRes.ok || !filesRes.ok) throw new Error('Failed to load workspace content');
      const [workspaceData, foldersData, notesData, filesData] = await Promise.all([workspaceRes.json(), foldersRes.json(), notesRes.json(), filesRes.json()]);
      setWorkspaceName(workspaceData.name || 'Workspace');
      setRootFolders(foldersData);
      setRootNotes(Array.isArray(notesData) ? notesData : notesData.notes || []);
      setRootFiles(filesData);
    } catch (err) {
      console.error('Error fetching workspace content:', err);
      setError('Failed to load content.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentWorkspaceId) fetchWorkspaceRootContent(currentWorkspaceId);
    else { setIsLoading(false); setError('No workspace selected.'); }
  }, [currentWorkspaceId, fetchWorkspaceRootContent]);

  const handleUploadClick = (folderId: string | null) => {
    setUploadTargetFolderId(folderId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentWorkspaceId) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', currentWorkspaceId);
    if (uploadTargetFolderId) formData.append('folderId', uploadTargetFolderId);
    try {
      const res = await fetch('/api/files', { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to upload file');
      fetchWorkspaceRootContent(currentWorkspaceId);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
        if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadItem = async (item: NoteItem | FileItem, type: 'note' | 'file') => {
    if (type === 'file') {
      try {
        const fileItem = item as FileItem;
        const response = await fetch(fileItem.storageUrl);
        if (!response.ok) throw new Error('Network response was not ok.');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileItem.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Download failed:", error);
      }
    } else {
        const res = await fetch(`/api/notes/${item._id}`);
        if(res.ok) {
            const noteData = await res.json();
            const blob = new Blob([noteData.content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${noteData.title || 'untitled'}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            console.error("Failed to fetch note content for download");
        }
    }
  };

  const handleDescribeClick = async (imageUrl: string) => {
  const res = await fetch('/api/image-description', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });

  const data = await res.json();
  console.log('Image Description:', data.description);
  alert(`Image Description: ${data.description}`);
};

  const handleDeleteItem = (item: NoteItem | FileItem | FolderItem, type: 'note' | 'file' | 'folder') => {
    setItemToDelete({ item, type });
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !currentWorkspaceId) return;
    setIsDeleting(true);
    try {
        const { item, type } = itemToDelete;
        const res = await fetch(`/api/${type}s/${item._id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`Failed to delete ${type}`);
        if (type === 'note' && currentDocumentId === item._id) {
            window.location.href = `/workspace/${currentWorkspaceId}`;
        } else {
            fetchWorkspaceRootContent(currentWorkspaceId);
        }
    } catch (err) {
        console.error("Deletion failed:", err);
    } finally {
        setIsDeleting(false);
        setConfirmModalOpen(false);
        setItemToDelete(null);
    }
  };

  const handleInitiateNewFolder = (parentId: string | null) => setCreatingFolder({ parentId });
  const handleCancelNewFolder = () => setCreatingFolder(null);
  const handleSaveFolder = async (name: string, parentId: string | null) => {
    if (!currentWorkspaceId || !name) { setCreatingFolder(null); return; }
    try {
        const res = await fetch('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, workspaceId: currentWorkspaceId, parentId }),
        });
        if (!res.ok) throw new Error('Failed to create folder');
        fetchWorkspaceRootContent(currentWorkspaceId);
    } catch (error) {
        console.error("Folder creation failed:", error);
    } finally {
        setCreatingFolder(null);
    }
  };

  const handleInitiateRename = (itemId: string) => setRenamingItemId(itemId);
  const handleCancelRename = () => setRenamingItemId(null);
  const handleSaveRename = async (itemId: string, newName: string) => {
    if(!newName) { setRenamingItemId(null); return; }
    try {
        const res = await fetch(`/api/folders/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName }),
        });
        if (!res.ok) throw new Error('Failed to rename folder');
        fetchWorkspaceRootContent(currentWorkspaceId!);
    } catch (error) {
        console.error("Rename failed:", error);
    } finally {
        setRenamingItemId(null);
    }
  };

  const getItemNameForModal = () => {
    if (!itemToDelete) return '';
    if ('fileName' in itemToDelete.item) return itemToDelete.item.fileName;
    if ('title' in itemToDelete.item) return itemToDelete.item.title || 'Untitled';
    if ('name' in itemToDelete.item) return itemToDelete.item.name;
    return '';
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setItemToDelete(null);
  };

  if (isLoading) return <div className={`w-64 bg-gray-50 border-r border-gray-200 p-4 ${className}`}><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mt-10" /></div>;
  if (error) return <div className={`w-64 bg-gray-50 border-r border-gray-200 p-4 ${className}`}><p className="text-red-500 text-sm">{error}</p></div>;

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
      <div className={`w-64 bg-gray-50 border-r border-gray-200 flex flex-col ${className}`}>
        <div className="p-4 border-b border-gray-200 mt-12">
          <h2 className="text-sm font-semibold text-gray-900 truncate">{workspaceName}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button onClick={() => onNewDocument(currentWorkspaceId!)} className="flex items-center w-full p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"><Plus className="w-4 h-4 mr-2" />New Document</button>
          <button onClick={() => handleUploadClick(null)} className="flex items-center w-full p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"><Upload className="w-4 h-4 mr-2" />Upload File</button>
          <button onClick={() => handleInitiateNewFolder(null)} className="flex items-center w-full p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"><FolderPlus className="w-4 h-4 mr-2" />New Folder</button>

          {creatingFolder?.parentId === null && (
            <InlineInput 
              level={0} 
              onSave={(name) => handleSaveFolder(name, null)} 
              onCancel={handleCancelNewFolder}
              initialName="New Folder"
              icon={<Folder className="w-4 h-4 mr-2 text-gray-600 flex-shrink-0" />}
            />
          )}

          {rootFolders.map((folder) => (
            <FolderTreeItem
              key={folder._id}
              folder={folder}
              level={0}
              currentDocumentId={currentDocumentId}
              onNewDocument={onNewDocument}
              onUploadFile={handleUploadClick}
              onDeleteItem={handleDeleteItem}
              onDownloadItem={handleDownloadItem}
              onDescribeImage={handleDescribeClick}// Placeholder for describe functionality
              onInitiateNewFolder={handleInitiateNewFolder}
              creatingFolder={creatingFolder}
              onSaveFolder={handleSaveFolder}
              onCancelNewFolder={handleCancelNewFolder}
              renamingItemId={renamingItemId}
              onInitiateRename={handleInitiateRename}
              onSaveRename={handleSaveRename}
              onCancelRename={handleCancelRename}
              currentWorkspaceId={currentWorkspaceId!}
            />
          ))}

          {rootNotes.map((note) => (
            <div key={note._id} className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-100">
                <Link href={`/editor/${note._id}`} className={`flex items-center flex-grow truncate ${currentDocumentId === note._id ? 'bg-blue-50' : ''}`}>
                    <FileText className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0" />
                    <span className={`text-sm truncate ${currentDocumentId === note._id ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{note.title || 'Untitled'}</span>
                </Link>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity"><ItemContextMenu item={note} onDelete={() => handleDeleteItem(note, 'note')} onDownload={() => handleDownloadItem(note, 'note')} onDescribe={() => handleDescribeClick(note._id)} /></div>
            </div>
          ))}
          
          {rootFiles.map((file) => (
            <div key={file._id} className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-100">
                <a href={file.storageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center flex-grow truncate">
                    <FileText className="w-4 h-4 mr-2 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{file.fileName}</span>
                </a>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity"><ItemContextMenu item={file} onDelete={() => handleDeleteItem(file, 'file')} onDownload={() => handleDownloadItem(file, 'file')} onDescribe={() => handleDescribeClick(file.storageUrl)} /></div>
            </div>
          ))}
          
           {!isLoading && rootFolders.length === 0 && rootNotes.length === 0 && rootFiles.length === 0 && !creatingFolder && (
              <p className="p-4 text-xs text-gray-500 text-center">This workspace is empty.</p>
          )}
        </div>
      </div>
      
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={handleConfirmDelete}
        title={`Delete ${itemToDelete?.type || 'item'}`}
        message={`Are you sure you want to delete "${getItemNameForModal()}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </>
  );
};

export default DocumentSidebar;
