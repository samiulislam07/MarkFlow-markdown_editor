import mongoose from "mongoose";
import { tagSchema } from "../schemas/tagSchema";

export interface ITag extends mongoose.Document {
  name: string;
  color: string;
  workspace: mongoose.Types.ObjectId | string;
  createdBy: mongoose.Types.ObjectId | string;
  description?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Tag || mongoose.model<ITag>("Tag", tagSchema); 