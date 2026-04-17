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
      <div className="sticky top-0 z-10 -mx-10 px-10 pt-4 pb-8 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <div className="space-y-3 flex-1">
            <label className="nga-label text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Current Prompt</label>
            <h2 className="text-2xl font-playfair leading-tight text-black">{title}</h2>
            {subtitle && (
              <div className="bg-gray-50/80 rounded-xl p-4 mt-2 border border-gray-100">
                 <p className="text-xs text-muted leading-relaxed font-light whitespace-pre-line italic">
                   {subtitle}
                 </p>
              </div>
            )}
          </div>
          <div className="ml-6 shrink-0">
            {saveStatus === 'syncing' && (
              <div className="flex items-center gap-2 text-indigo-500 animate-pulse">
                <RefreshCw size={12} className="animate-spin" />
                <span className="text-[9px] font-bold tracking-widest uppercase">Syncing</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-2 text-emerald-500">
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
            <MessageCircle size={16} className="text-gray-400" />
            <label className="nga-label text-[9px]">Chinese Logic / Thought (中文思路)</label>
          </div>
          {chineseLogicValue && (
            <button
              onClick={() => onAiGenerate('script')}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-all border border-indigo-100 disabled:opacity-50"
            >
              <Sparkles size={10} />
              <span className="text-[8px] font-bold uppercase tracking-wider">{isGenerating ? "Generating..." : "Regenerate AI"}</span>
            </button>
          )}
        </div>
        <textarea
          className="w-full border border-gray-200 rounded-2xl p-4 text-sm outline-none h-24 bg-gray-50 resize-none leading-relaxed font-light italic placeholder:text-gray-300 focus:border-black transition-all"
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
              <Edit3 size={16} className="text-gray-400" />
              <label className="nga-label text-[9px]">Manual English Script (你的草稿)</label>
            </div>
            {!aiEnglishValue ? (
              <button
                onClick={() => onAiGenerate('script', scriptInstruction.trim())}
                disabled={isGenerating}
                className="bg-black text-white px-3 py-1.5 rounded-full text-[8px] flex items-center gap-1 hover:bg-gray-800 transition-colors tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Sparkles size={10} /> Generate AI Version
              </button>
            ) : (
              <button 
                onClick={() => toggleSpeech(englishValue)}
                disabled={!englishValue}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 disabled:opacity-30"
              >
                {isPlaying ? <Square size={10} className="fill-current" /> : <Volume2 size={12} />}
                <span className="text-[10px] tracking-wider font-bold">LISTEN</span>
              </button>
            )}
          </div>
          <textarea
            className="w-full p-6 rounded-2xl text-lg font-playfair leading-relaxed resize-none h-48 outline-none transition-all duration-500 bg-gray-50 border border-gray-200 focus:border-black focus:bg-white"
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
          <div className="space-y-3 p-1 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 p-4 border border-indigo-100 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between pb-2 px-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-500" />
                <label className="nga-label text-[9px] text-indigo-700">AI Suggested Version</label>
              </div>
              <button 
                onClick={() => toggleSpeech(aiEnglishValue)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 hover:bg-indigo-200 transition-colors text-indigo-700"
              >
                {isPlaying ? <Square size={10} className="fill-current" /> : <Volume2 size={12} />}
                <span className="text-[10px] uppercase font-bold tracking-wider">{isPlaying ? "Stop" : "Listen"}</span>
              </button>
            </div>
            <textarea
              readOnly
              className="w-full p-6 text-lg font-playfair leading-relaxed resize-none h-48 outline-none bg-white rounded-2xl border border-indigo-50 shadow-sm text-gray-800"
              value={aiEnglishValue}
            />
            {/* Prompt Controller */}
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="text"
                placeholder="Instruct AI to adjust (e.g. 'Make it shorter', 'Use more idioms')"
                className="flex-1 bg-white border border-indigo-100 py-3 px-4 rounded-xl text-sm outline-none focus:border-indigo-300 transition-colors shadow-sm"
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
                className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
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
            <Sparkles size={16} className="text-black" />
            <label className="nga-label text-[9px] text-black font-bold">AI Coach Guidance</label>
          </div>
          <div className="w-full p-6 rounded-2xl text-sm leading-loose bg-black text-white outline-none shadow-xl">
            <div className="whitespace-pre-wrap font-light">{aiCoachingValue}</div>
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
                 className="bg-black text-white px-3 py-1.5 rounded-full text-[8px] flex items-center gap-1 hover:bg-gray-800 transition-colors tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed"
               >
                 <Sparkles size={10} />
                 Generate
               </button>
              )}
            </div>
            <textarea
              className="w-full p-4 rounded-2xl text-sm leading-loose resize-none h-32 outline-none transition-all duration-300 bg-gray-50 border border-gray-200 focus:border-black focus:bg-white"
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
            <div className="space-y-3 bg-gradient-to-br from-emerald-50 to-teal-50 p-3 rounded-2xl border border-emerald-100">
               <div className="flex items-center gap-2 px-1">
                 <Sparkles size={12} className="text-emerald-600" />
                 <label className="nga-label text-[8px] text-emerald-700">AI Translation</label>
               </div>
               <textarea
                  readOnly
                  className="w-full p-4 text-sm leading-loose resize-none h-32 outline-none bg-white rounded-xl shadow-sm text-gray-800"
                  value={aiChineseValue}
                />
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    placeholder="Adjust style..."
                    className="flex-1 bg-white border border-emerald-100 py-2.5 px-3 rounded-xl text-xs outline-none focus:border-emerald-300 transition-colors shadow-sm"
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
                    className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
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
                 className="bg-black text-white px-3 py-1.5 rounded-full text-[8px] flex items-center gap-1 hover:bg-gray-800 transition-colors tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed"
               >
                 <Sparkles size={10} />
                 Generate
               </button>
              )}
            </div>
            <textarea
              className="w-full p-4 rounded-2xl text-sm leading-loose resize-none h-32 outline-none transition-all duration-300 bg-gray-50 border border-gray-200 focus:border-black focus:bg-white"
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
            <div className="space-y-3 bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-2xl border border-amber-100">
               <div className="flex items-center gap-2 px-1">
                 <Sparkles size={12} className="text-amber-600" />
                 <label className="nga-label text-[8px] text-amber-700">AI Vocab Extraction</label>
               </div>
               <textarea
                  readOnly
                  className="w-full p-4 text-sm leading-loose resize-none h-32 outline-none bg-white rounded-xl shadow-sm text-gray-800"
                  value={aiVocabAnalysisValue}
                />
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    placeholder="E.g. extract advanced idioms"
                    className="flex-1 bg-white border border-amber-100 py-2.5 px-3 rounded-xl text-xs outline-none focus:border-amber-300 transition-colors shadow-sm"
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
                    className="bg-amber-500 text-white p-2.5 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
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
