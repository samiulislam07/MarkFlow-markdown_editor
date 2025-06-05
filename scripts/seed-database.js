const mongoose = require('mongoose');

// Connection string (same as in your config)
const MONGODB_URI = "mongodb+srv://osamanadeem:LpeGZf9uCGpZWHFy@cse299.sfplar8.mongodb.net/?retryWrites=true&w=majority&appName=cse299";

// Simple schemas for seeding (without the full model imports)
const userSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: { type: String, default: '' },
  lastLogin: { type: Date, default: Date.now },
  activeSessionId: { type: String, default: null },
}, { timestamps: true, collection: 'users' });

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collaborators: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['editor', 'viewer'], default: 'viewer' },
    joinedAt: { type: Date, default: Date.now }
  }],
  isPersonal: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  settings: {
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    defaultView: { type: String, enum: ['editor', 'preview', 'split'], default: 'split' }
  }
}, { timestamps: true, collection: 'workspaces' });

const folderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }],
  isArchived: { type: Boolean, default: false },
  color: { type: String, default: '#6366f1' },
  icon: { type: String, default: 'folder' },
  position: { type: Number, default: 0 }
}, { timestamps: true, collection: 'folders' });

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, default: '#6366f1' },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, default: '' },
  usageCount: { type: Number, default: 0 }
}, { timestamps: true, collection: 'tags' });

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true, default: '' },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isArchived: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  activeCollaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastEditedAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
  wordCount: { type: Number, default: 0 },
  readingTime: { type: Number, default: 0 },
  permissions: {
    canEdit: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    canView: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    canComment: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  favoritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  position: { type: Number, default: 0 }
}, { timestamps: true, collection: 'notes' });

// Create models
const User = mongoose.model('User', userSchema);
const Workspace = mongoose.model('Workspace', workspaceSchema);
const Folder = mongoose.model('Folder', folderSchema);
const Tag = mongoose.model('Tag', tagSchema);
const Note = mongoose.model('Note', noteSchema);

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      dbName: "markflow",
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Folder.deleteMany({});
    await Tag.deleteMany({});
    await Note.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create sample user
    const sampleUser = await User.create({
      clerkId: 'test_user_123',
      email: 'test@markflow.com',
      name: 'Test User',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
    });
    console.log('👤 Created sample user:', sampleUser.name);

    // Create sample workspace
    const sampleWorkspace = await Workspace.create({
      name: 'My First Workspace',
      description: 'A sample workspace for testing MarkFlow features',
      owner: sampleUser._id,
      isPersonal: true,
      settings: {
        theme: 'dark',
        defaultView: 'split'
      }
    });
    console.log('🏢 Created sample workspace:', sampleWorkspace.name);

    // Create sample tags
    const tag1 = await Tag.create({
      name: 'Important',
      color: '#ef4444',
      workspace: sampleWorkspace._id,
      createdBy: sampleUser._id,
      description: 'High priority items',
      usageCount: 5
    });

    const tag2 = await Tag.create({
      name: 'Research',
      color: '#3b82f6',
      workspace: sampleWorkspace._id,
      createdBy: sampleUser._id,
      description: 'Research related notes',
      usageCount: 3
    });

    const tag3 = await Tag.create({
      name: 'Personal',
      color: '#10b981',
      workspace: sampleWorkspace._id,
      createdBy: sampleUser._id,
      description: 'Personal notes and thoughts',
      usageCount: 2
    });
    console.log('🏷️ Created sample tags');

    // Create sample folder
    const sampleFolder = await Folder.create({
      name: 'Project Documentation',
      workspace: sampleWorkspace._id,
      creator: sampleUser._id,
      color: '#8b5cf6',
      icon: 'folder-open',
      position: 1
    });
    console.log('📁 Created sample folder:', sampleFolder.name);

    // Create sample notes
    const note1 = await Note.create({
      title: 'Welcome to MarkFlow!',
      content: `# Welcome to MarkFlow! 🚀

## Getting Started

MarkFlow is a powerful markdown editor with **real-time collaboration** features. Here are some key features:

### ✨ Features
- **LaTeX Math Support**: Write equations like $E = mc^2$
- **Real-time Collaboration**: Work with your team seamlessly
- **Version Control**: Track changes and revert when needed
- **Advanced Markdown**: Tables, code blocks, and more

### 📝 Markdown Examples

#### Code Block
\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
\`\`\`

#### Table
| Feature | Status | Priority |
|---------|--------|----------|
| LaTeX Support | ✅ Complete | High |
| Live Preview | ✅ Complete | High |
| Real-time Collab | 🚧 In Progress | High |

#### Math Equations
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

> **Note**: This is a sample note to demonstrate MarkFlow's capabilities!

Happy writing! 📖`,
      workspace: sampleWorkspace._id,
      folder: sampleFolder._id,
      author: sampleUser._id,
      lastEditedBy: sampleUser._id,
      tags: [tag1._id, tag2._id],
      isPublic: false,
      wordCount: 120,
      readingTime: 1,
      version: 1
    });

    const note2 = await Note.create({
      title: 'Project Planning Notes',
      content: `# Project Planning 📋

## Phase 1: Setup ✅
- [x] Database configuration
- [x] Authentication setup
- [x] Basic models creation
- [x] API routes implementation

## Phase 2: Core Features 🚧
- [ ] Real-time collaboration
- [ ] Version control system
- [ ] Advanced markdown editor
- [ ] Export functionality

## Phase 3: Polish 📱
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] User testing
- [ ] Documentation

## Notes
Remember to test each feature thoroughly before moving to the next phase.

### Important Links
- [GitHub Repository](https://github.com/example)
- [Design Mockups](https://figma.com/example)
- [API Documentation](https://docs.example.com)`,
      workspace: sampleWorkspace._id,
      folder: sampleFolder._id,
      author: sampleUser._id,
      lastEditedBy: sampleUser._id,
      tags: [tag1._id],
      isPublic: false,
      wordCount: 85,
      readingTime: 1,
      version: 2
    });

    const note3 = await Note.create({
      title: 'Meeting Notes - Team Sync',
      content: `# Team Sync Meeting 🤝
**Date**: ${new Date().toLocaleDateString()}
**Attendees**: Test User, John Doe, Jane Smith

## Agenda
1. Project progress review
2. Upcoming milestones
3. Blockers and solutions

## Key Points
- ✅ Database setup completed successfully
- ✅ Authentication flow working properly
- 🚧 Working on real-time collaboration features
- 📋 Need to finalize UI/UX designs

## Action Items
- [ ] Complete markdown editor component
- [ ] Set up WebSocket for real-time features
- [ ] Design review meeting next week

## Next Meeting
**Date**: Next week
**Focus**: Real-time collaboration demo`,
      workspace: sampleWorkspace._id,
      author: sampleUser._id,
      lastEditedBy: sampleUser._id,
      tags: [tag3._id],
      isPublic: false,
      wordCount: 95,
      readingTime: 1,
      version: 1
    });

    // Update folder with notes
    await Folder.findByIdAndUpdate(sampleFolder._id, {
      notes: [note1._id, note2._id]
    });

    // Update tag usage counts
    await Tag.findByIdAndUpdate(tag1._id, { usageCount: 2 });
    await Tag.findByIdAndUpdate(tag2._id, { usageCount: 1 });
    await Tag.findByIdAndUpdate(tag3._id, { usageCount: 1 });

    console.log('📝 Created sample notes:');
    console.log(`   - ${note1.title}`);
    console.log(`   - ${note2.title}`);
    console.log(`   - ${note3.title}`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: ${await User.countDocuments()}`);
    console.log(`   - Workspaces: ${await Workspace.countDocuments()}`);
    console.log(`   - Folders: ${await Folder.countDocuments()}`);
    console.log(`   - Tags: ${await Tag.countDocuments()}`);
    console.log(`   - Notes: ${await Note.countDocuments()}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeding function
seedDatabase(); 