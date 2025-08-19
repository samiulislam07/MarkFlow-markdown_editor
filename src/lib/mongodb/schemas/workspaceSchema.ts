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
        enum: ['editor', 'commenter', 'viewer'], 
        default: 'viewer' 
      },
      joinedAt: { 
        type: Date, 
        default: Date.now 
      }
    }],
    invitations: [{
      email: { 
        type: String, 
        required: true,
        lowercase: true,
        trim: true 
      },
      role: { 
        type: String, 
        enum: ['editor', 'commenter', 'viewer'], 
        default: 'viewer' 
      },
      invitedBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
      },
      invitedAt: { 
        type: Date, 
        default: Date.now 
      },
      status: { 
        type: String, 
        enum: ['pending', 'accepted', 'declined', 'expired'], 
        default: 'pending' 
      },
      token: { 
        type: String, 
        required: true
      },
      expiresAt: { 
        type: Date, 
        required: true 
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

// Additional indexes for better performance
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'collaborators.user': 1 });
workspaceSchema.index({ createdAt: -1 });
workspaceSchema.index({ isArchived: 1 });