"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Sparkles, Edit2, ChevronDown, ChevronRight, Check, Volume2, Square } from "lucide-react";
import DualEditor from "@/components/DualEditor";
import { Part3Question } from "@/types";
import { useSearchParams } from "next/navigation";
import { useTTS } from "@/hooks/useTTS";
import { generateGeminiIA } from "@/lib/gemini";

export default function Part3Page() {
  const [mounted, setMounted] = useState(false);
  const { user, topics, updatePart3Question, updateProfile, togglePart3QuestionPrepared } = useStore();
  const searchParams = useSearchParams();
  const { playingId, toggleSpeech } = useTTS();

  // State to hold and manage currently editing question
  const [editingData, setEditingData] = useState<{ topicId: string; q: Part3Question } | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hook to instantly open editor if URL params are present.
  useEffect(() => {
    if (mounted && user) {
      const topicId = searchParams.get('topicId');
      const questionId = searchParams.get('questionId');
      
      if (topicId && questionId) {
        const t = topics.find(t => t.id === topicId && t.userId === user.id);
        if (t) {
          const q = t.part3Questions?.find(q => q.id === questionId);
          if (q) {
            setEditingData({ topicId: t.id, q });
            if (!expandedTopics.includes(t.id)) {
              setExpandedTopics(prev => [...prev, t.id]);
            }
          }
        }
      }
    }
  }, [mounted, searchParams, user, topics]);

  if (!mounted || !user) return null;

  const userTopics = topics.filter((t) => t.userId === user.id && (t.part3Questions?.length || 0) > 0);

  const handleAiGenerate = async (type: 'script' | 'translation' | 'vocab' | 'coaching', topicId: string, q: Part3Question, instruction?: string) => {
    if (!user) return;
    setIsGenerating(true);

    try {
      let baseUpdate: Partial<Part3Question> = {};
      const currAiSuggestions = q.aiSuggestions || {};

      const context = {
        question: q.question,
        chineseLogic: q.chineseLogic,
        preferredStyle: user.preferredStyle || 'Academic & Formal',
        age: user.age,
        gender: user.gender,
        targetBand: user.targetBand
      };

      if (type === 'script') {
        const answer = await generateGeminiIA('script', 'part3', context, instruction);
        const aiCoaching = await generateGeminiIA('coaching', 'part3', { ...context, question: answer });
        baseUpdate = { 
          aiCoaching, 
          aiSuggestions: { ...currAiSuggestions, answer } 
        };
      } else if (type === 'translation') {
        const translation = await generateGeminiIA('translation', 'part3', { ...context, question: q.aiSuggestions?.answer || q.answer || q.question }, instruction);
        baseUpdate = { aiSuggestions: { ...currAiSuggestions, translation } };
      } else if (type === 'vocab') {
        const vocabAnalysisText = await generateGeminiIA('vocab', 'part3', { ...context, question: q.aiSuggestions?.answer || q.answer || q.question }, instruction);
        baseUpdate = { aiSuggestions: { ...currAiSuggestions, vocabAnalysisText } };
      }

      updatePart3Question(topicId, q.id, baseUpdate);
      if (editingData?.q.id === q.id) {
        setEditingData({ topicId, q: { ...q, ...baseUpdate } });
      }
    } catch (error) {
      console.error("Part 3 AI Generation failed:", error);
      alert("AI Generation failed. Please check your API key or connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  // Compute stats
  let totalP3 = 0;
  let doneP3 = 0;
  userTopics.forEach(t => {
    t.part3Questions?.forEach(q => {
      totalP3++;
      if (q.answer && q.answer.trim().length > 0) doneP3++;
    });
  });

  return (
    <div className="space-y-16 pt-4 animate-in fade-in duration-700">
      <header className="flex justify-between items-center border-b border-gray-100 pb-12">
        <div className="space-y-2">
          <h1 className="text-4xl font-playfair tracking-tight">Part 3</h1>
          <p className="nga-label">Extended Discussion</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-playfair">{totalP3 > 0 ? Math.round((doneP3 / totalP3) * 100) : 0}%</p>
          <p className="nga-label text-[9px] mt-1">Coverage</p>
        </div>
      </header>

      {userTopics.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in slide-in-from-bottom-4">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex flex-col items-center justify-center">
            <Sparkles size={24} className="text-gray-300" />
          </div>
          <div className="space-y-2">
            <p className="font-playfair text-xl text-gray-800">No Extensions Yet</p>
            <p className="text-sm font-light text-gray-400 max-w-xs mx-auto leading-relaxed">
              Link Part 3 questions directly inside your Part 2 Topic drawer to see them aggregated here.
            </p>
          </div>
        </div>
      )}

      {userTopics.length > 0 && (
        <div className="space-y-4">
          {userTopics.map((topic) => {
            const isExpanded = expandedTopics.includes(topic.id);
            const qCount = topic.part3Questions?.length || 0;
            const qDone = topic.part3Questions?.filter(q => q.answer && q.answer.trim().length > 0).length || 0;
            
            return (
            <div key={topic.id} className="nga-card border border-gray-100 p-0 overflow-hidden">
              <button
                onClick={() => toggleTopic(topic.id)}
                className="w-full text-left p-6 flex justify-between items-center bg-white hover:bg-gray-50/50 transition-colors"
              >
                <div className="space-y-1.5 flex-1 pr-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold tracking-widest text-[#bbb] uppercase">{qDone}/{qCount}</span>
                    <h2 className="text-lg font-playfair">Related to: {topic.title}</h2>
                  </div>
                </div>
                {isExpanded ? <ChevronDown size={20} className="text-gray-300" /> : <ChevronRight size={20} className="text-gray-300" />}
              </button>

              {isExpanded && (
                <div className="pb-12 space-y-12 px-4 animate-in fade-in duration-500 border-t border-gray-50 bg-gray-50/10">
                  <div className="space-y-10 mt-8">
                    {topic.part3Questions?.map((q) => (
                      <div key={q.id} className="group space-y-4">
                        {editingData?.q.id === q.id ? (
                          <div className="space-y-10 bg-gray-50/30 p-10 rounded-[2rem] border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                              <label className="nga-label">AI Preferences</label>
                              <select 
                                className="nga-label text-[8px] bg-transparent border-b border-gray-100 outline-none cursor-pointer"
                                value={user.preferredStyle || ''}
                                onChange={(e) => updateProfile({ preferredStyle: (e.target.value || undefined) as any })}
                              >
                                <option value="">(Auto Style)</option>
                                {['Chill & Native', 'Academic & Formal', 'Professional & Sharp', 'Storyteller'].map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                              <DualEditor
                                title={q.question}
                                englishValue={editingData.q.answer || ''}
                                chineseValue={editingData.q.translation || ''}
                                chineseLogicValue={editingData.q.chineseLogic || ''}
                                vocabAnalysisValue={editingData.q.vocabAnalysisText || ''}
                                aiEnglishValue={editingData.q.aiSuggestions?.answer}
                                aiChineseValue={editingData.q.aiSuggestions?.translation}
                                aiVocabAnalysisValue={editingData.q.aiSuggestions?.vocabAnalysisText}
                                aiCoachingValue={editingData.q.aiCoaching}
                                onEnglishChange={(val) => setEditingData({ topicId: topic.id, q: { ...editingData.q, answer: val } })}
                                onChineseChange={(val) => setEditingData({ topicId: topic.id, q: { ...editingData.q, translation: val } })}
                                onChineseLogicChange={(val) => setEditingData({ topicId: topic.id, q: { ...editingData.q, chineseLogic: val } })}
                                onVocabAnalysisChange={(val) => setEditingData({ topicId: topic.id, q: { ...editingData.q, vocabAnalysisText: val } })}
                                onAiGenerate={(type, instruction) => handleAiGenerate(type, topic.id, editingData.q, instruction)}
                                isGenerating={isGenerating}
                              />
                              <div className="flex justify-end gap-6 pt-4 border-t border-gray-100">
                                <button onClick={() => setEditingData(null)} className="nga-label text-[9px]">Discard</button>
                                <button 
                                  onClick={() => {
                                    updatePart3Question(topic.id, q.id, { 
                                      answer: editingData.q.answer,
                                      translation: editingData.q.translation,
                                      chineseLogic: editingData.q.chineseLogic,
                                      vocabAnalysisText: editingData.q.vocabAnalysisText,
                                      aiCoaching: editingData.q.aiCoaching,
                                      aiSuggestions: editingData.q.aiSuggestions
                                    });
                                    setEditingData(null);
                                }} 
                                className="nga-button-outline flex items-center gap-2 px-6"
                              >
                                <Check size={14} />
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start gap-8 px-4">
                              <div className="flex items-start gap-4 flex-1">
                                <button 
                                  onClick={() => togglePart3QuestionPrepared(topic.id, q.id)}
                                  className={`mt-1.5 p-1 rounded-full border transition-all ${q.prepared ? 'bg-black text-white border-black' : 'border-gray-200 text-transparent hover:border-black'}`}
                                ><Check size={10}/></button>
                                <h3 className="text-xl font-playfair leading-relaxed">
                                  {q.question}
                                </h3>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button 
                                  onClick={() => setEditingData({ topicId: topic.id, q })}
                                  className="p-2 text-black transition-all bg-white rounded-full shadow-sm"
                                >
                                  <Edit2 size={14} strokeWidth={1.5} />
                                </button>
                              </div>
                            </div>
                            {q.answer && q.answer.trim().length > 0 && (
                                <div className="ml-4 pl-4 border-l border-gray-100 mt-4 max-w-[85%] flex items-start gap-3">
                                  <button onClick={() => toggleSpeech(q.id, q.answer || "", 'user')} className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-indigo-500 transition-colors">
                                    {playingId === q.id ? <Square size={14} className="fill-current" /> : <Volume2 size={14} />}
                                  </button>
                                  <p className="text-sm font-light text-gray-400 line-clamp-2 leading-relaxed flex-1">
                                      {q.answer}
                                  </p>
                                </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>
      )}
    </div>
  );
}
