import { Schema } from 'mongoose';

export const changeSchema = new Schema(
  {
    sessionId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Session', 
      required: true,
      index: true 
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    noteId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Note', 
      required: true,
      index: true 
    },
    operation: { 
      type: String, 
      enum: ['insert', 'delete', 'replace', 'retain'], 
      required: true 
    },
    position: { 
      type: Number,
      required: true,
      min: 0 
    },
    content: { 
      type: String,
      default: '' 
    },
    length: {
      type: Number,
      default: 0,
      min: 0
    },
    timestamp: { 
      type: Date,
      default: Date.now,
      index: true 
    },
    sequence: {
      type: Number,
      required: true,
      min: 0
    },
    clientId: {
      type: String,
      required: true,
      index: true
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    metadata: {
      cursor: {
        line: { type: Number },
        character: { type: Number }
      },
      selection: {
        start: { type: Number },
        end: { type: Number }
      },
      attributes: {
        type: Schema.Types.Mixed,
        default: {}
      }
    }
  },
  { 
    timestamps: false, // Using custom timestamp field
    collection: 'changes'
  }
);

// Indexes for better performance
changeSchema.index({ sessionId: 1 });
changeSchema.index({ userId: 1 });
changeSchema.index({ noteId: 1 });
changeSchema.index({ timestamp: 1 });
changeSchema.index({ sequence: 1 });
changeSchema.index({ clientId: 1 });
changeSchema.index({ sessionId: 1, sequence: 1 }); // Compound index for session changes
changeSchema.index({ noteId: 1, timestamp: 1 }); // Compound index for note changes history
changeSchema.index({ sessionId: 1, timestamp: 1 }); // Compound index for session timeline 