'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { MessageSquare, X, Send, Edit3, Trash2, Check, Reply, MoreHorizontal, Loader2, CheckCircle2 } from 'lucide-react';
import { CommentData } from '@/types/comment';

// --- PROPS INTERFACES ---
interface CommentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  noteId?: string;
  activeCommentId?: string;
  setActiveCommentId: (id?: string) => void;
  selectedText?: string;
  selection?: { from: number; to: number };
  darkMode?: boolean;
}

interface CommentItemProps {
  comment: CommentData;
  onUpdate: (commentId: string, newContent: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReply: (parentId: string, content: string) => Promise<void>;
  onResolve: (commentId: string, isResolved: boolean) => Promise<void>;
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

// --- HELPER: FORMAT TIMESTAMP ---
const formatTimestamp = (date: Date | string) => {
  const now = new Date();
  const commentDate = new Date(date);
  const diffMs = now.getTime() - commentDate.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
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
    if (content.trim() && !isSubmitting) {
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
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          {isSubmitting ? 'Posting...' : buttonText}
        </button>
      </div>
    </form>
  );
};

// --- COMPONENT: COMMENT ITEM ---
const CommentItem: React.FC<CommentItemProps> = ({ comment, onUpdate, onDelete, onReply, onResolve, currentUserId, isReply = false, activeCommentId, setActiveCommentId, darkMode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  const handleEditSubmit = async (newContent: string) => {
    await onUpdate(comment._id, newContent);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this comment and all its replies?')) {
      onDelete(comment._id);
    }
  };
  
  const handleReplySubmit = async (content: string) => {
    await onReply(comment._id, content);
    setIsReplying(false);
  };

  const handleResolve = () => {
    onResolve(comment._id, !comment.isResolved);
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

  const isAuthor = !!currentUserId && !!comment.author.clerkId && currentUserId === comment.author.clerkId;
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
          {comment.selectedText && !isReply && (
            <blockquote className={`mb-2 px-3 py-2 border-l-4 rounded-r-lg text-sm italic ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-400 text-gray-600'}`}>
              {comment.selectedText}
            </blockquote>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              {comment.author.name}
              <span className={`text-xs ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {formatTimestamp(comment.createdAt)}
              </span>
              {comment.isEdited && <span className={`text-xs ml-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(edited)</span>}
            </div>
            
            <div className="relative" ref={optionsRef}>
              <button onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }} className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showOptions && (
                <div className={`absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10`}>
                  {isAuthor && !comment.isResolved && (
                    <>
                      <button onClick={() => { setIsEditing(true); setShowOptions(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Edit</button>
                      <button onClick={handleDelete} className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700">Delete</button>
                    </>
                  )}
                  {!comment.isResolved && <button onClick={() => { setIsReplying(true); setShowOptions(false); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Reply</button>}
                  <button onClick={handleResolve} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{comment.isResolved ? 'Unresolve' : 'Resolve'}</button>
                </div>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="mt-2">
              <CommentForm
                onSubmit={handleEditSubmit}
                onCancel={() => setIsEditing(false)}
                initialContent={comment.content}
                placeholder="Edit your comment..."
                buttonText="Save"
                isSubmitting={false}
                darkMode={darkMode}
                autoFocus
              />
            </div>
          ) : (
            <p className={`mt-1 text-sm ${comment.isResolved ? 'italic text-gray-500 line-through' : ''}`}>{comment.content}</p>
          )}

          {isReplying && (
             <div className="mt-2">
              <CommentForm
                onSubmit={handleReplySubmit}
                onCancel={() => setIsReplying(false)}
                placeholder="Write a reply..."
                buttonText="Reply"
                isSubmitting={false}
                darkMode={darkMode}
                autoFocus
              />
            </div>
          )}

          <div className="mt-2">
            {comment.replies?.map(reply => (
              <CommentItem key={reply._id} comment={reply} onUpdate={onUpdate} onDelete={onDelete} onReply={onReply} onResolve={onResolve} currentUserId={currentUserId} isReply={true} activeCommentId={activeCommentId} setActiveCommentId={setActiveCommentId} darkMode={darkMode}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN SIDEBAR COMPONENT ---
const CommentSidebar: React.FC<CommentSidebarProps> = ({ isOpen, onClose, noteId, selectedText, selection, darkMode, activeCommentId, setActiveCommentId }) => {
  const { user } = useUser();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'resolved'>('open');

  const fetchComments = useCallback(async () => {
    if (!noteId) return;
    setIsLoading(true);
    setError(null);
    try {
      // --- MODIFIED FETCH: Always include resolved comments ---
      const response = await fetch(`/api/comments?noteId=${noteId}&includeResolved=true`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      setComments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    if (isOpen && noteId) {
      fetchComments();
    }
  }, [isOpen, noteId, fetchComments]);

  const updateCommentInState = (list: CommentData[], updatedComment: CommentData): CommentData[] => {
    return list.map(comment => {
      if (comment._id === updatedComment._id) {
        return { ...comment, ...updatedComment, replies: comment.replies || [] };
      }
      if (comment.replies && comment.replies.length > 0) {
        return { ...comment, replies: updateCommentInState(comment.replies, updatedComment) };
      }
      return comment;
    });
  };

  const handleCreateComment = async (content: string) => {
    if (!noteId || !selectedText || !selection) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, content, selectedText, position: selection }),
      });
      if (!response.ok) throw new Error('Failed to post comment');
      await fetchComments();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to update comment');
      const updatedComment = await response.json();
      setComments(prev => updateCommentInState(prev, updatedComment));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete comment');
      await fetchComments(); 
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplyComment = async (parentId: string, content: string) => {
     if (!noteId) return;
     try {
       const response = await fetch('/api/comments', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ noteId, content, parentId }),
       });
       if (!response.ok) throw new Error('Failed to post reply');
       await fetchComments();
     } catch (err) {
       console.error(err);
     }
  };

  const handleResolveComment = async (commentId: string, isResolved: boolean) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved }),
      });
      if (!response.ok) throw new Error('Failed to resolve comment');
      const updatedComment = await response.json();
      setComments(prev => updateCommentInState(prev, updatedComment));
    } catch (err) {
      console.error(err);
    }
  };

  // --- START: FILTERING LOGIC ---
  const { openComments, resolvedComments } = useMemo(() => {
    const open: CommentData[] = [];
    const resolved: CommentData[] = [];
    comments.forEach(comment => {
      if (comment.isResolved) {
        resolved.push(comment);
      } else {
        open.push(comment);
      }
    });
    return { openComments: open, resolvedComments: resolved };
  }, [comments]);

  const commentsToDisplay = activeTab === 'open' ? openComments : resolvedComments;
  // --- END: FILTERING LOGIC ---

  return (
    <div className={`fixed right-0 top-0 h-full w-96 shadow-xl border-l z-30 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-900'}`}>
      <div className="flex flex-col h-full">
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Comments</h2>
          </div>
          <button onClick={onClose} className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}><X className="w-5 h-5" /></button>
        </div>

        {/* --- START: TABS UI --- */}
        <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <nav className="flex space-x-4 px-4">
            <button
              onClick={() => setActiveTab('open')}
              className={`py-3 px-1 text-sm font-medium border-b-2 ${
                activeTab === 'open'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : `border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200`
              }`}
            >
              Open ({openComments.length})
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`py-3 px-1 text-sm font-medium border-b-2 ${
                activeTab === 'resolved'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : `border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200`
              }`}
            >
              Resolved ({resolvedComments.length})
            </button>
          </nav>
        </div>
        {/* --- END: TABS UI --- */}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedText && activeTab === 'open' && (
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

          {isLoading ? (
            <div className="text-center py-10"><Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" /></div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">{error}</div>
          ) : commentsToDisplay.length > 0 ? (
            commentsToDisplay.map(comment => (
              <CommentItem 
                key={comment._id} 
                comment={comment} 
                onUpdate={handleUpdateComment}
                onDelete={handleDeleteComment}
                onReply={handleReplyComment}
                onResolve={handleResolveComment}
                currentUserId={user?.id} 
                darkMode={darkMode} 
                activeCommentId={activeCommentId}
                setActiveCommentId={setActiveCommentId} 
              />
            ))
          ) : (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No {activeTab} comments.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentSidebar;
