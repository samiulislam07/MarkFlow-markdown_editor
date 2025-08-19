import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import * as fs from "node:fs"; // if needed

export async function POST(req: NextRequest) {
  const { imageUrl } = await req.json();
  if (!imageUrl) {
    return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
  }

  try {
    // Step 1: Fetch image and encode as base64
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error('Failed to fetch image');
    }
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    const base64Data = buffer.toString('base64');

    // Step 2: Call Gemini API (Imagen) for captioning
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const contents = [
      { inlineData: { mimeType: "image/jpeg", data: base64Data } },
      { text: "Describe this image in detail, mentioning people, objects, scene, and any visible genders." }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // or choose an appropriate multimodal model
      contents,
    });

    const description = response.text || "No description generated.";

    return NextResponse.json({ description });
  } catch (err: any) {
    console.error("Error describing image:", err);
    return NextResponse.json({ error: 'Failed to describe image' }, { status: 500 });
  }
}
