import { Schema } from 'mongoose';

export const notificationSchema = new Schema(
  {
    recipient: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    type: { 
      type: String, 
      enum: ['mention', 'comment', 'share', 'update', 'invite', 'version'], 
      required: true 
    },
    content: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 500 
    },
    relatedNote: { 
      type: Schema.Types.ObjectId, 
      ref: 'Note',
      index: true 
    },
    relatedWorkspace: { 
      type: Schema.Types.ObjectId, 
      ref: 'Workspace',
      index: true 
    },
    relatedComment: { 
      type: Schema.Types.ObjectId, 
      ref: 'Comment' 
    },
    sender: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      index: true 
    },
    readAt: { 
      type: Date 
    },
    isRead: { 
      type: Boolean, 
      default: false 
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    actionUrl: {
      type: String,
      trim: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  { 
    timestamps: true,
    collection: 'notifications'
  }
);

// Indexes for better performance
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ sender: 1 });
notificationSchema.index({ relatedNote: 1 });
notificationSchema.index({ relatedWorkspace: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 }); // Compound index for unread notifications
notificationSchema.index({ recipient: 1, createdAt: -1 }); // Compound index for user notifications 