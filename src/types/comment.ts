export interface CommentPosition {
  line: number;
  character: number;
  selection: {
    start: number;
    end: number;
  };
  selectedText: string;
}

export interface CommentReaction {
  user: string;
  emoji: string;
}

export interface CommentData {
  _id: string;
  note: string;
  author: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  content: string;
  isResolved: boolean;
  parent?: string;
  mentions: string[];
  position?: CommentPosition;
  reactions: CommentReaction[];
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  replies?: CommentData[];
}

export interface CreateCommentRequest {
  noteId: string;
  content: string;
  position?: CommentPosition;
  parentId?: string;
  mentions?: string[];
}

export interface UpdateCommentRequest {
  content?: string;
  isResolved?: boolean;
}

export interface CommentThread {
  id: string;
  position: CommentPosition;
  comments: CommentData[];
  isResolved: boolean;
}

export interface CommentUIState {
  isCommentButtonVisible: boolean;
  selectedText: string;
  buttonPosition: { x: number; y: number };
  selectionPosition: CommentPosition | null;
} 