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
  const wsRef = useRef<WebSocket | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const displayName = user?.firstName ?? 'Anonymous';
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const userId = user?.id ?? 'anonymous';

  useEffect(() => {
    console.log("Typing users:", typingUsers);
  }, [typingUsers]);

  useEffect(() => { 
    if (!user) return;
    const displayName = user?.firstName ?? 'Anonymous';
    console.log(`Connecting to chat room with display name: ${displayName}`);
    const ws = new WebSocket(
      `ws://localhost:1999/parties/chat/${channel.id}?user=${encodeURIComponent(displayName)}&id=${userId}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'init',
        userId: user?.id ?? 'anonymous',
        userName: user?.firstName ?? 'Anonymous'
      }));
    };

    ws.onmessage = (event) => {
      let data: any;
      //ws.send(JSON.stringify({ type: "init", userId: displayName }));

      if (typeof event.data === "string") {
      // It's already a string — parse directly
        data = JSON.parse(event.data);
      } else if (event.data instanceof Blob) {
      // Convert Blob to text, then parse
        const reader = new FileReader();
        reader.onload = () => {
        try {
          const text = reader.result as string;
          data = JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse message:", e);
        }
      };
      reader.readAsText(event.data);
    } else {
      console.warn("Received unknown message type", event.data);
    }


      switch (data.type) {
        case 'chat':
          setMessages((prev) => [...prev, data]);
          break;

        case 'typing':
          setTypingUsers((prev) =>
            data.isTyping
              ? [...new Set([...prev, data.userId])]
              : prev.filter((id) => id !== data.userId)
          );
          break;

        case 'presence':
          setActiveUsers((prev) => {
            if (data.status === 'joined') {
              return [...new Set([...prev, data.userName])];
            } else if (data.status === 'left') {
              return prev.filter((name) => name !== data.userName);
            }
            return prev;
          });
          break;
      }
    };

    

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, [channel.id]);

  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleTyping = () => {
      if (!wsRef.current) return;

      wsRef.current.send(JSON.stringify({ type: 'typing', isTyping: true }));

      if (typingTimeout.current) clearTimeout(typingTimeout.current);

      typingTimeout.current = setTimeout(() => {
        wsRef.current?.send(JSON.stringify({ type: 'typing', isTyping: false }));
      }, 2000); // 2s after last keystroke
    };


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

const [autoScroll, setAutoScroll] = useState(true);
const containerRef = useRef<HTMLDivElement | null>(null);

// 🟡 Track whether user is near the bottom
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const handleScroll = () => {
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setAutoScroll(isAtBottom);
  };

  container.addEventListener('scroll', handleScroll);
  return () => container.removeEventListener('scroll', handleScroll);
}, []);

useEffect(() => {
  if (autoScroll) {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages, autoScroll]);


const extractURL = (input: string) => {
  const match = input.match(/https:\/\/openreview\.net\/forum\?id=[\w-]+/);
  return match ? match[0] : null;
};

const extractQuery = (input: string) => {
  // Remove '@Agent' and URL to isolate query
  return input.replace(/^@Agent\s*/, '').replace(/https:\/\/openreview\.net\/forum\?id=[\w-]+/, '').trim();
};

  const handleSend = async () => {
    if (!input.trim()) return;


    const newMessage = {
      sender: { firstName: 'You' },
      text: input,
      timestamp: new Date().toISOString(),
      fileUrl: file ? URL.createObjectURL(file) : undefined,
      fileName: file ? file.name : undefined
    }

    //setMessages((prev) => [...prev, newMessage])
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

    if (input.trim().startsWith("@Agent")) {
      const openreview_url = extractURL(input); // Extract link
      const query = extractQuery(input); // Extract query text


      const agentFormData = new FormData();
      agentFormData.append("openreview_url", openreview_url ? openreview_url : '');
      agentFormData.append("query", query);
      agentFormData.append("pdf", file ? file : '');
      let agentReply = '';

      try {
        const res = await fetch("/api/agent/handle-task", {
          method: "POST",
          body: agentFormData,
        });
        const data = await res.json();
        console.log("Agent response:", data);
        agentReply = data.response || 'No response from agent';
        setMessages((prev) => [
          ...prev, newMessage,
          {
            sender: { firstName: "Agent" },
            text: data.response,
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.error("Agent fetch error:", err);
      }

      const agentResponse = new FormData();
      agentResponse.append('workspaceId', channel.id);
      agentResponse.append('message', agentReply);

      try {
        const res = await fetch('/api/chat/send', {
          method: 'POST',
          body: agentResponse,
        })

        console.log(channel.id, input)
      } catch (error) {
        console.error('Failed to send message:', error)
      }

      setInput("");
      setFile(null);
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

  // Simple animated dots for typing indicator
  function TypingDots() {
    return (
      <span>
        <span className="animate-bounce">.</span>
        <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '0.5s' }}>.</span>
      </span>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-screen w-full">
      {activeUsers.length > 0 && (
          <div className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border-b border-gray-300">
            <strong>Active:</strong> {activeUsers.join(", ")}
          </div>
        )}
      {/* Message List */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
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
              {msg.text?.trim() && (
                <span
                  className={`inline-block px-4 py-2 rounded-2xl max-w-xs break-words ${
                    isYou ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {msg.text}
                </span>
              )}
            </div>
          )
        })}
        {typingUsers.length > 0 && (
          <div className="flex flex-col items-start animate-pulse">
            <span
              className="inline-block px-4 py-2 rounded-2xl max-w-xs break-words bg-gray-300 text-gray-700 text-base"
            >
              <TypingDots />
            </span>
          </div>
        )}
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
            onKeyDown={(e) => {
             handleTyping();
             if (e.key === 'Enter') handleSend();
          }}
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
