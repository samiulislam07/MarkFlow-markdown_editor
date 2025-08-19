import { Schema } from 'mongoose';

export const tagSchema = new Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 50 
    },
    color: { 
      type: String,
      default: '#6366f1', // Default indigo color
      match: /^#([0-9A-F]{3}){1,2}$/i // Hex color validation
    },
    workspace: { 
      type: Schema.Types.ObjectId, 
      ref: 'Workspace', 
      required: true,
      index: true 
    },
    createdBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    description: { 
      type: String,
      trim: true,
      maxlength: 200,
      default: '' 
    },
    usageCount: { 
      type: Number,
      default: 0 
    }
  },
  { 
    timestamps: true,
    collection: 'tags'
  }
);

// Indexes for better performance
tagSchema.index({ workspace: 1 });
tagSchema.index({ createdBy: 1 });
tagSchema.index({ name: 1, workspace: 1 }, { unique: true }); // Unique name per workspace
tagSchema.index({ createdAt: -1 });
tagSchema.index({ usageCount: -1 });

// Text search index for tag names
tagSchema.index({ name: 'text' }); 