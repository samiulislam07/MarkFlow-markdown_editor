import { Schema } from 'mongoose';

export const noteSchema = new Schema(
  {
    title: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 200 
    },
    content: { 
      type: String, 
      required: true,
      default: '' 
    },
    workspace: { 
      type: Schema.Types.ObjectId, 
      ref: 'Workspace', 
      required: true,
      index: true 
    },
    folder: { 
      type: Schema.Types.ObjectId, 
      ref: 'Folder',
      default: null,
      index: true 
    },
    author: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    tags: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'Tag' 
    }],
    lastEditedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User'
    },
    isArchived: { 
      type: Boolean, 
      default: false 
    },
    isPublic: { 
      type: Boolean, 
      default: false 
    },
    
    // Real-time collaboration fields
    activeCollaborators: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    }],
    lastEditedAt: { 
      type: Date,
      default: Date.now 
    },
    version: { 
      type: Number,
      default: 1 
    },
    
    // Content metadata
    wordCount: { 
      type: Number,
      default: 0 
    },
    readingTime: { 
      type: Number, // in minutes
      default: 0 
    },
    
    // Permissions
    permissions: {
      canEdit: [{ 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
      }],
      canView: [{ 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
      }],
      canComment: [{ 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
      }]
    },
    
    // Favorites
    favoritedBy: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    }],
    
    // Position for ordering
    position: { 
      type: Number,
      default: 0 
    }
  },
  { 
    timestamps: true,
    collection: 'notes'
  }
);

// Indexes for better performance
noteSchema.index({ workspace: 1 });
noteSchema.index({ folder: 1 });
noteSchema.index({ author: 1 });
noteSchema.index({ lastEditedBy: 1 });
noteSchema.index({ createdAt: -1 });
noteSchema.index({ updatedAt: -1 });
noteSchema.index({ isArchived: 1 });
noteSchema.index({ tags: 1 });
noteSchema.index({ 'favoritedBy': 1 });
noteSchema.index({ workspace: 1, folder: 1 }); // Compound index
noteSchema.index({ workspace: 1, isArchived: 1 }); // Compound index

// Text search index
noteSchema.index({ 
  title: 'text', 
  content: 'text' 
}, {
  weights: {
    title: 10,
    content: 5
  }
});

// Pre-save middleware to calculate word count and reading time
noteSchema.pre('save', function(next) {
  // Set lastEditedBy to author if not set (for new documents)
  if (this.isNew && !this.lastEditedBy) {
    this.lastEditedBy = this.author;
  }
  
  if (this.isModified('content')) {
    // Calculate word count
    const words = this.content.split(/\s+/).filter(word => word.length > 0);
    this.wordCount = words.length;
    
    // Calculate reading time (assuming 200 words per minute)
    this.readingTime = Math.ceil(this.wordCount / 200);
    
    // Update lastEditedAt
    this.lastEditedAt = new Date();
  }
  next();
}); 