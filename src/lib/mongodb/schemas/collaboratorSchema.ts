import { Schema } from 'mongoose';

export const collaboratorSchema = new Schema(
  {
    user: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    workspace: { 
      type: Schema.Types.ObjectId, 
      ref: 'Workspace', 
      required: true,
      index: true 
    },
    role: { 
      type: String, 
      enum: ['editor', 'viewer'], 
      required: true,
      default: 'viewer' 
    },
    joinedAt: { 
      type: Date, 
      default: Date.now 
    },
    lastAccess: { 
      type: Date,
      default: Date.now 
    },
    invitedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      index: true 
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended'],
      default: 'active'
    }
  },
  { 
    timestamps: true,
    collection: 'collaborators'
  }
);

// Indexes for better performance
collaboratorSchema.index({ user: 1, workspace: 1 }, { unique: true }); // Prevent duplicate collaborations
collaboratorSchema.index({ workspace: 1 });
collaboratorSchema.index({ user: 1 });
collaboratorSchema.index({ joinedAt: -1 });
collaboratorSchema.index({ lastAccess: -1 }); 