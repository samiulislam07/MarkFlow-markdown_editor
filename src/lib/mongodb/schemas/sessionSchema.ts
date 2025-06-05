import { Schema } from 'mongoose';

export const sessionSchema = new Schema(
  {
    sessionId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true 
    },
    noteId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Note', 
      required: true,
      index: true 
    },
    participants: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    }],
    startedAt: { 
      type: Date,
      default: Date.now 
    },
    endedAt: { 
      type: Date 
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    host: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: true,
      index: true 
    },
    settings: {
      allowAnonymousUsers: {
        type: Boolean,
        default: false
      },
      maxParticipants: {
        type: Number,
        default: 10,
        min: 1,
        max: 50
      },
      autoSaveInterval: {
        type: Number,
        default: 30000 // 30 seconds
      }
    },
    metadata: {
      totalChanges: {
        type: Number,
        default: 0
      },
      totalParticipants: {
        type: Number,
        default: 0
      }
    }
  },
  { 
    timestamps: true,
    collection: 'sessions'
  }
);

// Indexes for better performance
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ noteId: 1 });
sessionSchema.index({ host: 1 });
sessionSchema.index({ participants: 1 });
sessionSchema.index({ isActive: 1 });
sessionSchema.index({ startedAt: -1 });
sessionSchema.index({ lastActivity: -1 });
sessionSchema.index({ noteId: 1, isActive: 1 }); // Compound index for active note sessions 