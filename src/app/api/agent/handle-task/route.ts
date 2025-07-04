import { Buffer } from 'buffer';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const openreview_url = formData.get('openreview_url')?.toString();
    const query = formData.get('query')?.toString();
    const pdf = formData.get('pdf') as File;

    if (!openreview_url || !query || !pdf) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
      });
    }

    const fileBuffer = Buffer.from(await pdf.arrayBuffer());

    const agentForm = new FormData();
    agentForm.append('openreview_url', openreview_url);
    agentForm.append('query', query);
    agentForm.append(
      'pdf',
      new File([fileBuffer], pdf.name, { type: pdf.type })
    );

    const response = await fetch('http://127.0.0.1:8000/run-agent', {
      method: 'POST',
      body: agentForm,
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Agent handler error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}
