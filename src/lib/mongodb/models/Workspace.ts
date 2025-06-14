import mongoose from "mongoose";
import { workspaceSchema } from "../schemas/workspaceSchema";

export interface ICollaborator {
  user: mongoose.Types.ObjectId | string;
  role: 'editor' | 'viewer';
  joinedAt: Date;
}

export interface IWorkspaceSettings {
  theme: 'light' | 'dark' | 'auto';
  defaultView: 'editor' | 'preview' | 'split';
}

export interface IWorkspace extends mongoose.Document {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId | string;
  collaborators: ICollaborator[];
  isPersonal: boolean;
  isArchived: boolean;
  settings: IWorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Workspace || mongoose.model<IWorkspace>("Workspace", workspaceSchema); 