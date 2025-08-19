import mongoose from "mongoose";
import { sessionSchema } from "../schemas/sessionSchema";

export interface ISessionSettings {
  allowAnonymousUsers: boolean;
  maxParticipants: number;
  autoSaveInterval: number;
}

export interface ISessionMetadata {
  totalChanges: number;
  totalParticipants: number;
}

export interface IRealTimeSession extends mongoose.Document {
  sessionId: string;
  noteId: mongoose.Types.ObjectId | string;
  participants: mongoose.Types.ObjectId[] | string[];
  startedAt: Date;
  endedAt?: Date;
  isActive: boolean;
  lastActivity: Date;
  host: mongoose.Types.ObjectId | string;
  settings: ISessionSettings;
  metadata: ISessionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.RealTimeSession || mongoose.model<IRealTimeSession>("RealTimeSession", sessionSchema);