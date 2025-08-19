'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import * as Y from 'yjs';
import YPartyKitProvider from 'y-partykit/provider';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import ChatLauncher from '@/app/components/ChatLauncher';

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

export default function EditorPageClient() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get('workspace');

  const [tempDocumentId] = useState(
    () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  const { doc, provider } = useMemo(() => {
    const yDoc = new Y.Doc();
    const partyKitHost =
      process.env.NEXT_PUBLIC_PARTYKIT_HOST || 'localhost:1999';

    const yProvider = new YPartyKitProvider(partyKitHost, tempDocumentId, yDoc);

    if (user) {
      yProvider.awareness.setLocalStateField('user', {
        name:
          user.firstName ||
          user.emailAddresses[0]?.emailAddress ||
          'Anonymous',
        email: user.emailAddresses[0]?.emailAddress,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        id: user.id,
      });
    }

    return { doc: yDoc, provider: yProvider };
  }, [tempDocumentId, user]);

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

  if (!user) {
    router.push('/sign-in');
    return null;
  }

  return (
    <>
      <EditorWithSidebar
        workspaceId={workspaceId || undefined}
        doc={doc}
        provider={provider}
      />
      <ChatLauncher />
    </>
  );
}
