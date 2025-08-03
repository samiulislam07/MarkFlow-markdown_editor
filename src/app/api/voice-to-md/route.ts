import { NextRequest, NextResponse } from 'next/server'
export const config = {
  api: {
    bodyParser: true,
  },
};

export async function POST(request: NextRequest) {
  if (request.method !== 'POST') return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });

  const { text } = await request.json();

  try {
    const gemmaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3n',
        prompt: `Convert this spoken input into Markdown:\n\n"${text}"`,
        stream: false,
      }),
    });

    const data = await gemmaResponse.json();

    const markdown = data.response || 'Could not generate markdown.';

    return NextResponse.json({ markdown }, { status: 200 });
  } catch (err) {
    console.error('[Gemma3n API Error]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}