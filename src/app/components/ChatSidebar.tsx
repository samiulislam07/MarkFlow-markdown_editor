'use client'

import React, { useState, useEffect, useRef } from 'react'
import ChatBox from './ChatBox'
import { useUser } from "@clerk/nextjs"
import { FiMessageSquare, FiX, FiChevronRight, FiUsers, FiPlus } from 'react-icons/fi'
import { HiOutlineHashtag } from 'react-icons/hi'

interface Channel {
  id: string
  name: string
  isPersonal?: boolean
  unreadCount?: number
}

export default function ChatSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [width, setWidth] = useState(384)
  const [isDragging, setIsDragging] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const { user } = useUser()

  // Mouse move handler for resizing
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !sidebarRef.current) return
    
    // Calculate new width based on mouse position
    const newWidth = window.innerWidth - e.clientX
    // Set minimum and maximum width constraints
    const minWidth = 300
    const maxWidth = 600
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setWidth(newWidth)
    }
  }

  // Mouse up handler to stop resizing
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  useEffect(() => {
    const userId = user?.id;
    console.log('Fetching channels for user:', userId)
    const fetchChannels = async () => {
      const res = await fetch('/api/chat/global', {
        headers: {
          'user-id': userId || '',
        }
      })
      const data = await res.json()

      if (!data) return;
      console.log('Fetched channels:', data)

      if (!Array.isArray(data)) return

      const channelList = data.map((ws: any) => ({
        id: ws._id,
        name: (ws.name || 'Unnamed Workspace'),
        isPersonal: ws.isPersonal,
        unreadCount: 0 // You can add logic to count unread messages
      }))

      setChannels(channelList)
      if (channelList.length > 0) setSelected(channelList[0].id)
    }

    fetchChannels()
  }, [user?.id])

  const selectedChannel = channels.find(c => c.id === selected)

  useEffect(() => {
    console.log('Selected channel:', selectedChannel)
  }, [selectedChannel])

  return (
    <div
      ref={sidebarRef}
      className={`fixed top-0 right-0 h-full bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full'} flex flex-col border-l border-gray-200`}
      style={{ width: `${width}px` }}
    >
      {/* Resize handle */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-transparent hover:bg-blue-400 active:bg-blue-600 transition-colors z-10"
        onMouseDown={() => setIsDragging(true)}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center space-x-3">
          <FiMessageSquare className="text-blue-600 text-xl" />
          <h2 className="font-semibold text-gray-800 text-lg">Workspace Chats</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <FiPlus size={18} />
          </button>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Channel List */}
        <div className="flex-shrink-0 border-b border-gray-200">
          <div className="py-3 px-2 max-h-64 overflow-y-auto">
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Channels</span>
              <span className="text-xs text-gray-400">{channels.length} active</span>
            </div>
            
            {channels.map((ch) => (
              <button
                key={ch.id}
                className={`flex items-center justify-between w-full text-left px-3 py-2.5 mx-1 rounded-lg transition-all
                  ${selected === ch.id 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setSelected(ch.id)}
              >
                <div className="flex items-center truncate">
                  <HiOutlineHashtag className={`mr-2 flex-shrink-0 ${selected === ch.id ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className="truncate">{ch.name}</span>
                  {ch.isPersonal && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">Personal</span>
                  )}
                </div>
                <div className="flex items-center">
                  {ch.unreadCount && ch.unreadCount > 0 && (
                    <span className="mr-2 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                      {ch.unreadCount}
                    </span>
                  )}
                  <FiChevronRight className={`text-gray-400 ${selected === ch.id ? 'opacity-100' : 'opacity-0'}`} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Box */}
        <div className="flex-1 overflow-y-auto">
          {selectedChannel && <ChatBox channel={selectedChannel} />}
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
            {user?.firstName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-500 truncate">Online</p>
          </div>
        </div>
      </div>
    </div>
  )
}