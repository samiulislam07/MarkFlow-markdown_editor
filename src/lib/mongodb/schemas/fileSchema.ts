// src/lib/mongodb/schemas/fileSchema.ts
import { Schema } from 'mongoose';

export const fileSchema = new Schema(
  {
    fileName: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 255 
    },
    storageUrl: { 
      type: String, 
      required: true 
    },
    // --- START: ADDED FIELD ---
    // This will store the exact path within the Supabase bucket (e.g., 'user_id-timestamp-filename.pdf')
    filePath: {
      type: String,
      required: true,
      unique: true
    },
    // --- END: ADDED FIELD ---
    fileType: {
      type: String, 
      required: true 
    },
    fileSize: {
      type: Number, 
      required: true 
    },
    workspace: { 
      type: Schema.Types.ObjectId, 
      ref: 'Workspace', 
      required: true
    },
    folder: {
      type: Schema.Types.ObjectId, 
      ref: 'Folder',
      default: null
    },
    uploader: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true
    },
    isArchived: { 
      type: Boolean, 
      default: false 
    },
  },
  { 
    timestamps: true,
    collection: 'files'
  }
);

fileSchema.index({ workspace: 1, folder: 1 });
fileSchema.index({ uploader: 1 });
