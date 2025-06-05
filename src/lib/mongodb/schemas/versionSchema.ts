import { Schema } from 'mongoose';

export const versionSchema = new Schema(
  {
    note: { 
      type: Schema.Types.ObjectId, 
      ref: 'Note', 
      required: true,
      index: true 
    },
    content: { 
      type: String, 
      required: true 
    },
    versionNumber: { 
      type: Number, 
      required: true,
      min: 1 
    },
    createdBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    comment: { 
      type: String,
      trim: true,
      maxlength: 500,
      default: '' 
    },
    title: { 
      type: String,
      required: true,
      trim: true 
    },
    tags: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'Tag' 
    }],
    wordCount: { 
      type: Number,
      default: 0 
    },
    changes: {
      added: { type: Number, default: 0 },
      removed: { type: Number, default: 0 },
      modified: { type: Number, default: 0 }
    },
    isAutoSave: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: true,
    collection: 'versions'
  }
);

// Indexes for better performance
versionSchema.index({ note: 1, versionNumber: 1 }, { unique: true }); // Unique version per note
versionSchema.index({ note: 1 });
versionSchema.index({ createdBy: 1 });
versionSchema.index({ createdAt: -1 });
versionSchema.index({ versionNumber: -1 }); 