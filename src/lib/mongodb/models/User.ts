import mongoose from "mongoose";
import { userSchema } from "../schemas/userSchema";

export interface IUser extends mongoose.Document {
  clerkId: string;
  email: string;
  name: string;
  avatar?: string;
  lastLogin?: Date;
  activeSessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.User || mongoose.model<IUser>("User", userSchema);
