'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';

interface CommentButtonProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onClick: () => void;
}

const CommentButton: React.FC<CommentButtonProps> = ({ isVisible, position, onClick }) => {
  if (!isVisible) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      className="fixed z-50 transition-all duration-150 ease-out"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: isVisible ? 'scale(1) translateY(-50%)' : 'scale(0.8) translateY(-50%)',
        opacity: isVisible ? 1 : 0,
      }}
    >
      <button
        onClick={handleClick}
        onMouseDown={(e) => e.preventDefault()} // Prevents losing text selection
        className="flex items-center space-x-2 bg-black text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium transition-transform hover:scale-105"
        title="Add comment"
      >
        <MessageSquare className="w-4 h-4" />
      </button>
    </div>
  );
};

export default CommentButton;