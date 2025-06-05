# 🧪 MarkFlow Database Testing Guide

This guide will help you test your MongoDB setup and verify that all models and API routes are working correctly.

## 📋 Prerequisites

1. **MongoDB Connection**: Ensure your MongoDB Atlas cluster is running
2. **Environment Variables**: Make sure your `.env.local` file contains:
   ```env
   MONGODB_URI=mongodb+srv://osamanadeem:LpeGZf9uCGpZWHFy@cse299.sfplar8.mongodb.net/?retryWrites=true&w=majority&appName=cse299
   ```
3. **Dependencies**: Install Node.js dependencies:
   ```bash
   npm install
   ```

## 🗄️ Method 1: Database Seeding (Recommended)

### Step 1: Run the Database Seeding Script

```bash
# Option 1: Using npm script
npm run seed

# Option 2: Direct execution
node scripts/seed-database.js
```

### Expected Output:
```
✅ Connected to MongoDB
🧹 Cleared existing data
👤 Created sample user: Test User
🏢 Created sample workspace: My First Workspace
🏷️ Created sample tags
📁 Created sample folder: Project Documentation
📝 Created sample notes:
   - Welcome to MarkFlow!
   - Project Planning Notes
   - Meeting Notes - Team Sync

🎉 Database seeded successfully!

📊 Summary:
   - Users: 1
   - Workspaces: 1
   - Folders: 1
   - Tags: 3
   - Notes: 3
🔌 Database connection closed
```

## 🌐 Method 2: API Testing (Requires Authentication)

### Step 1: Start the Development Server

```bash
npm run dev
```

### Step 2: Set Up Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Get your API keys and add them to `.env.local`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

### Step 3: Create a User Account

1. Visit `http://localhost:3000`
2. Click "Sign Up" and create an account
3. Complete the sign-up process

### Step 4: Test API Endpoints

#### Using VS Code REST Client:
1. Install the "REST Client" extension
2. Open `scripts/test-api.http`
3. Replace the variables with actual IDs from your database
4. Click "Send Request" on any endpoint

#### Using Postman:
1. Import the requests from `scripts/test-api.http`
2. Set up your environment variables
3. Send requests to test functionality

#### Using cURL:
```bash
# Example: Get workspaces
curl -X GET "http://localhost:3000/api/workspaces" \
  -H "Content-Type: application/json"

# Example: Create a note
curl -X POST "http://localhost:3000/api/notes" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Note",
    "content": "# Hello World\nThis is a test note!",
    "workspaceId": "YOUR_WORKSPACE_ID"
  }'
```

## 🗄️ Checking Data in MongoDB Atlas

### Step 1: Access MongoDB Atlas Dashboard

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Sign in with your credentials
3. Navigate to your `cse299` cluster

### Step 2: Browse Collections

1. Click "Browse Collections"
2. Select the `markflow` database
3. You should see these collections:
   - `users`
   - `workspaces`
   - `notes`
   - `folders`
   - `tags`

### Step 3: Verify Sample Data

#### Users Collection:
```json
{
  "_id": "ObjectId(...)",
  "clerkId": "test_user_123",
  "email": "test@markflow.com",
  "name": "Test User",
  "avatar": "https://images.unsplash.com/...",
  "lastLogin": "2024-01-01T00:00:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Notes Collection:
```json
{
  "_id": "ObjectId(...)",
  "title": "Welcome to MarkFlow!",
  "content": "# Welcome to MarkFlow! 🚀\n\n## Getting Started...",
  "workspace": "ObjectId(...)",
  "folder": "ObjectId(...)",
  "author": "ObjectId(...)",
  "tags": ["ObjectId(...)", "ObjectId(...)"],
  "wordCount": 120,
  "readingTime": 1,
  "version": 1,
  "isArchived": false,
  "isPublic": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## 🔍 Sample Data Overview

The seeding script creates:

### 📊 1 User:
- **Name**: Test User
- **Email**: test@markflow.com
- **Clerk ID**: test_user_123

### 🏢 1 Workspace:
- **Name**: My First Workspace
- **Description**: A sample workspace for testing MarkFlow features
- **Type**: Personal workspace
- **Theme**: Dark mode
- **Default View**: Split view

### 📁 1 Folder:
- **Name**: Project Documentation
- **Color**: Purple (#8b5cf6)
- **Icon**: folder-open
- **Contains**: 2 notes

### 🏷️ 3 Tags:
1. **Important** (Red) - High priority items
2. **Research** (Blue) - Research related notes
3. **Personal** (Green) - Personal notes and thoughts

### 📝 3 Notes:
1. **Welcome to MarkFlow!** - Feature overview with markdown examples
2. **Project Planning Notes** - Development phases and tasks
3. **Meeting Notes - Team Sync** - Sample meeting notes

## ✅ Verification Checklist

- [ ] Database seeding script runs without errors
- [ ] All 5 collections are created in MongoDB Atlas
- [ ] Sample data is visible in MongoDB Atlas dashboard
- [ ] API endpoints respond correctly (if testing with authentication)
- [ ] Notes contain proper markdown content
- [ ] Relationships between models are correctly established (folder contains notes, notes have tags, etc.)

## 🚨 Troubleshooting

### Connection Issues:
```
❌ Error: connect ENOTFOUND
```
**Solution**: Check your internet connection and MongoDB URI

### Authentication Issues:
```
❌ Error: Unauthorized
```
**Solution**: Ensure you're signed in and have valid Clerk tokens

### Schema Validation Errors:
```
❌ Error: Path `title` is required
```
**Solution**: Check that all required fields are provided in your requests

### Duplicate Key Errors:
```
❌ Error: E11000 duplicate key error
```
**Solution**: Clear the database before re-seeding or use unique values

## 🎯 Next Steps

Once your database testing is successful:

1. **Build Frontend Components**: Create React components to display and interact with this data
2. **Implement Real-time Features**: Add WebSocket support for collaborative editing
3. **Add File Upload**: Implement image and file attachment features
4. **Create Export Functions**: Build PDF and other format export capabilities
5. **Performance Optimization**: Add caching and optimize database queries

## 📞 Need Help?

If you encounter any issues:

1. Check the console output for detailed error messages
2. Verify your MongoDB connection string
3. Ensure all required environment variables are set
4. Check that your MongoDB Atlas cluster is active and accessible

Happy testing! 🚀 