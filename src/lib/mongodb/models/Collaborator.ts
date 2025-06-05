import mongoose from "mongoose";
import { collaboratorSchema } from "../schemas/collaboratorSchema";

export interface ICollaborator extends mongoose.Document {
  user: mongoose.Types.ObjectId | string;
  workspace: mongoose.Types.ObjectId | string;
  role: 'editor' | 'viewer';
  joinedAt: Date;
  lastAccess: Date;
  invitedBy?: mongoose.Types.ObjectId | string;
  status: 'pending' | 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Collaborator || mongoose.model<ICollaborator>("Collaborator", collaboratorSchema); 