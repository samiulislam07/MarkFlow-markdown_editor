import { Buffer } from 'buffer';
import { auth } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const formData = await req.formData();

    const openreview_url = formData.get('openreview_url')?.toString();
    const query = formData.get('query')?.toString();
    const pdf = formData.get('pdf') as File;

    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
      });
    }
    let fileBuffer: Buffer;
    if(pdf) 
      fileBuffer = Buffer.from(await pdf.arrayBuffer());
    else
      fileBuffer = Buffer.from('');
    


    const agentForm = new FormData();
    agentForm.append('openreview_url', openreview_url ?? '');
    agentForm.append('query', query);
    agentForm.append(
      'pdf',
      new File([fileBuffer], pdf.name, { type: pdf.type })
    );
    agentForm.append('session_id', userId || 'anonymous'); 

    const response = await fetch('https://mntvh0jb-8000.asse.devtunnels.ms/run-agent', {
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
