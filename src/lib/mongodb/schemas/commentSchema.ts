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
    position: {
      line: { type: Number },
      character: { type: Number },
      selection: {
        start: { type: Number },
        end: { type: Number }
      }
    },
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