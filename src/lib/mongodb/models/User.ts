import mongoose from "mongoose";
import { userSchema } from "../schemas/userSchema";

export interface IUserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    mentions: boolean;
    comments: boolean;
  };
}

export interface IUserSubscription {
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  expiresAt?: Date;
}

export interface IUser extends mongoose.Document {
  clerkId: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatar?: string;
  lastLogin?: Date;
  activeSessionId?: string;
  emailVerified: boolean;
  provider: 'email' | 'google' | 'github' | 'microsoft';
  preferences: IUserPreferences;
  subscription: IUserSubscription;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.models.User || mongoose.model<IUser>("User", userSchema);
