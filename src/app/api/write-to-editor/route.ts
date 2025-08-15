import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { content, workspaceId } = await req.json();
    
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Clean the content (remove code block wrappers if present)
    const cleanContent = content
      .trim()
      .replace(/^```(?:markdown)?\s*/i, "")
      .replace(/```$/, "")
      .trim();

    // Broadcast the content to be written with animation
    // This will be handled by the frontend WebSocket or EventSource
    return NextResponse.json({ 
      success: true, 
      content: cleanContent,
      animate: true 
    });
  } catch (error) {
    console.error('Write to editor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}