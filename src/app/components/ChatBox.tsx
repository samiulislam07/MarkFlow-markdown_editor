'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export default function ChatBox({ channel }: { channel: { id: string; name: string } }) {
  const [messages, setMessages] = useState<{ sender: { firstName: string }; text: string; timestamp: string }[]>([])
  const [input, setInput] = useState('')
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

  interval = setInterval(fetchMessages, 5000); // poll every 5 seconds

  return () => clearInterval(interval); // cleanup on unmount
  }, [channel.id]);

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const newMessage = {
      sender: { firstName: 'You' },
      text: input,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInput('')

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: channel.id, message: input }),
      })
      const data = await res.json()


      console.log(channel.id, input)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }
 

  return (
    <div className="flex flex-col h-full">
      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
        {messages.map((msg, idx) => {
          const isYou = msg.sender.firstName === 'You' || msg.sender.firstName === firstName;
          return (
            <div key={idx} className={`flex flex-col ${isYou ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-500 mb-1">{msg.sender.firstName}</span>
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
      <div className="p-3 border-t bg-white flex items-center gap-2">
        <input
          className="flex-1 rounded-full border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          type="text"
          placeholder={`Message #${channel.name}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-600 transition"
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  )
}
