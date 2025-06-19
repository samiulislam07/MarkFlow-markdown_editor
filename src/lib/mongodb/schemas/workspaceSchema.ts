import { Schema } from 'mongoose';

export const workspaceSchema = new Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100 
    },
    description: { 
      type: String,
      trim: true,
      maxlength: 500,
      default: '' 
    },
    owner: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true
    },
    collaborators: [{
      user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
      },
      role: { 
        type: String, 
        enum: ['editor', 'viewer'], 
        default: 'viewer' 
      },
      joinedAt: { 
        type: Date, 
        default: Date.now 
      }
    }],
    isPersonal: { 
      type: Boolean, 
      default: false 
    },
    isArchived: { 
      type: Boolean, 
      default: false 
    },
    settings: {
      theme: { 
        type: String, 
        enum: ['light', 'dark', 'auto'], 
        default: 'auto' 
      },
      defaultView: { 
        type: String, 
        enum: ['editor', 'preview', 'split'], 
        default: 'split' 
      }
    }
  },
  { 
    timestamps: true,
    collection: 'workspaces'
  }
);

// Indexes for better performance
// Using schema.index() method only, not duplicating with field-level index: true
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'collaborators.user': 1 });
workspaceSchema.index({ createdAt: -1 });
workspaceSchema.index({ isArchived: 1 });