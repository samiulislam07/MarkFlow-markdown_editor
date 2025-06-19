import { Schema } from 'mongoose';

export const userSchema = new Schema(
  {
    clerkId: { 
      type: String, 
      required: true, 
      unique: true
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

<<<<<<< HEAD
// Indexes for better performance
// Using schema.index() method only, not duplicating with field-level index: true
=======
// Additional indexes for better performance 
>>>>>>> 4a3ae4c5684ee2f3b2a4c4edb2f646edc0902d66
userSchema.index({ clerkId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ isActive: 1 });
userSchema.index({ provider: 1 });
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ 'subscription.status': 1 });