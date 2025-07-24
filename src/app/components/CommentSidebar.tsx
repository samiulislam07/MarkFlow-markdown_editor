import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  MessageSquare,
  X,
  Send,
  Edit3,
  Trash2,
  Check,
  Reply,
  MoreVertical,
  User,
} from 'lucide-react';
import { CommentData, CommentPosition, CreateCommentRequest } from '@/types/comment';

interface CommentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string;
  selectedText?: {
    text: string;
    position: CommentPosition;
  };
  comments: CommentData[];
  onCommentCreate: (comment: CommentData) => void;
  onCommentUpdate: (comment: CommentData) => void;
  onCommentDelete: (commentId: string) => void;
  onRefresh: () => void;
  darkMode?: boolean;
}

interface CommentItemProps {
  comment: CommentData;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (parentId: string) => void;
  onResolve: (commentId: string, isResolved: boolean) => void;
  currentUserId?: string;
  darkMode?: boolean;
  isReply?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onEdit,
  onDelete,
  onReply,
  onResolve,
  currentUserId,
  darkMode = false,
  isReply = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showActions, setShowActions] = useState(false);

  const isOwnComment = currentUserId === comment.author._id;

  const handleEdit = () => {
    onEdit(comment._id, editContent);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleEdit();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(comment.content);
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className={`${isReply ? 'ml-8 border-l-2 border-gray-300 pl-4' : ''} ${
      comment.isResolved ? 'opacity-60' : ''
    }`}>
      <div className={`p-3 rounded-lg border ${
        darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      } ${comment.isResolved ? 'bg-opacity-50' : ''}`}>
        {/* Comment Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
              darkMode ? 'bg-blue-600' : 'bg-blue-500'
            }`}>
              {comment.author.firstName?.[0] || comment.author.email[0].toUpperCase()}
            </div>
            <div>
              <div className={`text-sm font-medium ${
                darkMode ? 'text-gray-200' : 'text-gray-900'
              }`}>
                {comment.author.firstName && comment.author.lastName 
                  ? `${comment.author.firstName} ${comment.author.lastName}`
                  : comment.author.email}
              </div>
              <div className={`text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {formatTimestamp(comment.createdAt)}
                {comment.isEdited && ' (edited)'}
              </div>
            </div>
          </div>
          
          {isOwnComment && (
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
                  darkMode ? 'hover:bg-white' : 'hover:bg-gray-300'
                }`}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {showActions && (
                <div className={`absolute right-0 top-8 z-10 min-w-[120px] rounded-md border shadow-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}>
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowActions(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-opacity-10 transition-colors flex items-center space-x-2 ${
                      darkMode ? 'hover:bg-white' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      onDelete(comment._id);
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comment Content */}
        <div className="mb-3">
          {comment.position && (
            <div className={`text-xs mb-2 p-2 rounded ${
              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}>
              <span className="font-medium">Commenting on:</span> "{comment.position.selectedText}"
            </div>
          )}
          
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyPress}
                className={`w-full p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-200' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                rows={3}
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className={`text-sm whitespace-pre-wrap ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {comment.content}
            </div>
          )}
        </div>

        {/* Comment Actions */}
        {!isEditing && (
          <div className="flex items-center space-x-4 text-xs">
            {!isReply && (
              <button
                onClick={() => onReply(comment._id)}
                className={`flex items-center space-x-1 hover:text-blue-600 transition-colors ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                <Reply className="w-3 h-3" />
                <span>Reply</span>
              </button>
            )}
            
            {!isReply && isOwnComment && (
              <button
                onClick={() => onResolve(comment._id, !comment.isResolved)}
                className={`flex items-center space-x-1 transition-colors ${
                  comment.isResolved 
                    ? 'text-green-600 hover:text-green-700' 
                    : darkMode ? 'text-gray-400 hover:text-green-400' : 'text-gray-500 hover:text-green-600'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>{comment.isResolved ? 'Resolved' : 'Resolve'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
              onResolve={onResolve}
              currentUserId={currentUserId}
              darkMode={darkMode}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentSidebar: React.FC<CommentSidebarProps> = ({
  isOpen,
  onClose,
  documentId,
  selectedText,
  comments,
  onCommentCreate,
  onCommentUpdate,
  onCommentDelete,
  onRefresh,
  darkMode = false,
}) => {
  const { user } = useUser();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (selectedText && isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selectedText, isOpen]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !documentId || !user) return;

    setIsSubmitting(true);
    try {
      const commentData: CreateCommentRequest = {
        noteId: documentId,
        content: newComment.trim(),
        position: selectedText?.position,
      };

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData),
      });

      if (response.ok) {
        const createdComment = await response.json();
        onCommentCreate(createdComment);
        setNewComment('');
      } else {
        console.error('Failed to create comment');
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !replyingTo || !documentId || !user) return;

    setIsSubmitting(true);
    try {
      const replyData: CreateCommentRequest = {
        noteId: documentId,
        content: replyContent.trim(),
        parentId: replyingTo,
      };

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(replyData),
      });

      if (response.ok) {
        const createdReply = await response.json();
        // Add reply to the parent comment
        const updatedComment = {
          ...createdReply,
          parentComment: replyingTo,
        };
        onCommentCreate(updatedComment);
        setReplyContent('');
        setReplyingTo(null);
        onRefresh(); // Refresh to get the updated thread structure
      }
    } catch (error) {
      console.error('Error creating reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const updatedComment = await response.json();
        onCommentUpdate(updatedComment);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onCommentDelete(commentId);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleResolveComment = async (commentId: string, isResolved: boolean) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isResolved }),
      });

      if (response.ok) {
        const updatedComment = await response.json();
        onCommentUpdate(updatedComment);
      }
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed right-0 top-0 h-full w-96 shadow-xl border-l z-30 transform transition-transform duration-300 ${
      darkMode 
        ? 'bg-gray-900 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center space-x-2">
          <MessageSquare className={`w-5 h-5 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`} />
          <h2 className={`text-lg font-semibold ${
            darkMode ? 'text-gray-200' : 'text-gray-900'
          }`}>
            Comments
          </h2>
          <span className={`text-sm px-2 py-1 rounded-full ${
            darkMode 
              ? 'bg-gray-700 text-gray-300' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {comments.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
            darkMode ? 'hover:bg-white' : 'hover:bg-gray-300'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col h-full">
        {/* New Comment Form */}
        {selectedText && (
          <div className={`p-4 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className={`text-sm mb-3 ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              <span className="font-medium">Adding comment to:</span>
              <div className={`mt-1 p-2 rounded text-xs ${
                darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}>
                "{selectedText.text}"
              </div>
            </div>
            <div className="space-y-3">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write your comment..."
                className={`w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                rows={4}
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Posting...' : 'Post Comment'}</span>
                </button>
                <button
                  onClick={onClose}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className={`text-center py-8 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No comments yet.</p>
              <p className="text-sm mt-1">Select text to add the first comment.</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment._id}>
                <CommentItem
                  comment={comment}
                  onEdit={handleEditComment}
                  onDelete={handleDeleteComment}
                  onReply={setReplyingTo}
                  onResolve={handleResolveComment}
                  currentUserId={user?.id}
                  darkMode={darkMode}
                />
                
                {/* Reply Form */}
                {replyingTo === comment._id && (
                  <div className="mt-3 ml-8 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className={`w-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-200' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      rows={3}
                    />
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={handleSubmitReply}
                        disabled={!replyContent.trim() || isSubmitting}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentSidebar;
export type { CommentPosition, CommentData }; 