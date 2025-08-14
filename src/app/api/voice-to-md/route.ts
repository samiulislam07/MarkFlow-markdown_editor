import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai';
export const config = {
  api: {
    bodyParser: true,
  },
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  if (request.method !== 'POST') return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });

  const { text } = await request.json();

  try {
    const model = genAI.getGenerativeModel({ model: "gemma-3-1b-it" }); // or gemini-pro

    const chat = model.startChat({ history: [] });

    const result = await chat.sendMessage(`Convert this spoken input into Markdown:\n\n"${text}"`);
    const response = await result.response;
    const markdown = response.text().trim();

    //const data = await gemmaResponse.json();

    //const markdown = data.response || 'Could not generate markdown.';

    return NextResponse.json({ markdown }, { status: 200 });
  } catch (err) {
    console.error('[Gemma3n API Error]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}