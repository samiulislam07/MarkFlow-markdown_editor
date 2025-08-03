import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableSequence } from '@langchain/core/runnables';
import { NextRequest, NextResponse } from 'next/server';


export async function getImprovedTextStream(text: string, req: NextRequest): Promise<ReadableStream> {
  const model = new ChatOllama({
    baseUrl: 'http://localhost:11434',
    model: 'gemma3n:latest',
    temperature: 0.7,
  });

  const chain = RunnableSequence.from([
    async (input: string) => [
      new SystemMessage(
        'You are an assistant that rewrites and improves user-written markdown or prose Your response should be in MARKDOWN AS WELL. Be clear, and professional. DONT USE QUOTATION. DONT ADD ANYTHING TO THE END OR START JUST PROVIDE THE IMROVED TEXT IN MARKDOWN SO I CAN PLACE DIRECTLY'
      ),
      new HumanMessage(`Please improve the following text:\n\n"${input}"`),
    ],
    model,
  ]);

  const stream = await chain.stream(text);

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        let content = chunk?.content ?? '';
        if (Array.isArray(content)) {
          content = content.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join(' ');
        } else if (typeof content !== 'string') {
          content = String(content);
        }
        controller.enqueue(encoder.encode(content));
      }
      controller.close();
    },
  });
}