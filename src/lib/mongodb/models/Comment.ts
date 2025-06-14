import mongoose from "mongoose";
import { commentSchema } from "../schemas/commentSchema";

export interface ICommentPosition {
  line?: number;
  character?: number;
  selection?: {
    start: number;
    end: number;
  };
}

export interface ICommentReaction {
  user: mongoose.Types.ObjectId | string;
  emoji: string;
}

export interface IComment extends mongoose.Document {
  note: mongoose.Types.ObjectId | string;
  author: mongoose.Types.ObjectId | string;
  content: string;
  isResolved: boolean;
  parent?: mongoose.Types.ObjectId | string;
  mentions: mongoose.Types.ObjectId[] | string[];
  position?: ICommentPosition;
  reactions: ICommentReaction[];
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Comment || mongoose.model<IComment>("Comment", commentSchema); 