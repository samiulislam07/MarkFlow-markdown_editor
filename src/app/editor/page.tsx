import { Suspense } from 'react';
import EditorPageClient from './EditorPageClient';

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading editor...</div>}>
      <EditorPageClient />
    </Suspense>
  );
}
