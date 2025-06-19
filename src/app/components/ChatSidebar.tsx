'use client'

import React, { useState, useEffect } from 'react'
import ChatBox from './ChatBox'

interface Channel {
  id: string
  name: string
}

export default function ChatSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/workspaces')
      const data = await res.json()

      // ⚠️ Optional: handle unauthorized or server error
      if (!Array.isArray(data)) return

      // 👇 Map to id + name for chat channels
      const channelList = data.map((ws: any) => ({
        id: ws._id,
        name: ws.name + (ws.isPersonal ? ' (Personal)' : ''),
      }))

      setChannels(channelList)
      if (channelList.length > 0) setSelected(channelList[0].id)
    } catch (err) {
      console.error('Failed to load channels:', err)
    }
  }

  fetchChannels()
}, [])

  const selectedChannel = channels.find(c => c.id === selected)

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="font-bold text-lg">Chats</div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 border-b overflow-y-auto">
          {channels.map((ch) => (
            <button
              key={ch.id}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 focus:outline-none transition-colors ${
                selected === ch.id ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'
              }`}
              onClick={() => setSelected(ch.id)}
            >
              {ch.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {selectedChannel && <ChatBox channel={selectedChannel} />}
        </div>
      </div>
    </div>
  )
}
