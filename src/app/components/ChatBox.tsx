"use client";

import React, { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  FiSend,
  FiPaperclip,
  FiSmile,
  FiMic,
  FiX,
  FiCheck,
  FiClock,
  FiUsers,
  FiCopy,
  FiChevronDown,
} from "react-icons/fi";
import { HiOutlineDotsHorizontal, HiOutlineHashtag } from "react-icons/hi";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Copy, Edit3 } from 'lucide-react';

export default function ChatBox({
  channel,
  channels,
  onChannelChange,
}: {
  channel: { id: string; name: string };
  channels: { id: string; name: string }[];
  onChannelChange: (channelId: string) => void;
}) {
  const [messages, setMessages] = useState<
    {
      sender: { firstName: string };
      text: string;
      timestamp: string;
      fileUrl?: string;
      fileName?: string;
    }[]
  >([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const firstName = user?.firstName;
  const wsRef = useRef<WebSocket | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [activeUsers, setActiveUsers] = useState<{ userId: string; userName: string }[]>([]);
  const userId = user?.id ?? "anonymous";
  const [autoScroll, setAutoScroll] = useState(true);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const [showAgentQuickAction, setShowAgentQuickAction] = useState(false);

  // WebSocket connection
  useEffect(() => {
    if (!user) return;

    const displayName = user?.firstName ?? "Anonymous";
    const ws = new WebSocket(
      `wss://markflow-collaborative-editor.md-iftikher.partykit.dev/parties/chat/${channel.id}?user=${encodeURIComponent(displayName)}&id=${userId}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "init",
          userId: user?.id ?? "anonymous",
          userName: user?.firstName ?? "Anonymous",
        })
      );
    };

    ws.onmessage = (event) => {
      let data: any;

      if (typeof event.data === "string") {
        data = JSON.parse(event.data);
      } else if (event.data instanceof Blob) {
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
        case "chat":
          if (data.userName && data.text) {
            setMessages((prev) => [
              ...prev,
              {
                sender: { firstName: data.userName },
                text: data.text,
                timestamp: new Date(data.timestamp || Date.now()).toISOString(),
              },
            ]);
          }
          break;
        case "typing":
          setTypingUsers((prev) =>
            data.isTyping
              ? [...new Set([...prev, data.userId])]
              : prev.filter((id) => id !== data.userId)
          );
          break;
        case "presence":
          setActiveUsers((prev) => {
            if (data.status === "joined") {
              return [...new Set([...prev, data.userName])];
            } else if (data.status === "left") {
              return prev.filter((name) => name !== data.userName);
            }
            return prev;
          });
          break;
        case "activeUsers":
          if (Array.isArray(data.users)) {
            setActiveUsers(data.users);
          }
          break;
      }
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => {
      ws.close();
    };
  }, [channel.id, user]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat/workspace?workspaceId=${channel.id}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const validMessages = data.filter(
            (msg) =>
              msg &&
              msg.sender &&
              typeof msg.sender.firstName === "string" &&
              typeof msg.text === "string"
          );
          setMessages(validMessages);
        }
      } catch (err) {
        console.error("Failed to fetch workspace chat:", err);
        toast.error("Failed to load messages");
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 50000);
    return () => clearInterval(interval);
  }, [channel.id]);

  // Auto-scroll logic
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;
      setAutoScroll(isAtBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  // Typing indicator
  const handleTyping = () => {
    if (!wsRef.current) return;

    wsRef.current.send(JSON.stringify({ type: "typing", isTyping: true }));

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      wsRef.current?.send(JSON.stringify({ type: "typing", isTyping: false }));
    }, 2000);
  };

  // Extract OpenReview URL
  const extractURL = (input: string) => {
    const match = input.match(/https:\/\/openreview\.net\/forum\?id=[\w-]+/);
    return match ? match[0] : null;
  };

  // Extract query for agent
  const extractQuery = (input: string) => {
    return input
      .replace(/^@Agent\s*/, "")
      .replace(/https:\/\/openreview\.net\/forum\?id=[\w-]+/, "")
      .trim();
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage = {
      sender: { firstName: "You" },
      text: input,
      timestamp: new Date().toISOString(),
      fileUrl: file ? URL.createObjectURL(file) : undefined,
      fileName: file ? file.name : undefined,
    };

    // Send message through WebSocket for real-time delivery
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "chat",
          text: input,
        })
      );
    }

    setInput("");
    setFile(null);
    setShowAgentQuickAction(false);

    const formData = new FormData();
    formData.append("workspaceId", channel.id);
    formData.append("message", input);
    if (file) formData.append("file", file);

    try {
      await fetch("/api/chat/send", {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }

    // Agent interaction
    if (input.trim().startsWith("@Agent")) {
      const openreview_url = extractURL(input);
      const query = extractQuery(input);

      const agentFormData = new FormData();
      agentFormData.append(
        "openreview_url",
        openreview_url ? openreview_url : ""
      );
      agentFormData.append("query", query);
      agentFormData.append("pdf", file ? file : "");

      try {
        const res = await fetch("/api/agent/handle-task", {
          method: "POST",
          body: agentFormData,
        });
        const data = await res.json();

        // Send agent reply through WebSocket for real-time delivery
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "agentChat",
              text: data.response,
            })
          );
        }

        const agentResponse = new FormData();
        agentResponse.append("sender", "Agent");
        agentResponse.append("workspaceId", channel.id);
        agentResponse.append("message", data.response);

        await fetch("/api/chat/send", {
          method: "POST",
          body: agentResponse,
        });
      } catch (err) {
        console.error("Agent fetch error:", err);
        toast.error("Agent request failed");
      }
    }
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    if (selected.size > 10 * 1024 * 1024) { // 5MB limit
      toast.error("File size too large (max 10MB)");
      return;
    }
    
    setFile(selected);
    toast.success("File ready to send");
  };

  // Copy text to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Quick mention agent
  const quickMentionAgent = () => {
    setInput("@Agent ");
    setShowAgentQuickAction(false);
    const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
    inputElement?.focus();
  };

  // Typing indicator component
  const TypingIndicator = () => (
    <div className="flex items-center px-4 py-2">
      <div className="flex space-x-1 px-3 py-2 bg-gray-100 rounded-full">
        <div
          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );

  // Message status indicator
  const MessageStatus = ({
    status,
  }: {
    status: "sent" | "delivered" | "read";
  }) => (
    <span className="ml-1 text-xs text-gray-400 inline-flex items-center">
      {status === "sent" && <FiClock size={12} />}
      {status === "delivered" && <FiCheck size={12} />}
      {status === "read" && (
        <>
          <FiCheck size={12} className="text-blue-500" />
          <FiCheck size={12} className="-ml-1 text-blue-500" />
        </>
      )}
    </span>
  );

const handleWriteToEditor = async (content: string) => {
  try {
    // Trigger the incremental writing animation
    if ((window as any).writeToEditor) {
      await (window as any).writeToEditor(content);
    } else {
      // Fallback: direct API call
      const response = await fetch('/api/write-to-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, workspaceId: channel.id })
      });
      
      if (response.ok) {
        console.log('Content written to editor successfully');
      }
    }
  } catch (error) {
    console.error('Failed to write to editor:', error);
  }
};

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat header */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100">
                <HiOutlineHashtag className="text-gray-500 text-xl" />
                <span className="font-medium text-gray-800">{channel.name}</span>
                <FiChevronDown className="text-gray-400" size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {channels.map((ch) => (
                <DropdownMenuItem 
                  key={ch.id} 
                  onClick={() => onChannelChange(ch.id)}
                  className={channel.id === ch.id ? "bg-gray-100" : ""}
                >
                  <HiOutlineHashtag className="mr-2 text-gray-500" />
                  <span>{ch.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Badge variant="outline" className="border-green-300 text-green-600">
            Active
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <FiUsers size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <HiOutlineDotsHorizontal size={18} />
          </Button>
        </div>
      </div>

      {/* Active users bar */}
      {activeUsers.length > 0 && (
        <div className="px-4 py-1.5 text-sm text-gray-600 bg-blue-50 border-b border-gray-200 flex items-center">
          <div className="flex -space-x-2 mr-2">
            {activeUsers.slice(0, 3).map((user, i) => (
              <Avatar key={i} className="w-5 h-5 border-2 border-white">
                <AvatarFallback className="text-xs bg-blue-200">
                  {user.userName}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="truncate">
            {activeUsers.length > 3
              ? `${activeUsers.slice(0, 3).map(u => u.userName).join(", ")} +${activeUsers.length - 3} more`
              : activeUsers.map(u => u.userName).join(", ")}
          </span>
        </div>
      )}

      {/* Messages container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-gradient-to-b from-white to-gray-50"
      >
        {messages
          .map((msg, idx) => {
            const isYou =
              msg.sender?.firstName === "You" ||
              msg.sender?.firstName === firstName;
            const isAgent = msg.sender?.firstName === "Agent";
            const isConsecutive =
              idx > 0 &&
              messages[idx - 1]?.sender?.firstName === msg.sender?.firstName;
            const showHeader = !isConsecutive || isAgent;

            if (!msg.sender?.firstName || !msg.text) {
              return null;
            }

            return (
              <div
                key={idx}
                className={`flex ${isYou ? "justify-end" : "justify-start"} ${showHeader ? "mt-3" : "mt-1"}`}
              >
                <div
                  className={`max-w-[80%] flex ${isYou ? "flex-row-reverse" : ""}`}
                >
                  {!isYou && showHeader && (
                    <Avatar className={`w-8 h-8 mr-2 ${isAgent ? "bg-purple-100 text-purple-600" : "bg-gray-200 text-gray-600"}`}>
                      <AvatarFallback>
                        {isAgent ? "AI" : msg.sender.firstName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div>
                    {showHeader && !isYou && (
                      <div
                        className={`text-xs font-medium mb-1 ${isAgent ? "text-purple-600" : "text-gray-600"}`}
                      >
                        {msg.sender.firstName}
                      </div>
                    )}

                    <div className="flex flex-col space-y-1">
                      {msg.fileUrl && (
                        <div
                          className={`rounded-lg overflow-hidden border ${isYou ? "border-blue-100" : "border-gray-200"}`}
                        >
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <div className="bg-gray-50 p-3 flex items-center">
                              <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-500 mr-3">
                                <FiPaperclip size={18} />
                              </div>
                              <div className="truncate">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {msg.fileName || "Download File"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Click to view
                                </p>
                              </div>
                            </div>
                          </a>
                        </div>
                      )}

                      {msg.text?.trim() && (
                        <div
                          className={`px-4 py-2 rounded-2xl relative ${
                            isYou
                              ? "bg-blue-500 text-white rounded-br-none"
                              : isAgent
                                ? "bg-purple-100 text-gray-800 rounded-bl-none"
                                : "bg-gray-100 text-gray-800 rounded-bl-none"
                          }`}
                        >
                          <p className={`whitespace-pre-wrap break-words ${isAgent ? 'mr-2.5 p-2' : ''}`}>
                            {msg.text}
                          </p>
                  {isAgent && (
                    <div>
                      <button
                        onClick={() => handleCopy(msg.text)}
                        className="absolute top-2 right-2 p-2 rounded-full hover:bg-purple-200 text-purple-600 transition-colors"
                        title="Copy to clipboard"
                      >
                        <FiCopy size={18} />
                      </button>
                      <button
                        onClick={() => handleWriteToEditor(msg.text)}
                        className="flex items-center px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                        title="Write to Editor"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Write to Editor
                      </button>
                    </div>
                  )}
                          <div
                            className={`flex items-center justify-end mt-1 space-x-1 text-xs ${isYou ? "text-blue-200" : "text-gray-500"}`}
                          >
                            {format(new Date(msg.timestamp), "h:mm a")}
                            {isYou && (
                              <MessageStatus
                                status={
                                  idx % 3 === 0
                                    ? "read"
                                    : idx % 2 === 0
                                      ? "delivered"
                                      : "sent"
                                }
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
          .filter(Boolean)}

        {typingUsers.length > 0 && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t bg-white sticky bottom-0">
        {file && (
          <div className="flex items-center justify-between px-3 py-2 mb-2 bg-blue-50 rounded-lg">
            <div className="flex items-center truncate">
              <FiPaperclip className="text-blue-500 mr-2 flex-shrink-0" />
              <span className="truncate text-sm font-medium">{file.name}</span>
            </div>
            <button
              onClick={() => {
                setFile(null);
                toast.info("File removed");
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX size={16} />
            </button>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="file-upload"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <FiPaperclip size={18} />
          </label>
          <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <FiSmile size={18} />
          </button>

          <div className="flex-1 relative">
            <Input
              className="w-full rounded-full bg-gray-100 px-4 py-2.5 focus-visible:ring-2 pl-12 pr-16"
              placeholder={`Message #${channel.name}`}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                handleTyping();
                setShowAgentQuickAction(e.target.value === '@');
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            {showAgentQuickAction && (
              <div className="absolute bottom-12 left-0 bg-white shadow-lg rounded-lg p-2 z-10">
                <button
                  onClick={quickMentionAgent}
                  className="flex items-center px-3 py-2 hover:bg-gray-100 rounded w-full text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2">
                    AI
                  </div>
                  <span>@Agent</span>
                </button>
              </div>
            )}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <button className="p-1 text-gray-400 hover:text-gray-600">
                <FiMic size={16} />
              </button>
            </div>
          </div>

          <Button
            variant="default"
            size="icon"
            className={`rounded-full ${input.trim() ? "" : "opacity-50 cursor-not-allowed"}`}
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <FiSend size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}