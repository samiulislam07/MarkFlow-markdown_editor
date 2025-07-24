import React from 'react';
import { MessageSquare } from 'lucide-react';
import { CommentPosition } from '@/types/comment';

interface CommentButtonProps {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedText: string;
  selectionPosition: CommentPosition | null;
  onAddComment: (text: string, position: CommentPosition) => void;
  onDismiss: () => void;
}

const CommentButton: React.FC<CommentButtonProps> = ({
  isVisible,
  position,
  selectedText,
  selectionPosition,
  onAddComment,
  onDismiss,
}) => {
  if (!isVisible || !selectionPosition) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddComment(selectedText, selectionPosition);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <>
      {/* Backdrop to catch clicks outside */}
      <div
        className="fixed inset-0 z-40"
        onClick={onDismiss}
        onMouseDown={onDismiss}
      />
      
      {/* Comment Button */}
      <div
        className="fixed z-50 transform -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in duration-150"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <button
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-all duration-150 hover:scale-105 hover:shadow-xl"
          title={`Add comment to: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Add Comment</span>
        </button>
        
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1">
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-600"></div>
        </div>
      </div>
    </>
  );
};

export default CommentButton; 