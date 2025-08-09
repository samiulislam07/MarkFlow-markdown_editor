# MarkFlow - Real-Time Collaborative Markdown Editor

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.17-green?style=flat&logo=mongodb)](https://www.mongodb.com/)
[![PartyKit](https://img.shields.io/badge/PartyKit-0.0.115-purple?style=flat)](https://partykit.io/)

**MarkFlow** is a comprehensive, real-time collaborative markdown editor designed for modern knowledge work. It combines the power of real-time collaboration, AI assistance, and advanced document management to create a seamless writing and editing experience for teams and individuals.

## ✨ Key Features

### 🔄 Real-Time Collaborative Editing
- **Google Docs-like Collaboration**: Multiple users can edit the same document simultaneously
- **Live Cursor Tracking**: See other users' cursors and selections in real-time
- **Conflict Resolution**: Automatic merge conflict resolution using Yjs CRDT
- **User Awareness**: Real-time display of active users with avatars and status
- **Instant Synchronization**: Changes appear across all connected users immediately

### 📝 Advanced Markdown Editor
- **CodeMirror 6 Integration**: Modern, performant text editor with syntax highlighting
- **LaTeX/MathJax Support**: Full mathematical equation rendering with `$` and `$$` syntax
- **Live Preview**: Real-time markdown rendering with split-screen view
- **Enhanced Markdown**: Support for footnotes, abbreviations, subscripts, superscripts
- **Auto-Save**: Automatic document saving every 3 seconds
- **Dark/Light Themes**: Toggle between themes with collaborative compatibility
- **Export Options**: PDF, DOCX, and HTML export capabilities

### 🗂️ Workspace & File Management
- **Multi-Workspace Support**: Organize documents into separate workspaces
- **Hierarchical Folder Structure**: Nested folder organization with drag-and-drop
- **File Upload & Management**: Support for various file types with cloud storage
- **Document Organization**: Tags, favorites, and advanced filtering
- **Breadcrumb Navigation**: Easy navigation through folder hierarchies

### 👥 Collaboration & Team Features
- **Role-Based Permissions**: Owner, Editor, Commenter, Viewer roles
- **Invitation System**: Email-based workspace invitations with role assignment
- **Real-Time Chat**: Built-in chat system for workspace communication
- **Comment System**: Inline commenting with thread support and resolution
- **User Management**: Add, remove, and manage workspace collaborators

### 🤖 AI-Powered Features
- **Research Assistant Agent**: AI-powered help for academic writing and research
- **OpenReview Integration**: Automated review analysis and rebuttal generation
- **PDF Processing**: Extract and analyze content from uploaded PDFs
- **Semantic Search**: Vector-based document search using embeddings
- **Conversation Memory**: Persistent chat history with context awareness

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Clerk account for authentication
- PartyKit account for real-time features

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/samiulislam07/MarkFlow-markdown_editor.git
   cd MarkFlow-markdown_editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file with the following variables:
   ```env
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   
   # MongoDB
   MONGODB_URI=your_mongodb_connection_string
   
   # PartyKit
   PARTYKIT_URL=your_partykit_url
   
   # Email Service (for invitations)
   EMAIL_SERVER_HOST=your_email_host
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=your_email_user
   EMAIL_SERVER_PASS=your_email_password
   ```

4. **Start the development servers**
   ```bash
   # Terminal 1: Start PartyKit server for real-time collaboration
   npm run party:dev
   
   # Terminal 2: Start Next.js development server
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

### Frontend Stack
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4 with custom components
- **State Management**: React hooks with Yjs for collaborative state
- **Real-Time**: PartyKit with WebSocket connections
- **Editor**: CodeMirror 6 with Yjs integration

### Backend Stack
- **Runtime**: Node.js with Next.js API routes
- **Database**: MongoDB with Mongoose ODM
- **Real-Time Server**: PartyKit for WebSocket management
- **AI Backend**: Python FastAPI with LangChain/LangGraph
- **Authentication**: Clerk for user management
- **File Storage**: Cloud storage integration

### Collaboration Technology
- **CRDT**: Yjs for conflict-free replicated data types
- **Real-Time Sync**: PartyKit with Yjs integration
- **User Awareness**: Real-time cursor and selection tracking
- **Document Persistence**: Automatic saving and version management

## 📁 Project Structure

```
MarkFlow-markdown_editor/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── components/        # React components
│   │   │   ├── editor/        # Editor components
│   │   │   └── ui/           # UI components
│   │   └── ...               # Pages and layouts
│   ├── lib/                   # Utilities and services
│   │   ├── mongodb/          # Database models and schemas
│   │   └── services/         # Business logic services
│   └── types/                # TypeScript type definitions
├── party/                     # PartyKit real-time server
├── public/                    # Static assets
└── scripts/                   # Utility scripts
```

## 🧪 Testing Collaboration

1. **Start both servers** (see Quick Start above)

2. **Open multiple browser windows/tabs** with the same document URL

3. **Test real-time features**:
   - Type simultaneously in different windows
   - Watch cursors move in real-time
   - See user avatars and connection status
   - Test collaborative title editing

## 📚 Documentation

- [Product Requirements Document](./markflow-prd.md) - Detailed feature specifications
- [Project Structure](./Project-structure.md) - Complete file organization
- [Collaboration Setup](./COLLABORATION_SETUP.md) - Real-time features guide
- [Testing Guide](./TESTING_GUIDE.md) - Comprehensive testing instructions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [PartyKit](https://partykit.io/) - Real-time server
- [Yjs](https://github.com/yjs/yjs) - CRDT implementation
- [CodeMirror](https://codemirror.net/) - Text editor
- [Clerk](https://clerk.com/) - Authentication
- [MongoDB](https://www.mongodb.com/) - Database

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/samiulislam07/MarkFlow-markdown_editor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/samiulislam07/MarkFlow-markdown_editor/discussions)

---

Built with ❤️ for collaborative knowledge work
Youtube Video:


[![Watch the video](https://img.youtube.com/vi/ZwIchsSFEnQ/0.jpg)](https://www.youtube.com/watch?v=ZwIchsSFEnQ)

Techinical Writeup: 
https://docs.google.com/document/d/1TqWF61LIM4rF_VNnWfnAxLj-FW5AtBY2_iKyBRCeZgo/edit?usp=sharing


# MarkFlow - Real-Time Collaborative Markdown Editor with Built-in AI

**MarkFlow** is a modern, real-time collaborative markdown editor designed for seamless team writing, research, and documentation. What sets it apart is its **deep integration of AI capabilities powered by the blazing-fast Gemma3n model**, enabling smart writing assistance, voice input, PDF analysis, and semantic understanding — all directly within the editor.


## ✨ Key Features

### 🔄 Real-Time Collaborative Editing

* **Google Docs-like Experience**: Multiple users editing with live updates
* **Live Cursors & User Awareness**: Avatars, selections, and user status
* **CRDT Conflict Resolution**: Powered by **Yjs** for smooth collaboration
* **Zero-latency Sync**: Built with **PartyKit WebSocket** backend

### 📝 Powerful Markdown Editor

* **CodeMirror 6**: Fast, responsive editing with syntax highlighting
* **Katex**: Write and preview complex math with `$...$`
* **Split-View Live Preview**: See rendered markdown side-by-side
* **Enhanced Markdown Extensions**: Footnotes, tables, superscripts, etc.
* **Auto Save + Export**: Every 3s autosave + PDF, DOCX, HTML export
* **Themes**: Collaborative dark/light theme support

---

### 🤖 AI-Powered Features (Gemma3n )

MarkFlow integrates **Gemma3n**:

* 🧠 **Intelligent Text Improvement**: Rewrite, summarize, extend, or clarify any section of your markdown
* 🎤 **Voice-to-Text**: Convert your speech to text directly in the editor
* 📄 **PDF Analysis**: Upload PDFs and ask questions or extract insights instantly
* 🔎 **Semantic Search**: Search documents with meaning, not just keywords
* 🧩 **Streaming AI Responses**: Instant feedback and insertion into markdown
* 🧬 **Contextual Memory**: Conversation history retained for relevant replies
* 🧾 **Research + Rebuttal Assistant**: Generate rebuttals, reviews, and summaries from academic content


### 👥 Collaboration & Team Features

* **Roles**: Owner, Editor, Viewer, Commenter
* **Invitations**: Email invites with role control
* **Real-Time Chat**: Built-in messaging for discussions
* **Inline Comments**: Comment, reply, and resolve directly in text
* **Workspace Management**: Create multiple teams/projects

### 🗂️ File & Workspace Organization

* Hierarchical folders with drag-and-drop
* Tagging, favorites, and smart filters
* Breadcrumb navigation and file preview
* Upload & store DOCX, PDF, images, and more


### 🏗️ Architecture Snapshot

**Frontend**

* **Next.js 15** + **React 19**
* **Tailwind CSS 4**
* **CodeMirror 6** + **Yjs** for CRDT sync

**Backend**

* **Node.js** with **Next.js API routes**
* **MongoDB** for storage
* **PartyKit** for real-time sync
* **Clerk** for auth
* **FastAPI (Python)** for AI logic


**Visit:** [https://markflow-0t0g.onrender.com]

Wait for a few minutes as the web application reboots as it is deployed using a free tier on render.
Join as Guest using "Continue as a guest button" to explore all features. 
Create a document and explore the AI features implemented.

**The statistics of the number of active users and documents created are not real.Those are for placeholders only.**

## 🧪 Test Collaboration

Open two browser windows with the same doc — observe:

* Real-time typing
* Live cursors + avatars
* Title sync + inline comments


Built with ❤️ for **collaborative, AI-powered knowledge work** — made better by **Gemma3n on Ollama**.
