'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MergedMarkdownEditor from './MergedMarkdownEditor';
import DocumentSidebar from './DocumentSidebar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as Y from 'yjs';
import YPartyKitProvider from 'y-partykit/provider';

interface EditorWithSidebarProps {
  documentId?: string;
  workspaceId?: string;
  doc: Y.Doc;
  provider: YPartyKitProvider;
}

const EditorWithSidebar: React.FC<EditorWithSidebarProps> = ({
  documentId,
  workspaceId,
  doc,
  provider,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

  const handleDocumentSelect = useCallback((selectedDocumentId: string) => {
    if (selectedDocumentId !== documentId) {
      // Navigate to the selected document
      router.push(`/editor/${selectedDocumentId}`);
    }
  }, [documentId, router]);

  const handleNewDocument = useCallback((selectedWorkspaceId: string) => {
    // Navigate to new document in the selected workspace
    router.push(`/editor?workspace=${selectedWorkspaceId}`);
  }, [router]);

  const handleDocumentSaved = useCallback((newDocumentId: string) => {
    // When a new document is saved and gets a real ID, navigate to it
    if (!documentId && newDocumentId) {
      router.replace(`/editor/${newDocumentId}`);
    }
  }, [documentId, router]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed]);

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
        title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {/* Sidebar */}
      {!sidebarCollapsed && (
        <DocumentSidebar
          currentDocumentId={documentId}
          currentWorkspaceId={workspaceId}
          onDocumentSelect={handleDocumentSelect}
          onNewDocument={handleNewDocument}
          className="flex-shrink-0"
        />
      )}

      {/* Main Editor */}
      <div className={`flex-1 ${sidebarCollapsed ? '' : 'ml-0'}`}>
        <MergedMarkdownEditor
          documentId={documentId}
          workspaceId={workspaceId}
          doc={doc}
          provider={provider}
          onDocumentSaved={handleDocumentSaved}
        />
      </div>
    </div>
  );
};

export default EditorWithSidebar;
