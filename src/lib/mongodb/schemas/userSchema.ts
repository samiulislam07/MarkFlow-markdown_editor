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
  },
  { 
    timestamps: true,
    collection: 'users'
  }
);

// Indexes for better performance
userSchema.index({ clerkId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 }); 