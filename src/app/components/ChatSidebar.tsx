import React, { useState } from 'react';
import ChatBox from './ChatBox';

const channels = [
  { id: 'personal', name: 'Personal Workspace' },
  { id: 'team-ai', name: 'Team AI' },
  { id: 'design', name: 'Design Squad' },
  { id: 'random', name: 'Random' },
];

export default function ChatSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState(channels[0].id);

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}
      style={{ maxWidth: '100vw' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="font-bold text-lg">Chats</div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 border-b overflow-x-auto">
          {channels.map((ch) => (
            <button
              key={ch.id}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 focus:outline-none transition-colors
                ${selected === ch.id ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'}`}
              onClick={() => setSelected(ch.id)}
            >
              {ch.name}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChatBox channel={channels.find((c) => c.id === selected)!} />
        </div>
      </div>
    </div>
  );
}
