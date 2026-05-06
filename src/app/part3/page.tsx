"use client";

import { useEffect, useState, Suspense } from "react";
import { useStore } from "@/lib/store";
import { Sparkles, Edit2, ChevronDown, ChevronRight, Check, Volume2, Square, CheckSquare, Plus, Trash2 } from "lucide-react";
import DualEditor from "@/components/DualEditor";
import { Part3Question } from "@/types";
import { useSearchParams } from "next/navigation";
import { useTTS } from "@/hooks/useTTS";
import { generateGeminiIA } from "@/lib/gemini";

export default function Part3Page() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-playfair italic">Gathering insights...</div>}>
      <Part3PageContent />
    </Suspense>
  );
}

function Part3PageContent() {
  const [mounted, setMounted] = useState(false);
  const { user, topics, updatePart3Question, updateProfile, togglePart3QuestionPrepared, batchDeletePart3Questions, addPart3Question, deletePart3Question } = useStore();
  const searchParams = useSearchParams();
  const { playingId, toggleSpeech } = useTTS();
 
  // State to hold and manage currently editing question
  const [editingData, setEditingData] = useState<{ topicId: string; q: Part3Question } | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [addingToTopicId, setAddingToTopicId] = useState<string | null>(null);
  const [newQ, setNewQ] = useState("");

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
        baseUpdate = { 
          aiSuggestions: { ...currAiSuggestions, answer } 
        };
      } else if (type === 'coaching') {
        const manualAnswer = editingData?.q.answer || q.answer || "";
        if (!manualAnswer.trim()) throw new Error("Please write a manual script first before evaluating.");
        const aiCoaching = await generateGeminiIA('coaching', 'part3', { ...context, question: manualAnswer }, instruction);
        baseUpdate = { aiCoaching };
      } else if (type === 'translation') {
        const translation = await generateGeminiIA('translation', 'part3', { ...context, question: q.aiSuggestions?.answer || q.answer || q.question }, instruction);
        baseUpdate = { aiSuggestions: { ...currAiSuggestions, translation } };
      } else if (type === 'vocab') {
        const vocabAnalysisText = await generateGeminiIA('vocab', 'part3', { ...context, question: q.aiSuggestions?.answer || q.answer || q.question }, instruction);
        baseUpdate = { aiSuggestions: { ...currAiSuggestions, vocabAnalysisText } };
      }

      updatePart3Question(topicId, q.id, baseUpdate);
      if (editingData?.q.id === q.id) {
        setEditingData(prev => prev ? { topicId, q: { ...prev.q, ...baseUpdate } } : null);
      }
    } catch (error: any) {
      console.error("Part 3 AI Generation failed:", error);
      alert(error.message || "AI Generation failed. Please check your API key or connection.");
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
      if (q.prepared) doneP3++;
    });
  });

  return (
    <div className="space-y-16 pt-4 animate-in fade-in duration-700">
      <header className="flex justify-between items-center border-b border-[var(--border-color)] pb-12">
        <div className="space-y-2">
          <h1 className="text-4xl font-playfair tracking-tight">Part 3</h1>
          <p className="nga-label">Extended Discussion</p>
        </div>
        <div className="flex gap-4 items-center">
          {isSelectMode && (
            <button
              onClick={() => {
                const allP3Ids = userTopics.flatMap(t => (t.part3Questions || []).map(q => q.id));
                if (selectedQuestionIds.length === allP3Ids.length && allP3Ids.length > 0) {
                  setSelectedQuestionIds([]);
                } else {
                  setSelectedQuestionIds(allP3Ids);
                }
              }}
              className="px-4 py-3 border border-[var(--border-color)] text-[var(--fg-primary)] rounded-full hover:bg-[var(--fg-primary)] hover:text-white transition-all text-[10px] uppercase tracking-widest font-bold shadow-sm"
            >
              {selectedQuestionIds.length === userTopics.flatMap(t => t.part3Questions || []).length && userTopics.flatMap(t => t.part3Questions || []).length > 0 ? "Deselect All" : "Select All"}
            </button>
          )}
          {selectedQuestionIds.length > 0 && isSelectMode && (
            <button
              onClick={() => {
                if (confirm(`Delete ${selectedQuestionIds.length} questions?`)) {
                  batchDeletePart3Questions(selectedQuestionIds);
                  setSelectedQuestionIds([]);
                  setIsSelectMode(false);
                }
              }}
              className="px-4 py-3 border border-[var(--danger-color)] text-[var(--danger-color)] rounded-full hover:bg-[var(--danger-color)] hover:text-white transition-all text-[10px] uppercase tracking-widest font-bold shadow-sm"
            >
              Delete ({selectedQuestionIds.length})
            </button>
          )}
          <button 
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              if (isSelectMode) setSelectedQuestionIds([]);
            }}
            className={`p-3 border border-[var(--border-color)] rounded-full transition-all group relative shadow-sm ${
              isSelectMode ? "bg-[var(--fg-primary)] text-[var(--bg-primary)]" : "hover:bg-[var(--fg-primary)] hover:text-[var(--bg-primary)] text-[var(--fg-primary)]"
            }`}
            title="Batch Select Mode"
          >
            <CheckSquare size={20} strokeWidth={1.5} />
          </button>
          <div className="text-right border-l border-[var(--border-color)] pl-4">
            <p className="text-3xl font-playfair">{totalP3 > 0 ? Math.round((doneP3 / totalP3) * 100) : 0}%</p>
            <p className="nga-label text-[9px] mt-1">Coverage</p>
          </div>
        </div>
      </header>

      {userTopics.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in slide-in-from-bottom-4">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex flex-col items-center justify-center">
            <Sparkles size={24} className="text-[var(--fg-muted)]" />
          </div>
          <div className="space-y-2">
            <p className="font-playfair text-xl text-[var(--fg-primary)]">No Extensions Yet</p>
            <p className="text-sm font-light text-[var(--fg-muted)] max-w-xs mx-auto leading-relaxed">
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
            const qDone = topic.part3Questions?.filter(q => q.prepared).length || 0;
            
            return (
            <div key={topic.id} className="nga-card border border-[var(--border-color)] p-0 overflow-hidden bg-[var(--bg-card)]">
              <button
                onClick={() => toggleTopic(topic.id)}
                className="w-full text-left p-6 flex justify-between items-center bg-transparent hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <div className="space-y-1.5 flex-1 pr-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold tracking-widest text-[var(--fg-muted)] uppercase">{qDone}/{qCount}</span>
                    <h2 className="text-lg font-playfair text-[var(--fg-primary)]">Related to: {topic.title}</h2>
                  </div>
                </div>
                {isExpanded ? <ChevronDown size={20} className="text-[var(--fg-muted)]" /> : <ChevronRight size={20} className="text-[var(--fg-muted)]" />}
              </button>

              {isExpanded && (
                <div className="pb-12 space-y-12 px-4 animate-in fade-in duration-500 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/30">
                  <div className="space-y-10 mt-8">
                    {topic.part3Questions?.map((q) => (
                      <div 
                        key={q.id} 
                        className={`group space-y-4 relative rounded-3xl transition-all duration-1000 ${selectedQuestionIds.includes(q.id) ? 'bg-[var(--accent-soft)]/20 p-4 -mx-4 ring-1 ring-[var(--fg-primary)]' : ''}`}
                        onClick={() => {
                          if (isSelectMode) {
                            setSelectedQuestionIds(prev => prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id]);
                          }
                        }}
                      >
                        {isSelectMode && (
                          <div className="absolute -left-10 top-4 text-[var(--fg-primary)] opacity-80 cursor-pointer">
                            {selectedQuestionIds.includes(q.id) ? <CheckSquare size={20} /> : <div className="w-5 h-5 border-2 border-[var(--fg-primary)] rounded-[4px] opacity-40"></div>}
                          </div>
                        )}
                        {editingData?.q.id === q.id ? (
                          <div className="space-y-10 bg-[var(--bg-card)] p-10 rounded-[2rem] border border-[var(--border-color)] shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                              <label className="nga-label">AI Preferences</label>
                              <select 
                                className="nga-label text-[8px] bg-transparent border-b border-[var(--border-color)] outline-none cursor-pointer"
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
                                onSave={() => {
                                  updatePart3Question(topic.id, q.id, { 
                                    answer: editingData.q.answer,
                                    translation: editingData.q.translation,
                                    chineseLogic: editingData.q.chineseLogic,
                                    vocabAnalysisText: editingData.q.vocabAnalysisText,
                                    aiSuggestions: editingData.q.aiSuggestions
                                  });
                                }}
                              />
                              <div className="flex justify-end gap-6 pt-4 border-t border-[var(--border-color)] italic transition-all">
                                <button 
                                  onClick={() => {
                                    if (snapshot) updatePart3Question(topic.id, q.id, snapshot);
                                    setEditingData(null);
                                    setSnapshot(null);
                                  }} 
                                  className="text-[10px] text-[var(--fg-muted)] hover:text-[var(--danger-color)] tracking-widest uppercase font-bold"
                                >
                                  Discard Changes
                                </button>
                                <button onClick={() => { setEditingData(null); setSnapshot(null); }} className="nga-button-outline px-10">Done</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start gap-8 px-4">
                              <div className="flex items-start gap-4 flex-1">
                                <button 
                                  onClick={() => togglePart3QuestionPrepared(topic.id, q.id)}
                                  className={`mt-1.5 p-1 rounded-full border transition-all ${q.prepared ? 'bg-[var(--fg-primary)] text-[var(--bg-primary)] border-[var(--fg-primary)]' : 'border-[var(--border-color)] text-transparent hover:border-[var(--fg-primary)]'}`}
                                ><Check size={10}/></button>
                                <h3 className="text-xl font-playfair leading-relaxed text-[var(--fg-primary)]">
                                  {q.question}
                                </h3>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Delete this question?')) deletePart3Question(topic.id, q.id);
                                  }}
                                  className="p-2 text-[var(--fg-primary)] transition-all bg-[var(--bg-card)] rounded-full shadow-sm border border-[var(--border-color)] hover:border-[var(--danger-color)] hover:text-[var(--danger-color)]"
                                >
                                  <Trash2 size={14} strokeWidth={1.5} />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingData({ topicId: topic.id, q });
                                    setSnapshot({...q});
                                  }}
                                  className="p-2 text-[var(--fg-primary)] transition-all bg-[var(--bg-card)] rounded-full shadow-sm border border-[var(--border-color)] hover:border-[var(--fg-primary)]"
                                >
                                  <Edit2 size={14} strokeWidth={1.5} />
                                </button>
                              </div>
                            </div>
                            {q.answer && q.answer.trim().length > 0 && (
                                <div className="ml-4 pl-4 border-l border-[var(--border-color)] mt-4 max-w-[85%] flex items-start gap-3">
                                  <button onClick={() => toggleSpeech(q.id, q.answer || "", 'user')} className="mt-0.5 flex-shrink-0 text-[var(--fg-muted)] hover:text-indigo-500 transition-colors">
                                    {playingId === q.id ? <Square size={14} className="fill-current" /> : <Volume2 size={14} />}
                                  </button>
                                  <p className="text-sm font-light text-[var(--fg-muted)] line-clamp-2 leading-relaxed flex-1">
                                      {q.answer}
                                  </p>
                                </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}

                    {addingToTopicId === topic.id ? (
                      <div className="space-y-4 pt-6 border-t border-[var(--border-color)] animate-in slide-in-from-bottom-4">
                        <input 
                          autoFocus
                          className="w-full border-b border-[var(--fg-primary)] py-2 outline-none text-xl font-semibold placeholder:text-[var(--fg-muted)] bg-transparent text-[var(--fg-primary)]"
                          placeholder="New Part 3 question..."
                          value={newQ}
                          onChange={e => setNewQ(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newQ.trim()) {
                              addPart3Question(topic.id, newQ.trim());
                              setNewQ("");
                              setAddingToTopicId(null);
                            }
                          }}
                        />
                        <div className="flex justify-end gap-6 items-center">
                          <button onClick={() => setAddingToTopicId(null)} className="nga-label text-[9px] hover:text-[var(--fg-primary)] transition-colors">Cancel</button>
                          <button onClick={() => {
                            if (newQ.trim()) {
                              addPart3Question(topic.id, newQ.trim());
                              setNewQ("");
                              setAddingToTopicId(null);
                            }
                          }} className="nga-button-outline">Add Question</button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setAddingToTopicId(topic.id)}
                        className="w-full py-6 border border-dashed border-[var(--border-color)] rounded-2xl text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--fg-muted)] hover:border-[var(--fg-primary)] hover:text-[var(--fg-primary)] transition-all flex items-center justify-center gap-2 mt-4"
                      >
                        <Plus size={14} />
                        New Question
                      </button>
                    )}
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
