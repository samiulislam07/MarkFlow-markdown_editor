# Project Structure

```
MarkFlow-markdown_editor/
├── .clerk/                          # Clerk authentication configuration
├── .git/                            # Git version control
├── .next/                           # Next.js build output
├── .partykit/                       # PartyKit configuration and cache
├── node_modules/                    # Node.js dependencies
├── party/                           # PartyKit server files
│   ├── chat.ts                      # Chat server implementation
│   └── index.ts                     # PartyKit server entry point
├── public/                          # Static assets
│   ├── uploads/                     # File uploads directory
│   │   └── *.pdf                    # Uploaded files
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── scripts/                         # Utility scripts
│   └── seed-database.js             # Database seeding script
├── src/                             # Source code
│   ├── __pycache__/                 # Python cache files
│   ├── agent.py                     # AI agent implementation
│   ├── agent_utils.py               # AI agent utilities
│   ├── simple_agent.py              # Simple agent implementation (empty)
│   ├── config/                      # Configuration files
│   │   └── dbConfig.ts              # Database configuration
│   ├── hooks/                       # Custom React hooks
│   │   └── useCommentSelection.ts   # Comment selection hook
│   ├── lib/                         # Library and utility functions
│   │   ├── mongodb/                 # MongoDB related files
│   │   │   ├── connect.ts           # Database connection
│   │   │   ├── models/              # MongoDB models
│   │   │   │   ├── Change.ts        # Change tracking model
│   │   │   │   ├── ChatMessage.ts   # Chat message model
│   │   │   │   ├── Collaborator.ts  # Collaborator model
│   │   │   │   ├── Comment.ts       # Comment model
│   │   │   │   ├── File.ts          # File model
│   │   │   │   ├── Folder.ts        # Folder model
│   │   │   │   ├── Note.ts          # Note model
│   │   │   │   ├── Notification.ts  # Notification model
│   │   │   │   ├── RealTimeSession.ts # Real-time session model
│   │   │   │   ├── Session.ts       # Session model
│   │   │   │   ├── Tag.ts           # Tag model
│   │   │   │   ├── User.ts          # User model
│   │   │   │   ├── Version.ts       # Version model
│   │   │   │   ├── Workspace.ts     # Workspace model
│   │   │   │   └── WorkspaceChat.ts # Workspace chat model
│   │   │   └── schemas/             # MongoDB schemas
│   │   │       ├── changeSchema.ts  # Change schema
│   │   │       ├── collaboratorSchema.ts # Collaborator schema
│   │   │       ├── commentSchema.ts # Comment schema
│   │   │       ├── fileSchema.ts    # File schema
│   │   │       ├── folderSchema.ts  # Folder schema
│   │   │       ├── noteSchema.ts    # Note schema
│   │   │       ├── notificationSchema.ts # Notification schema
│   │   │       ├── sessionSchema.ts # Session schema
│   │   │       ├── tagSchema.ts     # Tag schema
│   │   │       ├── userSchema.ts    # User schema
│   │   │       ├── versionSchema.ts # Version schema
│   │   │       └── workspaceSchema.ts # Workspace schema
│   │   ├── services/                # Service layer
│   │   │   ├── chatService.ts       # Chat service
│   │   │   ├── emailService.ts      # Email service
│   │   │   └── userService.ts       # User service
│   │   ├── supabase.ts              # Supabase configuration
│   │   └── utils.ts                 # Utility functions
│   ├── types/                       # TypeScript type definitions
│   │   ├── comment.ts               # Comment types
│   │   ├── markdown-it-plugins.d.ts # Markdown-it plugins types
│   │   └── sanitize-html.d.ts       # Sanitize HTML types
│   ├── middleware.ts                # Next.js middleware
│   └── app/                         # Next.js App Router
│       ├── api/                     # API routes
│       │   ├── agent/               # AI agent API
│       │   │   └── handle-task/     # Task handling API
│       │   │       └── route.ts
│       │   ├── chat/                # Chat API routes
│       │   │   ├── global/          # Global chat
│       │   │   │   └── route.ts
│       │   │   ├── send/            # Send message
│       │   │   │   └── route.ts
│       │   │   └── workspace/       # Workspace chat
│       │   │       └── route.ts
│       │   ├── comments/            # Comments API
│       │   │   ├── [id]/            # Individual comment
│       │   │   │   └── route.ts
│       │   │   └── route.ts         # Comments list
│       │   ├── files/               # File management API
│       │   │   └── route.ts
│       │   ├── folders/             # Folder management API
│       │   │   └── route.ts
│       │   ├── invitations/         # Invitation API
│       │   │   └── accept/          # Accept invitation
│       │   │       └── route.ts
│       │   ├── notes/               # Notes API
│       │   │   ├── [id]/            # Individual note
│       │   │   │   └── route.ts
│       │   │   └── route.ts         # Notes list
│       │   ├── session/             # Session API
│       │   │   └── routes.ts
│       │   ├── tags/                # Tags API
│       │   │   └── route.ts
│       │   ├── webhooks/            # Webhook handlers
│       │   │   └── clerk/           # Clerk webhooks
│       │   │       └── route.ts
│       │   ├── workspaces/          # Workspaces API
│       │   │   ├── [id]/            # Individual workspace
│       │   │   │   └── invitations/ # Workspace invitations
│       │   │   │       └── route.ts
│       │   │   └── route.ts         # Workspaces list
│       │   └── nowork.md            # API documentation placeholder
│       ├── components/              # React components
│       │   ├── editor/              # Editor-specific components (mostly empty)
│       │   │   ├── hooks/           # Editor hooks (empty files)
│       │   │   │   ├── useAutoSave.ts # Auto-save functionality
│       │   │   │   ├── useWorkspaces.ts # Workspace management
│       │   │   │   └── useYDoc.ts   # Yjs document management
│       │   │   ├── EditorPane.tsx   # Editor pane component (empty)
│       │   │   ├── index.ts         # Editor exports (empty)
│       │   │   ├── MarkdownEditorShell.tsx # Editor shell component (empty)
│       │   │   ├── PreviewPane.tsx  # Preview pane component (empty)
│       │   │   ├── Sidebar.tsx      # Editor sidebar (empty)
│       │   │   └── Toolbar.tsx      # Editor toolbar (empty)
│       │   ├── ChatBox.tsx          # Chat interface component
│       │   ├── ChatLauncher.tsx     # Chat launcher component
│       │   ├── ChatSidebar.tsx      # Chat sidebar component
│       │   ├── CommentButton.tsx    # Comment button component
│       │   ├── CommentSidebar.tsx   # Comment sidebar component
│       │   ├── ConfirmationModal.tsx # Confirmation dialog
│       │   ├── CreateFolderModal.tsx # Folder creation modal
│       │   ├── DashboardDocuments.tsx # Dashboard documents view
│       │   ├── DeleteButton.tsx     # Delete button component
│       │   ├── DocumentSidebar.tsx  # Document sidebar component
│       │   ├── EditorLayout.tsx     # Editor layout component (empty)
│       │   ├── EditorWithSidebar.tsx # Editor with sidebar wrapper
│       │   ├── FileManager.tsx      # File management component
│       │   ├── InvitationManager.tsx # Invitation management
│       │   ├── ItemContextMenu.tsx  # Context menu component
│       │   ├── LatexRenderer.tsx    # LaTeX rendering component
│       │   ├── MergedMarkdownEditor.tsx # Main merged editor
│       │   ├── Navbar.tsx           # Navigation bar component (empty)
│       │   ├── PreviewModal.tsx     # Preview modal component
│       │   ├── UploadFileModal.tsx  # File upload modal
│       │   ├── WorkspaceCollaborators.tsx # Workspace collaborators
│       │   └── WorkspaceSidebar.tsx # Workspace sidebar component (empty)
│       ├── dashboard/               # Dashboard pages
│       │   └── page.tsx             # Main dashboard page
│       ├── editor/                  # Editor pages
│       │   ├── [id]/                # Individual editor
│       │   │   └── page.tsx
│       │   └── page.tsx             # Editor index page
│       ├── invite/                  # Invitation pages
│       │   └── [token]/             # Invitation token page
│       │       └── page.tsx
│       ├── sign-in/                 # Sign-in pages
│       │   └── [[...sign-in]]/      # Clerk sign-in
│       │       └── page.tsx
│       ├── sign-up/                 # Sign-up pages
│       │   └── [[...sign-up]]/      # Clerk sign-up
│       │       └── page.tsx
│       ├── workspace/               # Workspace pages
│       │   └── [id]/                # Individual workspace
│       │       └── page.tsx
│       ├── workspaces/              # Workspaces pages
│       │   ├── new/                 # Create new workspace
│       │   │   ├── NewWorkspaceForm.tsx # New workspace form
│       │   │   └── page.tsx
│       │   └── page.tsx             # Workspaces list page
│       ├── favicon.ico              # Site favicon
│       ├── globals.css              # Global styles
│       ├── layout.tsx               # Root layout component
│       └── page.tsx                 # Home page
├── .env                             # Environment variables
├── .env.local                       # Local environment variables
├── .gitignore                       # Git ignore rules
├── COLLABORATION_SETUP.md           # Collaboration setup guide
├── components.json                  # UI components configuration
├── eslint.config.mjs                # ESLint configuration
├── markflow-prd.md                  # Product requirements document
├── next-env.d.ts                    # Next.js environment types
├── next.config.ts                   # Next.js configuration
├── package-lock.json                # NPM lock file
├── package.json                     # NPM package configuration
├── partykit.json                    # PartyKit configuration
├── postcss.config.mjs               # PostCSS configuration
├── Project-structure.md             # This file
├── README.md                        # Project readme
├── requirements.txt                 # Python dependencies
├── setup_python_env.bat             # Python environment setup script
├── test-markdown.md                 # Test markdown file
├── TESTING_GUIDE.md                 # Testing guide
├── tsconfig.json                    # TypeScript configuration
└── tsconfig.tsbuildinfo             # TypeScript build info
```

## Key Features and Components

### Core Editor
- **MergedMarkdownEditor.tsx**: Main collaborative markdown editor with Yjs integration
- **LatexRenderer.tsx**: LaTeX and math rendering component
- **CommentButton.tsx & CommentSidebar.tsx**: Commenting system components
- **Editor Components**: EditorPane, PreviewPane, Toolbar, and Sidebar components (currently empty placeholder files)

### Collaboration
- **PartyKit Integration**: Real-time collaboration using PartyKit
- **Yjs CRDT**: Conflict-free replicated data types for collaborative editing
- **User Awareness**: Real-time user presence and cursor tracking

### File Management
- **FileManager.tsx**: File and folder management interface
- **UploadFileModal.tsx**: File upload functionality
- **CreateFolderModal.tsx**: Folder creation interface
- **Uploads Directory**: File storage in public/uploads/

### Chat System
- **ChatBox.tsx**: Main chat interface
- **ChatSidebar.tsx**: Chat sidebar component
- **ChatLauncher.tsx**: Chat launcher component

### Workspace Management
- **WorkspaceCollaborators.tsx**: Workspace collaboration management
- **InvitationManager.tsx**: User invitation system
- **DocumentSidebar.tsx**: Document organization sidebar

### Authentication & User Management
- **Clerk Integration**: User authentication and management
- **User Service**: User-related business logic
- **Email Service**: Email notifications and invitations

### Database & Models
- **MongoDB Integration**: Document database with Mongoose ODM
- **Comprehensive Models**: Users, Workspaces, Notes, Comments, Files, etc.
- **Schema Validation**: Type-safe database schemas

### AI Integration
- **Agent System**: AI-powered features and assistance
- **Task Handling**: Automated task processing
- **Python Backend**: AI processing with Python scripts

### UI Components
- **Shadcn/ui Components**: Avatar, Badge, Button, Dropdown Menu, Input, Skeleton
- **Custom Components**: Tailored components for the application

## Development Status

### Completed Components
- Core markdown editor with collaboration
- File management system
- Chat functionality
- Workspace management
- User authentication
- Database models and schemas
- API routes

### In Development/Empty Components
- Editor sub-components (EditorPane, PreviewPane, Toolbar, Sidebar)
- Editor hooks (useAutoSave, useWorkspaces, useYDoc)
- Navigation components (Navbar, WorkspaceSidebar, EditorLayout)
- Simple agent implementation

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: MongoDB with Mongoose
- **Authentication**: Clerk
- **Real-time**: PartyKit, Yjs, WebSockets
- **Collaboration**: CodeMirror 6 with Yjs integration
- **AI**: Python-based agent system
- **UI Library**: Shadcn/ui components
- **Deployment**: Vercel-ready configuration 