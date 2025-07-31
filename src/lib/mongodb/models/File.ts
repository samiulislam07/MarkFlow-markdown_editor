// src/lib/mongodb/models/File.ts
import mongoose, { Document, Model } from 'mongoose';
import { fileSchema } from '../schemas/fileSchema';

export interface IFile extends Document {
  fileName: string;
  storageUrl: string;
  fileType: string;
  fileSize: number;
  workspace: mongoose.Schema.Types.ObjectId;
  folder: mongoose.Schema.Types.ObjectId | null;
  uploader: mongoose.Schema.Types.ObjectId;
  isArchived: boolean;
}

const File: Model<IFile> = mongoose.models.File || mongoose.model<IFile>('File', fileSchema);

export default File;