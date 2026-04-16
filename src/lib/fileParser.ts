/**
 * Parses plain text or structured text files into Q&A pairs.
 * Supports formats:
 * - "Category: Questions\nQ: ...\nA: ...\nTranslation: ...\nVocab: ..."
 * - Lines ending with "?" are treated as questions and reset the block.
 */
export function parseFileContent(text: string): {
  qaPairs: { 
    category: string; 
    question: string; 
    answer?: string;
    translation?: string;
    vocabAnalysisText?: string;
  }[];
} {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  
  const qaPairs: { category: string; question: string; answer?: string; translation?: string; vocabAnalysisText?: string }[] = [];
  
  let currentCategory = 'General';
  let currentQuestion: string | null = null;
  
  let currentAnswer: string[] = [];
  let currentTranslation: string[] = [];
  let currentVocab: string[] = [];
  
  // which block are we currently pushing text into? 
  // 'answer', 'translation', or 'vocab'
  let currentBlock: 'answer' | 'translation' | 'vocab' = 'answer';

  const flushQuestion = () => {
    if (currentQuestion) {
      qaPairs.push({ 
        category: currentCategory, 
        question: currentQuestion, 
        answer: currentAnswer.join('\n').trim(),
        translation: currentTranslation.join('\n').trim(),
        vocabAnalysisText: currentVocab.join('\n').trim()
      });
      currentQuestion = null;
      currentAnswer = [];
      currentTranslation = [];
      currentVocab = [];
      currentBlock = 'answer';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // cleanLine strips any leading emoji or non-alphanumeric/Chinese characters (except for standard text)
    // Helps safely match "💬 中文翻译" -> "中文翻译"
    // We only use cleanLine for detection, not for appending content!
    const cleanLine = line.replace(/^[^a-zA-Z0-9\u4e00-\u9fa5]+/, '').trim();

    // 1a. Explicit Category / Topic Detection (High Priority)
    // Detects explicit markers and forces a flush/switch
    if (/^(Category|Theme|Topic|主题|分类)[:：]\s*/i.test(cleanLine)) {
      flushQuestion();
      currentCategory = cleanLine.replace(/^(Category|Theme|Topic|主题|分类)[:：]\s*/i, '').trim();
      currentQuestion = null; // Explicitly reset to ensure clean state
      continue;
    }

    // 1b. Implicit Category Detection (Lower Priority)
    // Short line before any question starts.
    if (!currentQuestion && cleanLine.length > 0 && cleanLine.length < 60 && !line.includes('?')) {
      currentCategory = line.replace(/^[#\s]+/, '').replace(/^(Category|Theme|Topic|主题|分类)[:：]?\s*/i, '').trim();
      continue;
    }

    // 2. Explicit Question formats: Q1:, Q5 & Q7:, Question:, 问题:
    if (/^(Q[\d\s&]*|Question|问题)[:：]\s*/i.test(cleanLine)) {
      flushQuestion();
      currentQuestion = cleanLine.replace(/^(Q[\d\s&]*|Question|问题)[:：]\s*/i, '').trim();
      currentBlock = 'answer';
      continue;
    }
    
    // 3. Implicit Question: Line ending with "?" and we don't have an active question yet
    // OR we have an active question but NO answer/translation/vocab yet (meaning multiple questions chained, we take the last one)
    if ((line.endsWith('?') || line.endsWith('？')) && currentBlock === 'answer' && currentAnswer.length === 0) {
      flushQuestion();
      currentQuestion = line;
      currentBlock = 'answer';
      continue;
    }

    // 4. Fallback implicit Question: if the line ends with "?" and doesn't fit into a block, we'll assume it's a new question
    if ((line.endsWith('?') || line.endsWith('？')) && currentBlock !== 'answer') {
      flushQuestion();
      currentQuestion = line;
      currentBlock = 'answer';
      continue;
    }

    // 5. Explicit Answer section (optional, text directly after Q defaults to Answer anyway)
    if (/^(A|Answer|答案)[:：]\s*/i.test(cleanLine)) {
      currentBlock = 'answer';
      const text = cleanLine.replace(/^(A|Answer|答案)[:：]\s*/i, '').trim();
      if (text) currentAnswer.push(text);
      continue;
    }

    // 6. Translation section
    if (/^(T|Translation|中文翻译|翻译)[:：]?\s*/i.test(cleanLine)) {
      currentBlock = 'translation';
      const text = cleanLine.replace(/^(T|Translation|中文翻译|翻译)[:：]?\s*/i, '').trim();
      if (text) currentTranslation.push(text);
      continue;
    }

    // 7. Vocab section
    // Matches "✨ 重点词组", "Vocab:", "*Vocabulary*"
    if (/^(V|Vocab|Vocabulary|词汇|重点词组|词组|重点词汇)([:：]\s*|\s*$)/i.test(cleanLine)) {
      currentBlock = 'vocab';
      const text = cleanLine.replace(/^(V|Vocab|Vocabulary|词汇|重点词组|词组|重点词汇)[:：]?\s*/i, '').trim();
      if (text) currentVocab.push(text);
      continue;
    }

    // 8. Otherwise append to the currently active block
    if (currentQuestion) {
      if (currentBlock === 'answer') currentAnswer.push(line);
      else if (currentBlock === 'translation') currentTranslation.push(line);
      else if (currentBlock === 'vocab') currentVocab.push(line);
    }
  }

  flushQuestion();

  return { qaPairs };
}
