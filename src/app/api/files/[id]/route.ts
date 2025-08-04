import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb/connect';
import File from '@/lib/mongodb/models/File';
import User from '@/lib/mongodb/models/User';
import Workspace, { ICollaborator } from '@/lib/mongodb/models/Workspace';
import Folder from '@/lib/mongodb/models/Folder';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// DELETE - Delete a file
export async function DELETE(request: NextRequest, { params }: { params: any}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = params;

    const file = await File.findById(id);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const workspace = await Workspace.findById(file.workspace);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const hasWriteAccess = workspace.owner.toString() === user._id.toString() ||
      workspace.collaborators.some((collab: ICollaborator) => 
        collab.user.toString() === user._id.toString() && collab.role === 'editor'
      );

    if (!hasWriteAccess) {
      return NextResponse.json({ error: 'You do not have permission to delete this file.' }, { status: 403 });
    }

    // --- START: CORRECTED DELETE LOGIC ---
    // Use the reliable filePath from the database instead of parsing the URL.
    if (file.storageUrl) {
      const { error: deleteError } = await supabase.storage
        .from('uploads')
        .remove([file.storageUrl]);

      if (deleteError) {
        console.error('Supabase deletion failed:', deleteError.message);
        // Even if Supabase fails, we might still want to delete the DB record.
        // For a stricter approach, you could return an error here.
      }
    }
    // --- END: CORRECTED DELETE LOGIC ---

    if (file.folder) {
      await Folder.findByIdAndUpdate(file.folder, { $pull: { files: file._id } });
    }

    await File.findByIdAndDelete(id);

    return NextResponse.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
