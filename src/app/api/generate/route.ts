import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

const SYSTEM_PROMPTS: Record<string, string> = {
  part1: `You are a professional IELTS Speaking Coach. 
Generate a High-Band (7.0+) answer for an IELTS Part 1 question. 
RULES:
1. Length: 4-6 sentences.
2. Tone: Conversational, personal, and natural. Avoid sounding like an essay.
3. Content: Do NOT repeat the question. Directly address it then expand.
4. Voice: Use candidate-appropriate vocabulary (not overly academic, but showing range).
5. Logic: If 'Chinese Logic' is provided, strictly follow those specific points to form the answer.`,

  part2: `You are a professional IELTS Speaking Coach. 
Generate a 2-minute speaking script for an IELTS Part 2 'Long Turn' topic.
RULES:
1. Coverage: You MUST address all bullet points in the Cue Card.
2. Structure: Introduction, personal narrative, and concluding thought.
3. Content: Use vivid descriptive language. If 'Story Details' or 'Chinese Logic' are provided, incorporate them deeply.
4. Tone: Narrative and engaging. 
5. Indicators: Use common fillers naturally (e.g., 'Well...', 'I remember...', 'To be honest...') but sparingly.`,

  part3: `You are a professional IELTS Speaking Coach. 
Generate a High-Band (7.5+) answer for an IELTS Part 3 'Abstract Discussion' question.
RULES:
1. Tone: Analytical and abstract. Zoom out from the personal to the societal or global level.
2. Structure: State opinion, explain 'Why', give an example, and consider an alternative or concluding nuance.
3. Vocabulary: Use sophisticated topic-specific vocabulary and complex grammatical structures.
4. Logic: If 'Chinese Logic' is provided, use it as the structural backbone.`,

  translation: `Translate the provided English IELTS script into natural, slightly informal Chinese. It should sound like what a Chinese student would naturally use to capture the meaning and feeling of the English response.`,

  vocab: `Extract 3-5 high-value idioms, collocations, or advanced phrases from the English text. Provide a Chinese translation for each. Format: 'Phrase - Translation'. Each on a new line.`,

  coaching: `Act as an IELTS Examiner. Provide brief, encouraging, yet critical feedback (3 bullet points) based on the IELTS criteria: Fluency, Lexical Resource, and Grammatical Range. Mention specific things the candidate did well or could improve based on the generated text.`,

  assessment: `Act as a senior IELTS Examiner. Analyze the following transcript of a full mock exam (Part 1, 2, and 3). 
Provide a detailed assessment including:
1. An overall estimated Band Score (e.g. 6.5, 7.5).
2. Feedback for Fluency & Coherence.
3. Feedback for Lexical Resource.
4. Feedback for Grammatical Range & Accuracy.
5. Feedback for Pronunciation (based on transcript text/clarity).
6. A 'Key Suggestion' for improvement.

Output the result as a JSON object with these keys: score (string), fluency (string), lexical (string), grammar (string), pronunciation (string), suggestion (string).`
};

async function callGeminiRest(prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const msg = errorBody.error?.message || `HTTP ${response.status}`;
    
    // Fallback attempt to v1beta if v1 returns 404
    if (response.status === 404) {
      const betaUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
      const betaRes = await fetch(betaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
        })
      });
      if (betaRes.ok) {
        const betaData = await betaRes.json();
        return betaData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    }
    
    throw new Error(msg);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { type, part, context, instruction, fullTranscript } = body;

    // Mock exam assessment mode
    if (type === "assessment" && fullTranscript) {
      const transcriptStr = fullTranscript.map((t: { label: string; text: string }) => `${t.label}: ${t.text}`).join("\n\n");
      const prompt = `${SYSTEM_PROMPTS.assessment}\n\nFull Exam Transcript:\n${transcriptStr}\n\nGenerate JSON assessment now:`;
      const text = await callGeminiRest(prompt);
      const jsonStr = text.replace(/```json\n?|\n?```/g, "");
      try {
        return NextResponse.json({ result: JSON.parse(jsonStr) });
      } catch {
        return NextResponse.json({ error: "Failed to parse assessment" }, { status: 500 });
      }
    }

    // Regular generation mode
    const ageVal = context?.age || "young";
    const profile = `Candidate Profile: ${ageVal}-year-old ${context?.gender || "student"}, aiming for Band ${context?.targetBand || 7.0}. Preferred Style: ${context?.preferredStyle || "Natural"}.`;

    let prompt = "";

    if (type === "script") {
      const systemPrompt = SYSTEM_PROMPTS[part] || SYSTEM_PROMPTS.part1;
      prompt = `${systemPrompt}\n\n${profile}\n\nQuestion: ${context.question}\n${context.cueCard ? `Cue Card: ${context.cueCard}\n` : ""}${context.chineseLogic ? `My Input/Logic: ${context.chineseLogic}\n` : ""}${context.storyDetails ? `Story Context: ${context.storyDetails}\n` : ""}${instruction ? `SPECIAL USER INSTRUCTION: ${instruction}\n` : ""}\nGenerate the English response now:`;
    } else if (type === "translation") {
      prompt = `${SYSTEM_PROMPTS.translation}\n\nEnglish Text: ${context.question}\n\nTranslate now:`;
    } else if (type === "vocab") {
      prompt = `${SYSTEM_PROMPTS.vocab}\n\nEnglish Text: ${context.question}\n\nExtract phrases now:`;
    } else if (type === "coaching") {
      prompt = `${SYSTEM_PROMPTS.coaching}\n\n${profile}\n\nGenerated Response: ${context.question}\n\nProvide feedback now:`;
    } else {
      return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }

    const text = await callGeminiRest(prompt);
    return NextResponse.json({ result: text });

  } catch (error: any) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: error.message || "Unknown AI error" }, { status: 500 });
  }
}
