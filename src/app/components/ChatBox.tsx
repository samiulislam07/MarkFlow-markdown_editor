import React, { useState, useRef, useEffect } from 'react';

const mockMessages: Record<string, { sender: string; text: string }[]> = {
  personal: [
    { sender: 'You', text: 'Hey! This is my personal workspace.' },
    { sender: 'You', text: 'I can jot down notes here.' },
  ],
  'team-ai': [
    { sender: 'Alice', text: 'Team AI standup at 10am.' },
    { sender: 'Bob', text: 'Don’t forget to review the new model.' },
  ],
  design: [
    { sender: 'Eve', text: 'Design review moved to Friday.' },
    { sender: 'Mallory', text: 'Check out the new Figma file.' },
  ],
  random: [
    { sender: 'Trent', text: 'Anyone up for coffee?' },
    { sender: 'Oscar', text: 'Random memes incoming!' },
  ],
};

export default function ChatBox({ channel }: { channel: { id: string; name: string } }) {
  const [messages, setMessages] = useState(mockMessages[channel.id] || []);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(mockMessages[channel.id] || []);
  }, [channel.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      setMessages((msgs) => [...msgs, { sender: 'You', text: input }]);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
            <span className="text-xs text-gray-500 mb-1">{msg.sender}</span>
            <span className={`inline-block px-4 py-2 rounded-2xl max-w-xs break-words ${msg.sender === 'You' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'}`}>{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
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
  );
}
