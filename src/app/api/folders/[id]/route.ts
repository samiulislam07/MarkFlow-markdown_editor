import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import Folder from '@/lib/mongodb/models/Folder';
import Note from '@/lib/mongodb/models/Note';
import File from '@/lib/mongodb/models/File';
import User from '@/lib/mongodb/models/User';
import Workspace, { ICollaborator } from '@/lib/mongodb/models/Workspace';
import mongoose from 'mongoose';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// --- START: ADDED PUT FUNCTION FOR RENAMING ---
export async function PUT(request: NextRequest, { params }: { params: any}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = params;
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const folder = await Folder.findById(id);
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspace = await Workspace.findById(folder.workspace);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const hasWriteAccess = workspace.owner.toString() === user._id.toString() ||
      workspace.collaborators.some((collab: ICollaborator) => 
        collab.user.toString() === user._id.toString() && collab.role === 'editor'
      );

    if (!hasWriteAccess) {
      return NextResponse.json({ error: 'You do not have permission to rename this folder.' }, { status: 403 });
    }

    folder.name = name;
    await folder.save();

    return NextResponse.json(folder);

  } catch (error) {
    console.error('Error renaming folder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
// --- END: ADDED PUT FUNCTION ---

// Recursive function to delete a folder and all its contents
async function deleteFolderRecursive(folderId: mongoose.Types.ObjectId) {
  const subFolders = await Folder.find({ parent: folderId });
  for (const subFolder of subFolders) {
    await deleteFolderRecursive(subFolder._id);
  }

  const filesInFolder = await File.find({ folder: folderId });
  for (const file of filesInFolder) {
    if (file.storageUrl) {
        await supabase.storage.from('uploads').remove([file.storageUrl]);
    }
    await File.findByIdAndDelete(file._id);
  }
  
  await Note.deleteMany({ folder: folderId });
  await Folder.findByIdAndDelete(folderId);
}


// DELETE - Delete a folder and its contents
export async function DELETE(request: NextRequest, { params }: { params: any }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = params;

    const folder = await Folder.findById(id);
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspace = await Workspace.findById(folder.workspace);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const hasWriteAccess = workspace.owner.toString() === user._id.toString() ||
      workspace.collaborators.some((collab: ICollaborator) => 
        collab.user.toString() === user._id.toString() && collab.role === 'editor'
      );

    if (!hasWriteAccess) {
      return NextResponse.json({ error: 'You do not have permission to delete this folder.' }, { status: 403 });
    }
    
    await deleteFolderRecursive(new mongoose.Types.ObjectId(id));

    return NextResponse.json({ message: 'Folder and its contents deleted successfully' });

  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
