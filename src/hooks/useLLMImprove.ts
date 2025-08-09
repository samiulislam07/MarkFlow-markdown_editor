import { useCallback } from 'react';

export function useLLMImprove() {
  const improve = useCallback(async (text: string, onChunk?: (chunk: string) => void): Promise<string> => {
    const res = await fetch('/api/improve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let improved = '';

    if (!reader) return improved;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      improved += chunk;

      if (onChunk) onChunk(chunk); // real-time update support
    }

    return improved;
  }, []);

  return improve;
}