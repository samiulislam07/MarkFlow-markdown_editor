'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import * as Y from 'yjs';
import YPartyKitProvider from 'y-partykit/provider';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
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

export default function EditorPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get('workspace');
  
  // Generate a temporary document ID for new documents
  const [tempDocumentId] = useState(() => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // useMemo ensures these are created only once per session
  const { doc, provider } = useMemo(() => {
    const yDoc = new Y.Doc();
    
    // Only create provider if we have environment variable
    const partyKitHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST || 'localhost:1999';
    
    const yProvider = new YPartyKitProvider(
      partyKitHost,
      tempDocumentId, // Use temp ID for new documents
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
  }, [tempDocumentId, user]);

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

  // Render the collaborative editor for new documents
  return (
    <>
      <CollaborativeEditor
        workspaceId={workspaceId || undefined}
        doc={doc}
        provider={provider}
      />
      <ChatLauncher />
    </>
  );
}