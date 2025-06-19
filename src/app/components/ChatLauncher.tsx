"use client"
import React, { useState } from 'react';
import ChatSidebar from './ChatSidebar';

export default function ChatLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      {!open && (
        <button
          className="fixed bottom-6 right-6 z-40 bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 hover:bg-blue-700 transition"
          onClick={() => setOpen(true)}
          aria-label="Open chat sidebar"
        >
          <span className="text-lg">Chat</span> <span className="text-xl">💬</span>
        </button>
      )}
      {/* Chat Sidebar */}
      <ChatSidebar open={open} onClose={() => setOpen(false)} />
    </>
  );
}
