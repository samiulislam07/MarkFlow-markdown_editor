// src/lib/mongodb/schemas/folderSchema.ts
import { Schema } from 'mongoose';

export const folderSchema = new Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100 
    },
    workspace: { 
      type: Schema.Types.ObjectId, 
      ref: 'Workspace', 
      required: true
    },
    parent: { 
      type: Schema.Types.ObjectId, 
      ref: 'Folder',
      default: null
    },
    creator: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true
    },
    notes: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'Note' 
    }],
    // START: New field for files
    files: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'File' 
    }],
    // END: New field for files
    isArchived: { 
      type: Boolean, 
      default: false 
    },
    color: { 
      type: String,
      default: '#6366f1',
      match: /^#([0-9A-F]{3}){1,2}$/i
    },
    icon: { 
      type: String,
      default: 'folder',
      trim: true 
    },
    position: { 
      type: Number,
      default: 0 
    }
  },
  { 
    timestamps: true,
    collection: 'folders'
  }
);

folderSchema.index({ workspace: 1 });
folderSchema.index({ parent: 1 });
folderSchema.index({ creator: 1 });
folderSchema.index({ createdAt: -1 });
folderSchema.index({ isArchived: 1 });
folderSchema.index({ workspace: 1, parent: 1 });

folderSchema.pre('save', async function(next) {
  if (this.parent && this.parent.toString() === this._id.toString()) {
    const error = new Error('Folder cannot be its own parent');
    return next(error);
  }
  next();
});