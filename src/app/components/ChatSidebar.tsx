"use client";

import React, { useState, useEffect, useRef } from 'react'
import ChatBox from './ChatBox'
import { useUser } from "@clerk/nextjs"
import { FiMessageSquare, FiX, FiChevronRight, FiUsers, FiPlus } from 'react-icons/fi'
import { HiOutlineHashtag } from 'react-icons/hi'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Channel {
  id: string
  name: string
  isPersonal?: boolean
  unreadCount?: number
}

export default function ChatSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [width, setWidth] = useState(500)
  const [isDragging, setIsDragging] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const { user } = useUser()

  // Mouse move handler for resizing
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !sidebarRef.current) return
    
    const newWidth = window.innerWidth - e.clientX
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
    const fetchChannels = async () => {
      try {
        const res = await fetch('/api/chat/global', {
          headers: {
            'user-id': userId || '',
          }
        })
        const data = await res.json()

        if (!data) return;

        if (!Array.isArray(data)) return

        const channelList = data.map((ws: any) => ({
          id: ws._id,
          name: (ws.name || 'Unnamed Workspace'),
          isPersonal: ws.isPersonal,
          unreadCount: 0
        }))

        setChannels(channelList)
        if (channelList.length > 0) setSelected(channelList[0].id)
      } catch (error) {
        toast.error("Failed to load channels")
      }
    }

    fetchChannels()
  }, [user?.id])

  const selectedChannel = channels.find(c => c.id === selected)

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
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => toast.info("Create channel feature coming soon")}
          >
            <FiPlus size={18} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
          >
            <FiX size={18} />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Channel List
        <div className="flex-shrink-0 border-b border-gray-200">
          <div className="py-3 px-2 max-h-64 overflow-y-auto">
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Channels</span>
              <span className="text-xs text-gray-400">{channels.length} active</span>
            </div>
            
            {channels.map((ch) => (
              <Button
                key={ch.id}
                variant="ghost"
                className={`w-full justify-between text-left px-3 py-2.5 mx-1 rounded-lg transition-all h-auto
                  ${selected === ch.id 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setSelected(ch.id)}
              >
                <div className="flex items-center truncate">
                  <HiOutlineHashtag className={`mr-2 flex-shrink-0 ${selected === ch.id ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className="truncate">{ch.name}</span>
                  {ch.isPersonal && (
                    <Badge variant="secondary" className="ml-2">
                      Personal
                    </Badge>
                  )}
                </div>
                <div className="flex items-center">
                  {ch.unreadCount && ch.unreadCount > 0 && (
                    <Badge variant="default" className="mr-2">
                      {ch.unreadCount}
                    </Badge>
                  )}
                  <FiChevronRight className={`text-gray-400 ${selected === ch.id ? 'opacity-100' : 'opacity-0'}`} />
                </div>
              </Button>
            ))}
          </div>
        </div> */}

        {/* Chat Box */}
        <div className="flex-1 overflow-y-auto">
          {selectedChannel && (
            <ChatBox 
              channel={selectedChannel} 
              channels={channels}
              onChannelChange={(channelId) => {
                setSelected(channelId);
                toast.success(`Switched to ${channels.find(c => c.id === channelId)?.name}`);
              }}
            />
          )}
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="bg-blue-500 text-white">
              {user?.firstName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-500 truncate">Online</p>
          </div>
        </div>
      </div>
    </div>
  )
}