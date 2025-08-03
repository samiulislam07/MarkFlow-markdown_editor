import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch'; // only if not globally available

export async function POST(req: NextRequest) {
  const { imageUrl } = await req.json();

  if (!imageUrl) {
    return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
  }

  try {
    // Step 1: Download the image
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error('Failed to fetch image from Supabase URL');
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    // Step 2: Send to Gemma3n multimodal API
    const gemmaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3n',
        prompt: 'Describe this image in detail. Mention people, objects, gender, and scene.',
        images: [base64Image],
        stream: false,
      }),
    });

    console.log('Gemma3n response:', gemmaRes.status, gemmaRes.statusText);
    const data = (await gemmaRes.json()) as { response?: string };
    const description = data.response || 'No description generated.';

    return NextResponse.json({ description });
  } catch (err: any) {
    console.error('Error describing image:', err);
    return NextResponse.json({ error: 'Failed to describe image' }, { status: 500 });
  }
}