import mongoose from "mongoose";
import { versionSchema } from "../schemas/versionSchema";

export interface IVersionChanges {
  added: number;
  removed: number;
  modified: number;
}

export interface IVersion extends mongoose.Document {
  note: mongoose.Types.ObjectId | string;
  content: string;
  versionNumber: number;
  createdBy: mongoose.Types.ObjectId | string;
  comment?: string;
  title: string;
  tags: mongoose.Types.ObjectId[] | string[];
  wordCount: number;
  changes: IVersionChanges;
  isAutoSave: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Version || mongoose.model<IVersion>("Version", versionSchema); 