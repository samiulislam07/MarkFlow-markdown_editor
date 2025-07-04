'use client';

import { useMemo, useEffect, useState, use } from 'react';
import dynamic from 'next/dynamic';
import * as Y from 'yjs';
import YPartyKitProvider from 'y-partykit/provider';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import ChatLauncher from '@/app/components/ChatLauncher';


// Dynamically import the editor component with SSR turned off
const CollaborativeEditor = dynamic(
  () => import('@/app/components/MergedMarkdownEditor'),
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
          setDocumentExists(true);
          setHasAccess(true);
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
    const partyKitHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST || 'localhost:1999';
    
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
      <CollaborativeEditor
        documentId={documentId}
        doc={doc}
        provider={provider}
      />
      <ChatLauncher /> 
    </>
  );
}