export type IELTSPart = 'part1' | 'part2' | 'part3';

interface GenerationContext {
  question: string;
  cueCard?: string;
  chineseLogic?: string;
  storyDetails?: string;
  preferredStyle?: string;
  age?: string | number;
  gender?: string;
  targetBand?: number;
}

async function callGenerateAPI(payload: Record<string, unknown>): Promise<string> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.result;
}

export async function generateGeminiIA(
  type: 'script' | 'translation' | 'vocab' | 'coaching',
  part: IELTSPart,
  context: GenerationContext,
  instruction?: string
): Promise<string> {
  return callGenerateAPI({ type, part, context, instruction });
}

export async function analyzeMockExam(fullTranscript: { label: string; text: string }[]): Promise<Record<string, string> | null> {
  try {
    const result = await callGenerateAPI({ type: 'assessment', fullTranscript });
    return result as unknown as Record<string, string>;
  } catch (e) {
    console.error("Failed to analyze mock exam", e);
    return null;
  }
}
