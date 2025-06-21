'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export default function ChatBox({ channel }: { channel: { id: string; name: string } }) {
  const [messages, setMessages] = useState<{ sender: { firstName: string }; text: string; timestamp: string; fileUrl?: string, fileName?: string }[]>([])
  const [input, setInput] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useUser();
  const firstName = user?.firstName;

  // Load messages from the backend when channel changes
  useEffect(() => {
  let interval: NodeJS.Timeout;

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/workspace?workspaceId=${channel.id}`);
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    } catch (err) {
      console.error('Failed to fetch workspace chat:', err);
    }
  };

  fetchMessages(); // initial load

  interval = setInterval(fetchMessages, 500000); // poll every 50 seconds

  return () => clearInterval(interval); // cleanup on unmount
  }, [channel.id]);

  // Scroll to bottom on message update
  const isFirstLoad = useRef(true);

  useEffect(() => {
  const container = messagesEndRef.current?.parentElement;
  if (!container) return;

  const isNearBottom =
    container.scrollHeight - container.scrollTop - container.clientHeight < 100;

  if (isFirstLoad.current) {
    // On first load, always scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    isFirstLoad.current = false;
  } else if (isNearBottom) {
    // Scroll only if user is already near bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages]);


  const handleSend = async () => {
    if (!input.trim() && !file) return;

    const newMessage = {
      sender: { firstName: 'You' },
      text: input,
      timestamp: new Date().toISOString(),
      fileUrl: file ? URL.createObjectURL(file) : undefined,
      fileName: file ? file.name : undefined
    }

    setMessages((prev) => [...prev, newMessage])
    setInput('')
    setFile(null)

    const formData = new FormData();
    formData.append('workspaceId', channel.id);
    formData.append('message', input);
    if (file) formData.append('file', file);

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()


      console.log(channel.id, input)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected); // Just store the file
  };

  useEffect(() => {
    console.log('Messages:', messages);
  }, [messages]);

  return (
    <div className="flex flex-col h-full max-h-screen w-full">
      
      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
        {messages.map((msg, idx) => {
          const isYou = msg.sender.firstName === 'You' || msg.sender.firstName === firstName;
          return (
            <div key={idx} className={`flex flex-col ${isYou ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-500 mb-1">{msg.sender.firstName}</span>
              {msg.fileUrl && (
                <a
                  href={msg.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline mb-1"
                  download={msg.fileName}
                >
                  {msg.fileName || 'Download File'} {/* ✅ fallback to 'Download File' */}
                </a>
              )}
              <span
                className={`inline-block px-4 py-2 rounded-2xl max-w-xs break-words ${
                  isYou ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
                }`}
              >
                {msg.text}
              </span>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t bg-white flex flex-col gap-2 shrink-0 w-full">
        {file && (
          <div className="text-sm text-gray-600 px-2">
            📎 <strong>{file.name}</strong> selected
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
          />
          <label htmlFor="file-upload" className="cursor-pointer text-blue-500 hover:text-blue-700 text-xl">
            📎
          </label>
          <input
            className="flex-1 rounded-full border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            type="text"
            placeholder={`Message #${channel.name}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-600 transition min-w-[64px]"
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
