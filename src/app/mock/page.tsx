"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import { Mic, RotateCcw, Play, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { Question, Topic, Part3Question } from "@/types";
import { useTTS } from "@/hooks/useTTS";
import { analyzeMockExam } from "@/lib/gemini";

type Segment = 
  | { type: 'intro' }
  | { type: 'p1', q: Question }
  | { type: 'p2-prep', t: Topic }
  | { type: 'p2-speak', t: Topic }
  | { type: 'p3', q: Part3Question }
  | { type: 'done' };

const AI_FEEDBACK = [
  {
    score: "7.5",
    fluency: "Good flow with minor hesitations. Try to reduce filler words like 'um'.",
    lexical: "Nice variety of vocabulary. Consider adding more idiomatic expressions.",
    grammar: "Mostly accurate. Watch out for article usage ('a/the').",
    pronunciation: "Clear and understandable. Work on sentence stress for emphasis.",
    suggestion: "Your answer was well-structured! To push to 8.0+, add a more vivid personal anecdote.",
  },
  {
    score: "8.0",
    fluency: "Very natural pace and rhythm. Minimal unnecessary pauses.",
    lexical: "Excellent range — phrases like 'it hit me' and 'out of nowhere' sound very native.",
    grammar: "Highly accurate with good complex structures.",
    pronunciation: "Natural intonation and stress patterns.",
    suggestion: "Outstanding response! To hit 9.0, focus on even more nuanced emotional depth.",
  },
];


type FeedbackType = {
  score: string;
  fluency: string;
  lexical: string;
  grammar: string;
  pronunciation: string;
  suggestion: string;
};

export default function MockPage() {
  const [mounted, setMounted] = useState(false);
  const { categories, topics, user } = useStore();
  const { toggleSpeech } = useTTS();
  
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Automatic Examiner Speech
  useEffect(() => {
    if (segments.length > 0 && currentIndex < segments.length) {
      const seg = segments[currentIndex];
      let text = "";
      let id = "";
      if (seg.type === 'p1') { text = seg.q.question; id = seg.q.id; }
      if (seg.type === 'p2-prep') { 
        text = `Now, I'd like you to describe: ${seg.t.title}. You have one minute to prepare. You can look at the cue card on the screen.`; 
        id = seg.t.id; 
      }
      if (seg.type === 'p3') { text = seg.q.question; id = seg.q.id; }
      
      if (text) {
        const timer = setTimeout(() => {
          toggleSpeech(id, text, 'examiner');
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentIndex, segments, toggleSpeech]);

  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(1);
  const [transcript, setTranscript] = useState("");
  const [fullTranscript, setFullTranscript] = useState<{label: string, text: string}[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackType | null>(null);

  const [examMode, setExamMode] = useState<'full' | 'custom'>('full');
  const [customTopicId, setCustomTopicId] = useState<string>("");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { setMounted(true); }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const startTimer = useCallback((duration: number, onEnd: () => void) => {
    clearTimer();
    setTimeLeft(duration);
    setTotalTime(duration);
    let remaining = duration;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) { clearTimer(); onEnd(); }
    }, 1000);
  }, [clearTimer]);

  const startSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-GB";
      recognition.onresult = (event: any) => {
        let full = "";
        for (let i = 0; i < event.results.length; i++) {
          full += event.results[i][0].transcript + " ";
        }
        setTranscript(full.trim());
      };
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // browser may block
    }
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const advanceSegment = useCallback(() => {
    // Save previous transcript
    const currentSeg = segments[currentIndex];
    if (currentSeg && currentSeg.type !== 'intro' && currentSeg.type !== 'p2-prep' && currentSeg.type !== 'done' && transcript.length > 0) {
      let label = "Unknown";
      if (currentSeg.type === 'p1') label = `P1: ${currentSeg.q.question}`;
      if (currentSeg.type === 'p2-speak') label = `P2: ${currentSeg.t.title}`;
      if (currentSeg.type === 'p3') label = `P3: ${currentSeg.q.question}`;
      setFullTranscript(prev => [...prev, { label, text: transcript }]);
    }

    setTranscript("");
    clearTimer();
    stopSpeechRecognition();
    setIsRecording(false);

    const nextIdx = currentIndex + 1;
    if (nextIdx >= segments.length) {
      setCurrentIndex(nextIdx - 1);
      return;
    }
    
    setCurrentIndex(nextIdx);
    const seg = segments[nextIdx];

    if (seg.type === 'p1' || seg.type === 'p3') {
      setIsRecording(true);
      startSpeechRecognition();
      // No strict timer, just count up or give a generous limit
      setTimeLeft(0);
      setTotalTime(1);
    } else if (seg.type === 'p2-prep') {
      startTimer(60, () => advanceSegment());
    } else if (seg.type === 'p2-speak') {
      setIsRecording(true);
      startSpeechRecognition();
      startTimer(120, () => advanceSegment());
    } else if (seg.type === 'done') {
      stopSpeechRecognition();
      // Generate real AI assessment
      const triggerAssessment = async () => {
        const result = await analyzeMockExam(fullTranscript);
        if (result) {
          setFeedback(result as FeedbackType);
        } else {
          // Fallback to random if AI fails
          setFeedback(AI_FEEDBACK[Math.floor(Math.random() * AI_FEEDBACK.length)]);
        }
      };
      setTimeout(triggerAssessment, 1500);
    }
  }, [currentIndex, segments, transcript, clearTimer, stopSpeechRecognition, startSpeechRecognition, startTimer, fullTranscript]);

  const generateExam = () => {
    if (!user) return;
    const userTopics = topics.filter((t) => t.userId === user.id);
    
    if (examMode === 'custom') {
      const p2Topic = userTopics.find(t => t.id === customTopicId);
      if (!p2Topic) return alert("Please select a valid topic first.");
      const p3Qs = (p2Topic.part3Questions || []).slice(0, 3);
      const segs: Segment[] = [
        { type: 'intro' },
        { type: 'p2-prep', t: p2Topic },
        { type: 'p2-speak', t: p2Topic },
        ...p3Qs.map(q => ({ type: 'p3' as const, q })),
        { type: 'done' }
      ];
      setSegments(segs);
      setFullTranscript([]);
      setFeedback(null);
      setCurrentIndex(0);
      advanceSegment();
      return;
    }

    const p1Qs: Question[] = [];
    categories.filter(c => c.userId === user.id).forEach(c => p1Qs.push(...c.questions));
    
    if (p1Qs.length < 3 || userTopics.length === 0) {
      alert("You need at least 3 Part 1 questions and 1 Part 2 topic to start the exam!");
      return;
    }

    // Shuffle and pick 3 P1
    const p1 = [...p1Qs].sort(() => 0.5 - Math.random()).slice(0, 3);
    const p2Topic = [...userTopics].sort(() => 0.5 - Math.random())[0];
    const p3Qs = (p2Topic.part3Questions || []).slice(0, 3);

    const segs: Segment[] = [
      { type: 'intro' },
      ...p1.map(q => ({ type: 'p1' as const, q })),
      { type: 'p2-prep', t: p2Topic },
      { type: 'p2-speak', t: p2Topic },
      ...p3Qs.map(q => ({ type: 'p3' as const, q })),
      { type: 'done' }
    ];

    setSegments(segs);
    setFullTranscript([]);
    setFeedback(null);
    setCurrentIndex(0);
    advanceSegment(); // triggers move to first real question
  };

  useEffect(() => {
    return () => { clearTimer(); stopSpeechRecognition(); };
  }, [clearTimer, stopSpeechRecognition]);

  if (!mounted || !user) return null;

  const currentSegment = segments[currentIndex] || { type: 'intro' };
  
  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="animate-in fade-in duration-700 space-y-10 min-h-screen">
      <header className="border-b border-[var(--border-color)] pb-10 space-y-2">
        <h1 className="text-4xl font-playfair tracking-tight text-[var(--fg-primary)]">Systematic Mock</h1>
        <p className="nga-label">Full Length IELTS Speaking Module</p>
      </header>

      {segments.length === 0 || currentSegment.type === 'intro' ? (
        <div className="flex flex-col items-center justify-center text-center space-y-8 py-10">
          {/* Mode Switcher */}
          <div className="flex bg-[var(--bg-secondary)] p-1.5 rounded-[1.5rem] w-full max-w-xs mx-auto border border-[var(--border-color)]">
            <button 
              onClick={() => setExamMode('full')}
              className={`flex-1 py-3 text-[10px] uppercase tracking-wider font-bold rounded-2xl transition-all ${
                examMode === 'full' 
                ? "bg-[var(--bg-card)] text-[var(--fg-primary)] shadow-sm" 
                : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
              }`}
            >Full Exam</button>
            <button 
              onClick={() => setExamMode('custom')}
              className={`flex-1 py-3 text-[10px] uppercase tracking-wider font-bold rounded-2xl transition-all ${
                examMode === 'custom' 
                ? "bg-[var(--bg-card)] text-[var(--fg-primary)] shadow-sm" 
                : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
              }`}
            >Custom Topic</button>
          </div>

          <div className="w-16 h-16 bg-[var(--accent-soft)] rounded-full flex items-center justify-center animate-pulse mt-4">
            <Mic className="text-[var(--accent-color)]" />
          </div>
          <div className="space-y-4 max-w-sm mx-auto">
             <h2 className="text-2xl font-playfair">Ready for your practice?</h2>
             {examMode === 'full' ? (
               <p className="text-sm font-light text-[var(--fg-muted)] leading-relaxed">
                 This simulates a real exam. We will test you on 3 random Part 1 questions, 1 Part 2 Topic, and 3 Part 3 Extensions.
               </p>
             ) : (
               <div className="space-y-4 pt-2 text-left">
                 <p className="nga-label">Select a Topic</p>
                 <select 
                   className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 text-sm outline-none font-playfair cursor-pointer text-[var(--fg-primary)] shadow-sm"
                   value={customTopicId}
                   onChange={(e) => setCustomTopicId(e.target.value)}
                 >
                   <option value="" disabled>Choose a Topic...</option>
                   {topics.filter(t => t.userId === user.id).map(t => (
                     <option key={t.id} value={t.id}>{t.title}</option>
                   ))}
                 </select>
                 <p className="text-xs text-muted leading-relaxed">You will do a timed Mock for this specific Topic (Part 2) and its Extensions (Part 3).</p>
               </div>
             )}
          </div>
          <button 
            onClick={generateExam} 
            disabled={examMode === 'custom' && !customTopicId}
            className="nga-button text-sm px-10 py-4 disabled:opacity-50"
          >
             <Play size={16} /> {examMode === 'full' ? 'Enter Testing Room' : 'Start Custom Practice'}
          </button>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          
          {/* Status Bar */}
          <div className="flex items-center justify-between nga-label text-[9px]">
            <span>
              {currentSegment.type === 'p1' && 'PART 1: INTRODUCTIONS'}
              {currentSegment.type.startsWith('p2') && 'PART 2: LONG TURN'}
              {currentSegment.type === 'p3' && 'PART 3: EXTENSIONS'}
              {currentSegment.type === 'done' && 'EXAM COMPLETED'}
            </span>
            <span className="text-[var(--accent-color)]">{currentIndex} / {segments.length - 2}</span>
          </div>

          <div className="nga-card space-y-8">
            {currentSegment.type === 'p1' && (
              <h2 className="text-2xl font-playfair leading-relaxed">{currentSegment.q.question}</h2>
            )}

            {(currentSegment.type === 'p2-prep' || currentSegment.type === 'p2-speak') && (
              <div className="space-y-4">
                <h2 className="text-2xl font-playfair leading-relaxed">Describe: {currentSegment.t.title}</h2>
                <div className="bg-[var(--bg-secondary)] rounded-2xl p-6">
                  <p className="nga-label mb-3">Cue Card</p>
                  <p className="text-sm font-light leading-relaxed whitespace-pre-line text-muted">
                    {currentSegment.t.cueCard}
                  </p>
                </div>
              </div>
            )}

            {currentSegment.type === 'p3' && (
              <h2 className="text-2xl font-playfair leading-relaxed">{currentSegment.q.question}</h2>
            )}

            {currentSegment.type === 'done' && (
              <div className="text-center py-10 space-y-4">
                <CheckCircle2 size={48} className="text-[var(--success-color)] mx-auto" />
                <h2 className="text-3xl font-playfair">Test Concluded</h2>
                <p className="text-sm text-muted font-light">Processing your transcript and generating AI assessment...</p>
              </div>
            )}

            {/* Timers & Actions */}
            <div className="flex flex-col items-center gap-6 pt-4">
              {currentSegment.type === 'p2-prep' && (
                <>
                  <p className="text-5xl font-playfair tracking-widest">{formatTime(timeLeft)}</p>
                  <p className="text-[10px] uppercase font-bold text-[var(--fg-muted)] tracking-[0.2em]">Prep Time</p>
                  <button onClick={advanceSegment} className="nga-button-outline w-full mt-4">
                    Skip Prep (Ready)
                  </button>
                </>
              )}

              {currentSegment.type === 'p2-speak' && (
                <>
                  <p className="text-5xl font-playfair tracking-widest text-[var(--danger-color)]">{formatTime(timeLeft)}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[var(--danger-color)] animate-pulse" />
                    <span className="text-[10px] uppercase font-bold text-[var(--danger-color)] tracking-[0.2em]">Recording</span>
                  </div>
                  <button onClick={advanceSegment} className="nga-button-outline w-full mt-4 text-[var(--danger-color)] border-[var(--danger-color)]">
                    Finish Speaking
                  </button>
                </>
              )}

              {(currentSegment.type === 'p1' || currentSegment.type === 'p3') && (
                <>
                  <div className="flex items-center gap-3 py-6">
                    <div className="w-2 h-2 rounded-full bg-[var(--danger-color)] animate-pulse" />
                    <span className="text-[10px] uppercase font-bold text-[var(--danger-color)] tracking-[0.2em]">Recording</span>
                  </div>
                  <button onClick={advanceSegment} className="nga-button w-full">
                    Complete Answer (Next) <ArrowRight size={14} className="ml-2" />
                  </button>
                </>
              )}
            </div>
            
            {isRecording && transcript && (
              <div className="pt-8 border-t border-[var(--border-color)]">
                 <p className="nga-label mb-2 text-indigo-400">Live Transcript</p>
                 <p className="text-sm font-light text-gray-600 leading-relaxed italic">{transcript}</p>
              </div>
            )}
          </div>
          
          {/* Complete View */}
          {currentSegment.type === 'done' && feedback && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-playfair">AI Assessment</h2>
                <span className="text-4xl font-playfair text-[var(--accent-color)]">{feedback.score}</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: "Fluency & Coherence", val: feedback.fluency },
                  { label: "Lexical Resource", val: feedback.lexical },
                  { label: "Grammatical Range", val: feedback.grammar },
                  { label: "Pronunciation", val: feedback.pronunciation },
                ].map(({ label, val }) => (
                  <div key={label} className="nga-card-sm space-y-2">
                    <p className="nga-label">{label}</p>
                    <p className="text-sm font-light leading-relaxed">{val}</p>
                  </div>
                ))}
              </div>
              <div className="nga-card space-y-3 bg-[var(--fg-primary)] text-[var(--bg-primary)] border-[var(--border-color)]/10">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} />
                  <p className="nga-label" style={{ color: "#888" }}>Key Suggestion</p>
                </div>
                <p className="text-sm font-light leading-relaxed">{feedback.suggestion}</p>
              </div>

              {fullTranscript.length > 0 && (
                <div className="pt-8 space-y-6">
                  <h3 className="text-xl font-playfair">Full Transcript Review</h3>
                  {fullTranscript.map((t, idx) => (
                    <div key={idx} className="space-y-2">
                      <p className="nga-label text-indigo-500">{t.label}</p>
                      <p className="text-sm font-light leading-relaxed bg-[var(--accent-soft)]/50 p-4 rounded-2xl">{t.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-center pt-10">
                <button onClick={() => setSegments([])} className="nga-button-outline">
                  <RotateCcw size={14} /> Retake Exam
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
