import { Schema } from 'mongoose';

export const userSchema = new Schema(
  {
    clerkId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true 
    },
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    username: {
      type: String,
      trim: true,
      sparse: true,
      unique: true
    },
    avatar: { 
      type: String,
      default: '' 
    },
    lastLogin: { 
      type: Date,
      default: Date.now 
    },
    activeSessionId: { 
      type: String,
      default: null 
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    provider: {
      type: String,
      enum: ['email', 'google', 'github', 'microsoft'],
      default: 'email'
    },
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto'
      },
      language: {
        type: String,
        default: 'en'
      },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        mentions: { type: Boolean, default: true },
        comments: { type: Boolean, default: true }
      }
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'pro', 'team', 'enterprise'],
        default: 'free'
      },
      status: {
        type: String,
        enum: ['active', 'cancelled', 'expired', 'trial'],
        default: 'active'
      },
      expiresAt: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { 
    timestamps: true,
    collection: 'users'
  }
);

// Indexes for better performance
userSchema.index({ clerkId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ isActive: 1 });
userSchema.index({ provider: 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ 'subscription.status': 1 }); 