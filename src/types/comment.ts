// src/types/comment.ts

// A representation of a user for comments, including the Clerk ID for ownership checks.
export interface CommentAuthor {
  _id: string;
  clerkId?: string; // Add Clerk ID for reliable author checks
  name: string;
  avatar?: string;
}

// The structure of a single comment.
export interface CommentData {
  _id: string;
  author: CommentAuthor;
  content: string;
  createdAt: string;
  isResolved: boolean;
  parent?: string;
  selectedText?: string; // The text that was highlighted
  replies?: CommentData[];
  isEdited?: boolean;
  editedAt?: string;

  // These fields might exist from previous versions, keeping them for compatibility.
  anchorStart?: string;
  anchorEnd?: string;
}

// Data required to create a new comment.
export interface CreateCommentData {
  content: string;
  selectedText: string;
  selection: { from: number; to: number };
}

// Data for the floating comment button.
export interface CommentButtonState {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedText: string;
  selection: { from: number; to: number };
}
