"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { ArrowRight, ArrowLeft, RotateCcw, Sparkles, CheckCircle2 } from "lucide-react";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  source: string;
}

export default function FlashcardsPage() {
  const [mounted, setMounted] = useState(false);
  const { categories, topics, user } = useStore();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mastered, setMastered] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !user) return;

    let extracted: Flashcard[] = [];
    const parseVocab = (text: string | undefined, sourceName: string) => {
      if (!text) return;
      
      // Clean leading brackets (e.g. from AI refinement tips)
      const cleanText = text.replace(/^\[.*?\]\n/, '');
      
      cleanText.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Split by standard delimiters
        const parts = trimmed.split(/[:：\-—]/);
        if (parts.length >= 2) {
           extracted.push({
             id: Math.random().toString(36).substring(7),
             front: parts[0].trim(),
             back: parts.slice(1).join(':').trim(),
             source: sourceName
           });
        }
      });
    };

    // Part 1
    categories.filter(c => c.userId === user.id).forEach(cat => {
      cat.questions.forEach(q => {
        parseVocab(q.vocabAnalysisText, `Part 1: ${cat.name}`);
        parseVocab(q.aiSuggestions?.vocabAnalysisText, `Part 1 AI: ${cat.name}`);
      });
    });

    // Part 2 & 3
    topics.filter(t => t.userId === user.id).forEach(topic => {
      parseVocab(topic.vocabAnalysisText, `Part 2: ${topic.title.substring(0, 15)}...`);
      parseVocab(topic.aiSuggestions?.vocabAnalysisText, `Part 2 AI: ${topic.title.substring(0, 15)}...`);
      
      topic.part3Questions?.forEach(q => {
         parseVocab(q.vocabAnalysisText, `Part 3: ${topic.title.substring(0, 10)}...`);
         parseVocab(q.aiSuggestions?.vocabAnalysisText, `Part 3 AI: ${topic.title.substring(0, 10)}...`);
      });
    });

    // Shuffle cards
    setCards(extracted.sort(() => Math.random() - 0.5));
  }, [mounted, categories, topics, user]);

  if (!mounted || !user) return null;

  const currentCard = cards[currentIndex];
  const isMastered = currentCard && mastered.has(currentCard.id);

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % cards.length), 150);
  };

  const toggleMastery = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMastered(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentCard.id)) newSet.delete(currentCard.id);
      else newSet.add(currentCard.id);
      return newSet;
    });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 h-[calc(100vh-140px)] flex flex-col">
      <header className="border-b border-[var(--border-color)] pb-10 space-y-2 shrink-0 pt-4">
        <h1 className="text-4xl font-playfair tracking-tight">Flashcards</h1>
        <p className="nga-label">Master your vocabulary</p>
      </header>

      {cards.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
            <Sparkles size={24} className="text-[var(--fg-muted)]" />
          </div>
          <div className="space-y-2">
            <p className="font-playfair text-xl text-[var(--fg-primary)]">No Vocabulary Found</p>
            <p className="text-sm font-light text-[var(--fg-muted)] max-w-xs leading-relaxed">
              Generate AI Vocabulary analysis or write your own notes in the Dual Editor to populate your deck.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-8">
          <div className="w-full flex justify-between items-center px-2">
            <p className="nga-label text-[10px]">
              Card {currentIndex + 1} / {cards.length}
            </p>
            <p className="nga-label text-[10px] text-[var(--success-color)]">
              {mastered.size} Mastered
            </p>
          </div>

          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full aspect-[4/3] perspective-1000 cursor-pointer relative group"
          >
            <div
              className={`w-full h-full duration-700 relative preserve-3d transition-transform ${
                isFlipped ? "rotate-y-180" : ""
              }`}
            >
              {/* Front */}
              <div className="absolute w-full h-full backface-hidden bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] shadow-sm flex flex-col items-center justify-center p-8 text-center group-hover:border-[var(--accent-color)] transition-colors">
                <span className="absolute top-6 left-6 text-[9px] uppercase tracking-widest text-[var(--fg-muted)] font-bold">Front</span>
                <span className="absolute top-6 right-6 text-[9px] uppercase tracking-widest text-[var(--accent-color)] font-bold max-w-[120px] truncate">{currentCard.source}</span>
                <h2 className="text-3xl font-playfair leading-relaxed text-[var(--fg-primary)]">{currentCard.front}</h2>
              </div>

              {/* Back */}
              <div className="absolute w-full h-full backface-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2rem] shadow-sm flex flex-col items-center justify-center p-8 text-center rotate-y-180">
                <span className="absolute top-6 left-6 text-[9px] uppercase tracking-widest text-[var(--fg-muted)] font-bold">Back</span>
                <p className="text-xl font-light text-[var(--fg-secondary)] leading-relaxed">{currentCard.back}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 w-full justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(false);
                setTimeout(() => setCurrentIndex((prev) => (prev - 1 < 0 ? cards.length - 1 : prev - 1)), 150);
              }}
              className="p-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:border-[var(--fg-primary)] transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>

            <button
              onClick={toggleMastery}
              className={`p-5 rounded-full transition-all border ${
                isMastered 
                  ? 'bg-[var(--success-color)] border-[var(--success-color)] text-white shadow-md shadow-[var(--success-color)]/20' 
                  : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--fg-muted)] hover:text-[var(--success-color)] hover:border-[var(--success-color)]'
              }`}
            >
              <CheckCircle2 size={28} strokeWidth={isMastered ? 2.5 : 1.5} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); nextCard(); }}
              className="p-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:border-[var(--fg-primary)] transition-all shadow-sm"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
