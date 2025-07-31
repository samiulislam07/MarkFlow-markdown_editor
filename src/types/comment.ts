// A simplified representation of a user for comments
export interface CommentAuthor {
  _id: string;
  name: string;
  avatar?: string;
}

// The structure of a single comment, designed to be stored in Yjs
export interface CommentData {
  _id: string; // Unique ID for the comment
  author: CommentAuthor;
  content: string;
  createdAt: string; // ISO string format
  isResolved: boolean;
  
  // --- NEW: For robust anchoring ---
  anchorStart: string; // JSON string of a Y.js RelativePosition
  anchorEnd: string;   // JSON string of a Y.js RelativePosition

  parent?: string; // ID of the parent comment if it's a reply
  selectedText?: string; // The text that was highlighted (for display purposes only)
  replies?: CommentData[]; // Replies are nested for rendering
  isEdited?: boolean;
  editedAt?: string;
}

// Data required to create a new comment
export interface CreateCommentData {
  content: string;
  selectedText: string;
  
  // --- NEW: Pass the editor selection range ---
  selection: { from: number; to: number };
}

// Data for the floating comment button
export interface CommentButtonState {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedText: string;

  // --- NEW: Hold the selection range for creation ---
  selection: { from: number; to: number };
}
