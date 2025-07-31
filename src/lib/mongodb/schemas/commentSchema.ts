import { Schema } from 'mongoose';

export const commentSchema = new Schema(
  {
    note: { 
      type: Schema.Types.ObjectId, 
      ref: 'Note', 
      required: true,
      index: true 
    },
    author: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    content: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 2000 
    },
    // --- START: ADDED FIELD ---
    // This field will store the quoted text from the document.
    selectedText: {
      type: String,
      trim: true,
      default: null,
    },
    // --- END: ADDED FIELD ---
    isResolved: { 
      type: Boolean, 
      default: false 
    },
    parent: { 
      type: Schema.Types.ObjectId, 
      ref: 'Comment',
      default: null,
      index: true 
    },
    mentions: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    }],
    // --- START: MODIFIED FIELD ---
    // This now matches the { from, to } structure sent from the frontend.
    position: {
      from: { type: Number },
      to: { type: Number }
    },
    // --- END: MODIFIED FIELD ---
    reactions: [{
      user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
      },
      emoji: { 
        type: String, 
        required: true 
      }
    }],
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    }
  },
  { 
    timestamps: true,
    collection: 'comments'
  }
);

// Indexes for better performance
commentSchema.index({ note: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parent: 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ isResolved: 1 });
commentSchema.index({ mentions: 1 });
commentSchema.index({ note: 1, createdAt: -1 }); // Compound index for note comments
