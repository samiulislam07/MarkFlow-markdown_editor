import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  clerkSessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  clerkUserId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'expired'],
    default: 'active'
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  expireAt: {
    type: Date
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  deviceInfo: {
    browser: String,
    os: String,
    device: String
  },
  location: {
    country: String,
    city: String,
    region: String
  }
}, {
  timestamps: true,
  collection: 'clerk_sessions'
});

// Indexes for better performance
sessionSchema.index({ clerkSessionId: 1 });
sessionSchema.index({ clerkUserId: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ lastActiveAt: -1 });
sessionSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export interface ISession extends mongoose.Document {
  clerkSessionId: string;
  clerkUserId: string;
  status: 'active' | 'ended' | 'expired';
  lastActiveAt: Date;
  expireAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
  };
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export const Session = mongoose.models.Session || mongoose.model<ISession>('Session', sessionSchema);