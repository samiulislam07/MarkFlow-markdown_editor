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
