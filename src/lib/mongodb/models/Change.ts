import mongoose from "mongoose";
import { changeSchema } from "../schemas/changeSchema";

export interface IChangeMetadata {
  cursor?: {
    line: number;
    character: number;
  };
  selection?: {
    start: number;
    end: number;
  };
  attributes: Record<string, any>;
}

export interface IChange extends mongoose.Document {
  sessionId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  noteId: mongoose.Types.ObjectId | string;
  operation: 'insert' | 'delete' | 'replace' | 'retain';
  position: number;
  content?: string;
  length: number;
  timestamp: Date;
  sequence: number;
  clientId: string;
  acknowledged: boolean;
  metadata: IChangeMetadata;
}

export default mongoose.models.Change || mongoose.model<IChange>("Change", changeSchema); 