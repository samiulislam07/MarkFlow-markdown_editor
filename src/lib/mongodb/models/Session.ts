import { Schema, model, models } from 'mongoose'

const SessionSchema = new Schema({
  clerkSessionId: {
    type: String,
    required: true,
    unique: true
  },
  clerkUserId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'expired'],
    default: 'active'
  },
  lastActiveAt: Date,
  expireAt: Date,
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
})

export const Session = models.Session || model('Session', SessionSchema)