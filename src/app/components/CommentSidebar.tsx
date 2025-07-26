'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { MessageSquare, X, Send, Edit3, Trash2, Check, Reply } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import { CommentData, CreateCommentData } from '@/types/comment';

// --- PROPS INTERFACES ---
interface CommentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  comments: CommentData[];
  onCommentAction: (action: CommentAction) => void;
  activeCommentId?: string;
  setActiveCommentId: (id?: string) => void;
  selectedText?: string;
  selection?: { from: number; to: number };
  darkMode?: boolean;
}

interface CommentItemProps {
  comment: CommentData;
  onAction: (action: CommentAction) => void;
  currentUserId?: string;
  darkMode?: boolean;
  isReply?: boolean;
  activeCommentId?: string;
  setActiveCommentId: (id: string) => void;
}

interface CommentFormProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  initialContent?: string;
  placeholder: string;
  buttonText: string;
  isSubmitting: boolean;
  darkMode?: boolean;
  autoFocus?: boolean;
}

export type CommentAction =
  | { type: 'create'; payload: CreateCommentData }
  | { type: 'reply'; payload: { parentId: string; content: string } }
  | { type: 'edit'; payload: { commentId: string; content: string } }
  | { type: 'delete'; payload: { commentId: string } }
  | { type: 'resolve'; payload: { commentId: string; isResolved: boolean } };

// --- HELPER: FORMAT TIMESTAMP ---
const formatTimestamp = (date: Date | string) => {
  const now = new Date();
  const commentDate = new Date(date);
  const diffMs = now.getTime() - commentDate.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  if (diffMins < 43200) return `${Math.floor(diffMins / 1440)}d ago`;
  return commentDate.toLocaleDateString();
};

// --- COMPONENT: COMMENT FORM ---
const CommentForm: React.FC<CommentFormProps> = ({ onSubmit, onCancel, initialContent = '', placeholder, buttonText, isSubmitting, darkMode, autoFocus }) => {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content.trim());
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className={`w-full p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
          darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'
        }`}
        rows={3}
      />
      <div className="flex items-center justify-end space-x-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={!content.trim() || isSubmitting} className="flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          <Send className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Posting...' : buttonText}
        </button>
      </div>
    </form>
  );
};

// --- COMPONENT: COMMENT ITEM ---
const CommentItem: React.FC<CommentItemProps> = ({ comment, onAction, isReply = false, activeCommentId, setActiveCommentId, darkMode }) => {
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  const handleEdit = () => {
    onAction({ type: 'edit', payload: { commentId: comment._id, content: editedContent } });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this comment and all its replies?')) {
      onAction({ type: 'delete', payload: { commentId: comment._id } });
    }
  };
  
  const handleReply = () => {
    onAction({ type: 'reply', payload: { parentId: comment._id, content: replyContent } });
    setIsReplying(false);
    setReplyContent('');
  };

  const handleResolve = () => {
    onAction({ type: 'resolve', payload: { commentId: comment._id, isResolved: !comment.isResolved } });
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAuthor = user?.id === comment.author._id;
  const isActive = activeCommentId === comment._id;

  return (
    <div 
      className={`comment-item p-3 my-2 rounded-lg transition-all duration-300 ${isReply ? 'ml-6' : ''} ${isActive ? (darkMode ? 'bg-blue-900/50' : 'bg-blue-100') : ''}`}
      onClick={() => setActiveCommentId(comment._id)}
    >
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          {comment.author.avatar ? (
            <img src={comment.author.avatar} alt={comment.author.name} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold">
              {comment.author.name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          {comment.selectedText && (
            <blockquote className={`mb-2 px-3 py-2 border-l-4 rounded-r-lg text-sm italic ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-400 text-gray-600'}`}>
              {comment.selectedText}
            </blockquote>
          )}
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              {comment.author.name}
              <span className={`text-xs ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {new Date(comment.createdAt).toLocaleString()}
              </span>
              {comment.isEdited && <span className={`text-xs ml-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(edited)</span>}
            </div>
            
            {/* Options Menu */}
            <div className="relative" ref={optionsRef}>
              <button onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }} className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showOptions && (
                <div className={`absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10`}>
                  {isAuthor && (
                    <>
                      <button onClick={() => { setIsEditing(true); setShowOptions(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Edit</button>
                      <button onClick={handleDelete} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Delete</button>
                    </>
                  )}
                  <button onClick={() => { setIsReplying(true); setShowOptions(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Reply</button>
                  <button onClick={handleResolve} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{comment.isResolved ? 'Unresolve' : 'Resolve'}</button>
                </div>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className={`w-full p-2 mt-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button onClick={() => setIsEditing(false)} className={`px-3 py-1 text-sm rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>Cancel</button>
                <button onClick={handleEdit} className="px-3 py-1 text-sm rounded bg-blue-600 text-white">Save</button>
              </div>
            </div>
          ) : (
            <p className={`mt-1 text-sm ${comment.isResolved ? 'italic text-gray-500 line-through' : ''}`}>{comment.content}</p>
          )}

          {isReplying && (
             <div className="mt-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className={`w-full p-2 mt-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button onClick={() => setIsReplying(false)} className={`px-3 py-1 text-sm rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>Cancel</button>
                <button onClick={handleReply} className="px-3 py-1 text-sm rounded bg-blue-600 text-white">Reply</button>
              </div>
            </div>
          )}

          <div className="mt-2">
            {comment.replies?.map(reply => (
              <CommentItem key={reply._id} comment={reply} onAction={onAction} isReply={true} activeCommentId={activeCommentId} setActiveCommentId={setActiveCommentId} darkMode={darkMode}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: COMMENT SIDEBAR ---
const CommentSidebar: React.FC<CommentSidebarProps> = ({ isOpen, onClose, comments, onCommentAction, selectedText, selection, darkMode, activeCommentId, setActiveCommentId }) => {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateComment = async (content: string) => {
    if (!selectedText || !selection) return;
    setIsSubmitting(true);
    onCommentAction({
      type: 'create',
      payload: { content, selectedText, selection }
    });
    // Optimistically assume it works, state will be updated via Yjs
    setIsSubmitting(false);
  };

  const topLevelComments = comments.filter(c => !c.parent);

  return (
    <div className={`fixed right-0 top-0 h-full w-96 shadow-xl border-l z-30 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-900'}`}>
      <div className="flex flex-col h-full">
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Comments</h2>
            <span className={`text-sm px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>{comments.length}</span>
          </div>
          <button onClick={onClose} className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedText && (
            <div className={`p-3 border rounded-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">Replying to: "{selectedText}"</p>
              <div className="mt-2">
                <CommentForm
                  onSubmit={handleCreateComment}
                  placeholder="Add a comment..."
                  buttonText="Comment"
                  isSubmitting={isSubmitting}
                  darkMode={darkMode}
                  autoFocus
                />
              </div>
            </div>
          )}

          {topLevelComments.length > 0 ? (
            topLevelComments.map(comment => (
              <CommentItem 
                key={comment._id} 
                comment={comment} 
                onAction={onCommentAction} 
                currentUserId={user?.id} 
                darkMode={darkMode} 
                activeCommentId={activeCommentId}
                setActiveCommentId={setActiveCommentId} 
              />
            ))
          ) : (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No comments yet.</p>
              <p className="text-sm">Select text in the editor to start a conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentSidebar;
