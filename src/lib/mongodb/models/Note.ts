import mongoose from "mongoose";
import { noteSchema } from "../schemas/noteSchema";

export interface INotePermissions {
  canEdit: mongoose.Types.ObjectId[] | string[];
  canView: mongoose.Types.ObjectId[] | string[];
  canComment: mongoose.Types.ObjectId[] | string[];
}

export interface INote extends mongoose.Document {
  title: string;
  content: string;
  workspace: mongoose.Types.ObjectId | string;
  folder?: mongoose.Types.ObjectId | string;
  author: mongoose.Types.ObjectId | string;
  tags: mongoose.Types.ObjectId[] | string[];
  lastEditedBy: mongoose.Types.ObjectId | string;
  isArchived: boolean;
  isPublic: boolean;
  activeCollaborators: mongoose.Types.ObjectId[] | string[];
  lastEditedAt: Date;
  version: number;
  wordCount: number;
  readingTime: number;
  permissions: INotePermissions;
  favoritedBy: mongoose.Types.ObjectId[] | string[];
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Note || mongoose.model<INote>("Note", noteSchema); 