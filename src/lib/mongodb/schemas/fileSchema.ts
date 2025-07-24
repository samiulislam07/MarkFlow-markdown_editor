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
    // The URL pointing to the file in your storage provider (e.g., Vercel Blob, S3)
    storageUrl: { 
      type: String, 
      required: true 
    },
    fileType: { // MIME type, e.g., 'application/pdf' or 'image/png'
      type: String, 
      required: true 
    },
    fileSize: { // Size in bytes
      type: Number, 
      required: true 
    },
    workspace: { 
      type: Schema.Types.ObjectId, 
      ref: 'Workspace', 
      required: true
    },
    folder: { // The folder this file belongs to
      type: Schema.Types.ObjectId, 
      ref: 'Folder',
      default: null // null for root files in a workspace
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