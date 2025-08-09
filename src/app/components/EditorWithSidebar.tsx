'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MergedMarkdownEditor from './MergedMarkdownEditor';
import DocumentSidebar from './DocumentSidebar';
import * as Y from 'yjs';
import YPartyKitProvider from 'y-partykit/provider';
import { ThemeProvider } from '@/hooks/useTheme';

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
    <ThemeProvider>
      <div className="flex h-screen bg-white">
        {/* Sidebar Container with smooth transition */}
        <div 
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            sidebarCollapsed ? 'w-0' : 'w-64'
          }`}
        >
          <DocumentSidebar
            currentDocumentId={documentId}
            currentWorkspaceId={workspaceId}
            onDocumentSelect={handleDocumentSelect}
            onNewDocument={handleNewDocument}
            className="w-64 flex-shrink-0"
          />
        </div>

        {/* Main Editor */}
        <div className="flex-1 min-w-0">
          <MergedMarkdownEditor
            documentId={documentId}
            workspaceId={workspaceId}
            doc={doc}
            provider={provider}
            onDocumentSaved={handleDocumentSaved}
            isDocumentSidebarOpen={!sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
          />
        </div>
      </div>
    </ThemeProvider>
  );
};

export default EditorWithSidebar;
