import mongoose from "mongoose";
import { folderSchema } from "../schemas/folderSchema";

export interface IFolder extends mongoose.Document {
  name: string;
  workspace: mongoose.Types.ObjectId | string;
  parent?: mongoose.Types.ObjectId | string;
  creator: mongoose.Types.ObjectId | string;
  notes: mongoose.Types.ObjectId[] | string[];
  isArchived: boolean;
  color: string;
  icon: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Folder || mongoose.model<IFolder>("Folder", folderSchema); 