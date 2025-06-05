import mongoose from "mongoose";
import { notificationSchema } from "../schemas/notificationSchema";

export interface INotification extends mongoose.Document {
  recipient: mongoose.Types.ObjectId | string;
  type: 'mention' | 'comment' | 'share' | 'update' | 'invite' | 'version';
  content: string;
  relatedNote?: mongoose.Types.ObjectId | string;
  relatedWorkspace?: mongoose.Types.ObjectId | string;
  relatedComment?: mongoose.Types.ObjectId | string;
  sender?: mongoose.Types.ObjectId | string;
  readAt?: Date;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.Notification || mongoose.model<INotification>("Notification", notificationSchema); 