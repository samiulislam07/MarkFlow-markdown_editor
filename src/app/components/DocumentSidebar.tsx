'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, FileText, Plus, Folder } from 'lucide-react';

interface Document {
  _id: string;
  title: string;
  content: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

interface Workspace {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentSidebarProps {
  currentDocumentId?: string;
  currentWorkspaceId?: string;
  onDocumentSelect?: (documentId: string) => void;
  onNewDocument?: (workspaceId: string) => void;
  className?: string;
}

const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  currentDocumentId,
  currentWorkspaceId,
  onDocumentSelect,
  onNewDocument,
  className = '',
}) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [documents, setDocuments] = useState<{ [workspaceId: string]: Document[] }>({});
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspaces
  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await fetch('/api/workspaces');
      if (!response.ok) {
        throw new Error('Failed to fetch workspaces');
      }
      const data = await response.json();
      
      // Filter to show only the current workspace if specified
      const filteredWorkspaces = currentWorkspaceId 
        ? data.filter((workspace: Workspace) => workspace._id === currentWorkspaceId)
        : data;
      
      setWorkspaces(filteredWorkspaces);
      
      // Auto-expand current workspace
      if (currentWorkspaceId) {
        setExpandedWorkspaces(prev => new Set([...prev, currentWorkspaceId]));
      } else if (filteredWorkspaces.length > 0) {
        // If no specific workspace, auto-expand the first one
        setExpandedWorkspaces(prev => new Set([...prev, filteredWorkspaces[0]._id]));
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err);
      setError('Failed to load workspaces');
    }
  }, [currentWorkspaceId]);

  // Fetch documents for a specific workspace
  const fetchDocuments = useCallback(async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/notes?workspaceId=${workspaceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      // Handle both old format (direct array) and new format (object with notes property)
      const notesArray = Array.isArray(data) ? data : data.notes || [];
      setDocuments(prev => ({
        ...prev,
        [workspaceId]: notesArray
      }));
    } catch (err) {
      console.error(`Error fetching documents for workspace ${workspaceId}:`, err);
      setError('Failed to load documents');
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchWorkspaces();
      setLoading(false);
    };
    loadData();
  }, [fetchWorkspaces]);

  // Fetch documents when workspace is expanded OR when showing single workspace
  useEffect(() => {
    // Auto-load documents for single workspace view
    if (currentWorkspaceId && workspaces.length === 1) {
      const workspace = workspaces[0];
      if (!documents[workspace._id]) {
        fetchDocuments(workspace._id);
      }
    }
    
    // Load documents for expanded workspaces
    expandedWorkspaces.forEach(workspaceId => {
      if (!documents[workspaceId]) {
        fetchDocuments(workspaceId);
      }
    });
  }, [expandedWorkspaces, documents, fetchDocuments, currentWorkspaceId, workspaces]);

  const toggleWorkspace = useCallback((workspaceId: string) => {
    setExpandedWorkspaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workspaceId)) {
        newSet.delete(workspaceId);
      } else {
        newSet.add(workspaceId);
      }
      return newSet;
    });
  }, []);

  const handleDocumentClick = useCallback((documentId: string) => {
    onDocumentSelect?.(documentId);
  }, [onDocumentSelect]);

  const handleNewDocument = useCallback((workspaceId: string) => {
    onNewDocument?.(workspaceId);
  }, [onNewDocument]);

  if (loading) {
    return (
      <div className={`w-64 bg-gray-50 border-r border-gray-200 flex flex-col ${className}`}>
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-64 bg-gray-50 border-r border-gray-200 flex flex-col ${className}`}>
        <div className="p-4">
          <div className="text-red-600 text-sm">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-60 bg-gray-50 border-r border-gray-200 flex flex-col ${className}`}>
      <div className="p-4 border-b border-gray-200 mt-12">
        <h2 className="text-sm font-semibold text-gray-900">
          {currentWorkspaceId ? 'Documents' : 'All Documents'}
        </h2>
        {currentWorkspaceId && workspaces.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {workspaces[0].name}
          </p>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {workspaces.map((workspace) => {
          const isExpanded = expandedWorkspaces.has(workspace._id);
          const workspaceDocuments = documents[workspace._id] || [];
          
          // If we're showing only current workspace, show documents directly
          if (currentWorkspaceId && workspaces.length === 1) {
            return (
              <div key={workspace._id} className="p-2">
                {/* New Document Button */}
                <button
                  onClick={() => handleNewDocument(workspace._id)}
                  className="w-full flex items-center px-3 py-2 mb-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Document
                </button>

                {/* Documents List */}
                <div className="space-y-1">
                  {workspaceDocuments.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500 text-center">
                      No documents yet
                    </div>
                  ) : (
                    workspaceDocuments.map((document) => (
                      <div
                        key={document._id}
                        className={`flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer rounded-lg transition-colors ${
                          currentDocumentId === document._id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'border border-transparent'
                        }`}
                        onClick={() => handleDocumentClick(document._id)}
                      >
                        <FileText className="w-4 h-4 text-gray-500 mr-3 flex-shrink-0" />
                        <span className={`text-sm truncate ${
                          currentDocumentId === document._id
                            ? 'text-blue-700 font-medium'
                            : 'text-gray-700'
                        }`}>
                          {document.title || 'Untitled Document'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          }

          // Otherwise show full workspace tree view
          return (
            <div key={workspace._id} className="border-b border-gray-200">
              {/* Workspace Header */}
              <div
                className="flex items-center justify-between p-3 hover:bg-gray-100 cursor-pointer"
                onClick={() => toggleWorkspace(workspace._id)}
              >
                <div className="flex items-center flex-1 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                  )}
                  <Folder className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {workspace.name}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">
                    {workspaceDocuments.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNewDocument(workspace._id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="New document"
                  >
                    <Plus className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Documents List */}
              {isExpanded && (
                <div className="bg-white">
                  {workspaceDocuments.length === 0 ? (
                    <div className="px-8 py-2 text-xs text-gray-500">
                      No documents yet
                    </div>
                  ) : (
                    workspaceDocuments.map((document) => (
                      <div
                        key={document._id}
                        className={`flex items-center px-8 py-2 hover:bg-gray-50 cursor-pointer border-l-2 ${
                          currentDocumentId === document._id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-transparent'
                        }`}
                        onClick={() => handleDocumentClick(document._id)}
                      >
                        <FileText className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                        <span className={`text-sm truncate ${
                          currentDocumentId === document._id
                            ? 'text-blue-700 font-medium'
                            : 'text-gray-700'
                        }`}>
                          {document.title || 'Untitled Document'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        {workspaces.length === 0 && (
          <div className="p-4 text-center">
            <div className="text-gray-500 text-sm">No workspaces found</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentSidebar;