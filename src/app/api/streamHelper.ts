import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function getImprovedTextStream(text: string, req: NextRequest): Promise<ReadableStream> {
  const model = genAI.getGenerativeModel({ model: "gemma-3-1b-it" });

  const prompt = `
You are an assistant that rewrites and improves user-written markdown or prose. 
Your response should be in **Markdown only**. 
✅ Be clear and professional.  
🚫 Don't use quotation marks.  
🚫 Don't add anything before or after the text.  
📄 Just provide the improved Markdown content.

Please improve the following text:

${text}
`;

  const result = await model.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const part = chunk.text();
          if (part) {
            controller.enqueue(encoder.encode(part));
          }
        }
      } catch (error) {
        console.error('Streaming Gemini error:', error);
        controller.enqueue(encoder.encode('⚠️ Gemini streaming error.'));
      } finally {
        controller.close();
      }
    },
  });
}
