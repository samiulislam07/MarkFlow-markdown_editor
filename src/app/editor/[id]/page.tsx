'use client';

import { useMemo, useEffect, useState, use } from 'react';
import dynamic from 'next/dynamic';
import * as Y from 'yjs';
import YPartyKitProvider from 'y-partykit/provider';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import ChatLauncher from '@/app/components/ChatLauncher';


// Dynamically import the editor component with SSR turned off
const EditorWithSidebar = dynamic(
  () => import('@/app/components/EditorWithSidebar'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading collaborative editor...</p>
        </div>
      </div>
    ), 
  }
);

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function EditorPage({ params }: PageProps) {
  const { id: documentId } = use(params);
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [documentExists, setDocumentExists] = useState<boolean | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);

  // Check document access and existence
  useEffect(() => {
    const checkDocumentAccess = async () => {
      if (!user) return;

      try {
        const response = await fetch(`/api/notes/${documentId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const documentData = await response.json();
          setDocumentExists(true);
          setHasAccess(true);
          // Extract workspace ID from document data
          if (documentData && documentData.workspace) {
            setWorkspaceId(typeof documentData.workspace === 'string' 
              ? documentData.workspace 
              : documentData.workspace._id);
          }
        } else if (response.status === 404) {
          setDocumentExists(false);
          setHasAccess(false);
        } else if (response.status === 403) {
          setDocumentExists(true);
          setHasAccess(false);
        } else {
          setDocumentExists(false);
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking document access:', error);
        setDocumentExists(false);
        setHasAccess(false);
      }
    };

    if (isLoaded && user) {
      checkDocumentAccess();
    } else if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [documentId, user, isLoaded, router]);

  // useMemo ensures these are created only once per documentId
  const { doc, provider } = useMemo(() => {
    const yDoc = new Y.Doc();
    
    // Only create provider if we have environment variable
    const partyKitHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST;
    if (!partyKitHost) {
      throw new Error('NEXT_PUBLIC_PARTYKIT_HOST environment variable is not set');
    }
    
    const yProvider = new YPartyKitProvider(
      partyKitHost,
      documentId, // The document ID is used as the collaboration room name
      yDoc
    );

    // Set up user awareness info
    if (user) {
      yProvider.awareness.setLocalStateField('user', {
        name: user.firstName || user.emailAddresses[0]?.emailAddress || 'Anonymous',
        email: user.emailAddresses[0]?.emailAddress,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        id: user.id
      });
    }

    return { doc: yDoc, provider: yProvider };
  }, [documentId, user]);

  // Load document content when document exists and Y.js is ready
  useEffect(() => {
    let isMounted = true;
    
    const loadDocumentContent = async () => {
      if (!documentExists || hasAccess === false || !doc) return;

      try {
        const response = await fetch(`/api/notes/${documentId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok && isMounted) {
          const documentData = await response.json();
          
          // Wait for Y.js provider to be ready before setting content
          const initializeContent = () => {
            if (!isMounted) return;
            
            const ytext = doc.getText('codemirror');
            const ytitle = doc.getText('title');
            
            // Only set content if Y.js document is empty (prevents overwriting collaborative changes)
            if (ytext.length === 0 && documentData.content) {
              doc.transact(() => {
                ytext.insert(0, documentData.content);
              });
            }
            
            if (ytitle.length === 0 && documentData.title) {
              doc.transact(() => {
                ytitle.insert(0, documentData.title);
              });
            }
          };

          // Initialize content either immediately or wait for provider
          if (provider.ws?.readyState === WebSocket.OPEN) {
            initializeContent();
          } else {
            const handleConnect = () => {
              if (provider.ws?.readyState === WebSocket.OPEN) {
                initializeContent();
                provider.off('status', handleConnect);
              }
            };
            provider.on('status', handleConnect);
          }
        }
      } catch (error) {
        console.error('Error loading document content:', error);
      }
    };

    loadDocumentContent();
    
    return () => {
      isMounted = false;
    };
  }, [documentExists, hasAccess, documentId, doc, provider]);

  // Show loading while checking auth
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!user) {
    router.push('/sign-in');
    return null;
  }

  // Show error states
  if (hasAccess === false && documentExists === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Not Found</h1>
          <p className="text-gray-600 mb-4">The document you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (hasAccess === false && documentExists === true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to access this document.</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show loading while checking access
  if (hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking document access...</p>
        </div>
      </div>
    );
  }

  // Render the collaborative editor
  return (
    <>
      <EditorWithSidebar
        documentId={documentId}
        workspaceId={workspaceId}
        doc={doc}
        provider={provider}
      />
      <ChatLauncher /> 
    </>
  );
}