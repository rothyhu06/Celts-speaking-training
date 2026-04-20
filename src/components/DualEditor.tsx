"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Edit3, MessageCircle, Send, Volume2, Square, Cloud, CloudOff, RefreshCw } from "lucide-react";

interface DualEditorProps {
  title: string;
  subtitle?: string;
  
  // Manual text areas
  englishValue: string;
  chineseValue: string;
  chineseLogicValue: string;
  vocabAnalysisValue?: string;
  
  // AI text areas (from aiSuggestions)
  aiEnglishValue?: string;
  aiChineseValue?: string;
  aiVocabAnalysisValue?: string;
  aiCoachingValue?: string;

  onEnglishChange: (val: string) => void;
  onChineseChange: (val: string) => void;
  onChineseLogicChange: (val: string) => void;
  onVocabAnalysisChange?: (val: string) => void;
  
  onAiGenerate: (type: 'script' | 'translation' | 'vocab' | 'coaching', instruction?: string) => void;
  isGenerating?: boolean;
  onSave?: () => void;
}

export default function DualEditor({
  title,
  subtitle,
  englishValue,
  chineseValue,
  chineseLogicValue,
  vocabAnalysisValue = '',
  aiEnglishValue,
  aiChineseValue,
  aiVocabAnalysisValue,
  aiCoachingValue = '',
  onEnglishChange,
  onChineseChange,
  onChineseLogicChange,
  onVocabAnalysisChange,
  onAiGenerate,
  isGenerating,
  onSave
}: DualEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'syncing' | 'saved'>('idle');
  const [localEnglish, setLocalEnglish] = useState(englishValue);
  const [localChinese, setLocalChinese] = useState(chineseValue);
  const [localThought, setLocalThought] = useState(chineseLogicValue);
  const [localVocab, setLocalVocab] = useState(vocabAnalysisValue);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when props change (e.g. from AI)
  useEffect(() => { setLocalEnglish(englishValue); }, [englishValue]);
  useEffect(() => { setLocalChinese(chineseValue); }, [chineseValue]);
  useEffect(() => { setLocalThought(chineseLogicValue); }, [chineseLogicValue]);
  useEffect(() => { setLocalVocab(vocabAnalysisValue); }, [vocabAnalysisValue]);

  const triggerAutoSave = () => {
    if (saveStatus !== 'syncing') setSaveStatus('syncing');
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      if (onSave) {
        onSave();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }, 1500); // 1.5s debounce
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Local state for AI instruction prompts
  const [scriptInstruction, setScriptInstruction] = useState("");
  const [translationInstruction, setTranslationInstruction] = useState("");
  const [vocabInstruction, setVocabInstruction] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);

  const toggleSpeech = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel(); // clear queue
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-GB"; // Default to British accent for IELTS
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-10">
      {/* Sticky Original Question Header */}
      <div className="sticky top-0 z-10 -mx-10 px-10 pt-4 pb-8 bg-[var(--glass-bg)] backdrop-blur-md border-b border-[var(--border-color)] shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <div className="space-y-3 flex-1">
            <label className="nga-label text-[10px] font-bold uppercase tracking-[0.2em]">Current Prompt</label>
            <h2 className="text-2xl font-playfair leading-tight text-[var(--fg-primary)] font-bold">{title}</h2>
            {subtitle && (
              <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mt-2 border border-[var(--border-color)] shadow-inner">
                 <p className="text-xs text-[var(--fg-secondary)] leading-relaxed font-light whitespace-pre-line italic">
                   {subtitle}
                 </p>
              </div>
            )}
          </div>
          <div className="ml-6 shrink-0">
            {saveStatus === 'syncing' && (
              <div className="flex items-center gap-2 text-[var(--accent-color)] animate-pulse">
                <RefreshCw size={12} className="animate-spin" />
                <span className="text-[9px] font-bold tracking-widest uppercase">Syncing</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-2 text-[var(--success-color)]">
                <Cloud size={12} />
                <span className="text-[9px] font-bold tracking-widest uppercase">Synced</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chinese Logic / Thought */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-[var(--fg-muted)]" />
            <label className="nga-label text-[9px]">Chinese Logic / Thought (中文思路)</label>
          </div>
          {chineseLogicValue && (
            <button
              onClick={() => onAiGenerate('script')}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)] text-[var(--accent-color)] transition-all border border-[var(--accent-color)] disabled:opacity-50"
            >
              <Sparkles size={10} />
              <span className="text-[8px] font-bold uppercase tracking-wider">{isGenerating ? "Generating..." : "Regenerate AI"}</span>
            </button>
          )}
        </div>
        <textarea
          className="w-full border border-[var(--border-color)] dark:border-white/5 rounded-2xl p-4 text-sm outline-none h-24 bg-gray-50/50 dark:bg-[var(--bg-surface)]/[0.02] resize-none leading-relaxed font-light italic placeholder:text-[var(--fg-muted)] dark:placeholder:text-gray-600 focus:border-indigo-200 dark:focus:border-indigo-900 transition-all dark:text-[var(--fg-muted)]"
          placeholder="Type your Chinese logic points here..."
          value={localThought}
          onChange={(e) => {
            setLocalThought(e.target.value);
            onChineseLogicChange(e.target.value);
            triggerAutoSave();
          }}
        />
      </div>

      {/* English Script Module */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Edit3 size={16} className="text-[var(--fg-muted)]" />
              <label className="nga-label text-[9px]">Manual English Script (你的草稿)</label>
            </div>
            {!aiEnglishValue ? (
              <button
                onClick={() => onAiGenerate('script', scriptInstruction.trim())}
                disabled={isGenerating}
                className="bg-[var(--bg-primary)] text-[var(--fg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-full text-[8px] font-bold flex items-center gap-1 hover:bg-[var(--bg-secondary)] transition-all tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <Sparkles size={10} /> Generate AI Version
              </button>
            ) : (
              <button 
                onClick={() => toggleSpeech(englishValue)}
                disabled={!englishValue}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-secondary)] hover:opacity-80 transition-colors text-[var(--fg-secondary)] disabled:opacity-30"
              >
                {isPlaying ? <Square size={10} className="fill-current" /> : <Volume2 size={12} />}
                <span className="text-[10px] tracking-wider font-bold">LISTEN</span>
              </button>
            )}
          </div>
          <textarea
            className="w-full p-6 rounded-2xl text-lg font-playfair leading-relaxed resize-none h-48 outline-none transition-all duration-500 bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-indigo-400 focus:bg-[var(--bg-card)] text-[var(--fg-primary)]"
            placeholder="Type your manual response here..."
            value={localEnglish}
            onChange={(e) => {
              setLocalEnglish(e.target.value);
              onEnglishChange(e.target.value);
              triggerAutoSave();
            }}
          />
        </div>

        {/* AI Script Wrapper */}
        {aiEnglishValue && (
          <div className="space-y-3 p-1 rounded-3xl bg-[var(--bg-secondary)] p-4 border border-[var(--accent-color)]/20 shadow-inner">
            <div className="flex items-center justify-between pb-2 px-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--accent-color)]" />
                <label className="nga-label text-[9px] text-[var(--accent-color)] font-bold">AI Suggested Version</label>
              </div>
              <button 
                onClick={() => toggleSpeech(aiEnglishValue)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-soft)] hover:opacity-80 transition-colors text-[var(--accent-color)] font-bold border border-[var(--accent-color)]/20 shadow-sm"
              >
                {isPlaying ? <Square size={10} className="fill-current" /> : <Volume2 size={12} />}
                <span className="text-[10px] uppercase font-bold tracking-wider">{isPlaying ? "Stop" : "Listen"}</span>
              </button>
            </div>
            <textarea
              readOnly
              className="w-full p-6 text-xl font-playfair italic leading-relaxed resize-none h-48 outline-none bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm text-[var(--fg-primary)]"
              value={aiEnglishValue}
            />
            {/* Prompt Controller */}
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="text"
                placeholder="Instruct AI to adjust..."
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] py-3 px-4 rounded-xl text-sm outline-none focus:border-[var(--accent-color)]/50 transition-colors shadow-sm text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)]"
                value={scriptInstruction}
                onChange={(e) => setScriptInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isGenerating) {
                    onAiGenerate('script', scriptInstruction.trim());
                  }
                }}
              />
              <button
                onClick={() => onAiGenerate('script', scriptInstruction.trim())}
                disabled={isGenerating}
                className="bg-[var(--accent-color)] text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Coaching Module (Read-only) */}
      {aiCoachingValue && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--accent-color)]" />
            <label className="nga-label text-[10px] text-[var(--accent-color)] font-bold uppercase tracking-widest">AI Master Coach</label>
          </div>
          <div className="w-full p-8 rounded-[2rem] text-sm leading-loose bg-[var(--bg-secondary)]/50 text-[var(--fg-primary)] outline-none shadow-sm border border-[var(--border-color)]">
            <div className="whitespace-pre-wrap font-playfair italic leading-relaxed text-base opacity-95 text-[var(--fg-primary)]">{aiCoachingValue}</div>
          </div>
        </div>
      )}

      {/* Translation & Vocab Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Translation */}
        <div className="space-y-6">
          <div className="space-y-3">
             <div className="flex justify-between items-center">
              <label className="nga-label text-[9px]">Manual Translation (你的翻译)</label>
              {!aiChineseValue && (
                 <button
                 onClick={() => onAiGenerate('translation', translationInstruction.trim())}
                 disabled={isGenerating}
                 className="bg-[var(--bg-primary)] text-[var(--fg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-full text-[8px] font-bold flex items-center gap-1 hover:bg-[var(--bg-secondary)] transition-all tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
               >
                 <Sparkles size={10} />
                 Generate
               </button>
              )}
            </div>
            <textarea
              className="w-full p-4 rounded-2xl text-sm leading-loose resize-none h-32 outline-none transition-all duration-300 bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-indigo-400 focus:bg-[var(--bg-card)] text-[var(--fg-primary)]"
              placeholder="Your manual translation notes..."
              value={localChinese}
              onChange={(e) => {
                setLocalChinese(e.target.value);
                onChineseChange(e.target.value);
                triggerAutoSave();
              }}
            />
          </div>
          
          {aiChineseValue && (
            <div className="space-y-3 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/[0.05] dark:to-teal-500/[0.05] p-3 rounded-2xl border border-[var(--success-color)] dark:border-emerald-900/10 transition-all">
               <div className="flex items-center gap-2 px-1">
                 <Sparkles size={12} className="text-[var(--success-color)]" />
                 <label className="nga-label text-[8px] text-emerald-700">AI Translation</label>
               </div>
               <textarea
                  readOnly
                  className="w-full p-4 text-sm leading-loose resize-none h-32 outline-none bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)]/[0.05] rounded-xl shadow-sm text-[var(--fg-primary)] dark:text-emerald-100"
                  value={aiChineseValue}
                />
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    placeholder="Adjust style..."
                    className="flex-1 bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)]/[0.03] border border-[var(--success-color)] dark:border-emerald-900/10 py-2.5 px-3 rounded-xl text-xs outline-none focus:border-emerald-300 transition-colors shadow-sm dark:text-white"
                    value={translationInstruction}
                    onChange={(e) => setTranslationInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isGenerating) {
                        onAiGenerate('translation', translationInstruction.trim());
                      }
                    }}
                  />
                  <button
                    onClick={() => onAiGenerate('translation', translationInstruction.trim())}
                    disabled={isGenerating}
                    className="bg-[var(--success-color)] text-white p-2.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <Send size={14} />
                  </button>
                </div>
            </div>
          )}
        </div>

        {/* Vocab Analysis */}
        <div className="space-y-6">
          <div className="space-y-3">
             <div className="flex justify-between items-center">
              <label className="nga-label text-[9px]">Manual Vocab (词汇笔记)</label>
              {!aiVocabAnalysisValue && (
                 <button
                 onClick={() => onAiGenerate('vocab', vocabInstruction.trim())}
                 disabled={isGenerating}
                 className="bg-[var(--bg-primary)] text-[var(--fg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-full text-[8px] font-bold flex items-center gap-1 hover:bg-[var(--bg-secondary)] transition-all tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
               >
                 <Sparkles size={10} />
                 Generate
               </button>
              )}
            </div>
            <textarea
              className="w-full p-4 rounded-2xl text-sm leading-loose resize-none h-32 outline-none transition-all duration-300 bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-indigo-400 focus:bg-[var(--bg-card)] text-[var(--fg-primary)]"
              placeholder="Your manual vocab notes..."
              value={localVocab}
              onChange={(e) => {
                setLocalVocab(e.target.value);
                if (onVocabAnalysisChange) {
                  onVocabAnalysisChange(e.target.value);
                  triggerAutoSave();
                }
              }}
            />
          </div>
          
          {aiVocabAnalysisValue && (
            <div className="space-y-3 bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-500/[0.05] dark:to-orange-500/[0.05] p-3 rounded-2xl border border-[var(--warning-color)] dark:border-amber-900/10 transition-all">
               <div className="flex items-center gap-2 px-1">
                 <Sparkles size={12} className="text-[var(--warning-color)]" />
                 <label className="nga-label text-[8px] text-amber-700">AI Vocab Extraction</label>
               </div>
               <textarea
                  readOnly
                  className="w-full p-4 text-sm leading-loose resize-none h-32 outline-none bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)]/[0.05] rounded-xl shadow-sm text-[var(--fg-primary)] dark:text-amber-100"
                  value={aiVocabAnalysisValue}
                />
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    placeholder="E.g. extract advanced idioms"
                    className="flex-1 bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)]/[0.03] border border-[var(--warning-color)] dark:border-amber-900/10 py-2.5 px-3 rounded-xl text-xs outline-none focus:border-amber-300 transition-colors shadow-sm dark:text-white"
                    value={vocabInstruction}
                    onChange={(e) => setVocabInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isGenerating) {
                        onAiGenerate('vocab', vocabInstruction.trim());
                      }
                    }}
                  />
                  <button
                    onClick={() => onAiGenerate('vocab', vocabInstruction.trim())}
                    disabled={isGenerating}
                    className="bg-[var(--warning-color)] text-white p-2.5 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    <Send size={14} />
                  </button>
                </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
