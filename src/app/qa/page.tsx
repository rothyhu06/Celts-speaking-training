"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Plus, ChevronDown, ChevronUp, Edit2, Check, X, Book, Sparkles, Upload, Trash2, Volume2, Square } from "lucide-react";
import { Category, Question } from "@/types";
import DualEditor from "@/components/DualEditor";
import { useTTS } from "@/hooks/useTTS";
import { parseFileContent } from "@/lib/fileParser";
import { useRef } from "react";
import mammoth from "mammoth";
import { generateGeminiIA } from "@/lib/gemini";

export default function QAPage() {
  const [mounted, setMounted] = useState(false);
  const { categories, addCategory, addQuestion, updateQuestion, user, updateProfile, batchImportQA, deleteCategory, deleteQuestion } = useStore();
  const { playingId, toggleSpeech } = useTTS();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) return null;

  const userCategories = categories.filter(c => c.userId === user.id);

  const processImportedText = (text: string) => {
    try {
      const { qaPairs } = parseFileContent(text);
      if (qaPairs.length > 0) {
        batchImportQA(qaPairs);
        setImportStatus(`Successfully imported ${qaPairs.length} questions.`);
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus("No questions detected. Try adding a '?' at the end of questions.");
        setTimeout(() => setImportStatus(null), 5000);
      }
    } catch (error) {
      setImportStatus("Error parsing file. Please try a different file.");
      setTimeout(() => setImportStatus(null), 5000);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus("Processing file...");

    try {
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        processImportedText(result.value);
      } else if (file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          processImportedText(text);
        };
        reader.onerror = () => {
          setImportStatus("Error reading text file.");
          setIsImporting(false);
          setTimeout(() => setImportStatus(null), 3000);
        };
        reader.readAsText(file);
      } else {
        setImportStatus("Unsupported file type. Use .txt or .docx");
        setIsImporting(false);
        setTimeout(() => setImportStatus(null), 3000);
      }
    } catch (error) {
      setImportStatus("Error uploading file.");
      setIsImporting(false);
      setTimeout(() => setImportStatus(null), 3000);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      setNewCategoryName("");
      setIsAddingCategory(false);
    }
  };

  const handleAddQuestion = (catId: string) => {
    if (newQ.trim()) {
      addQuestion(catId, newQ.trim(), newA.trim());
      setNewQ("");
      setNewA("");
      setAddingToCategory(null);
    }
  };

  const handleAiGenerate = async (type: 'script' | 'translation' | 'vocab' | 'coaching', q: Question, catId: string, instruction?: string) => {
    if (!user) return;
    setIsGenerating(true);
    
    try {
      let baseUpdate: Partial<Question> = {};
      const currAiSuggestions = q.aiSuggestions || {};

      const context = {
        question: q.question,
        chineseLogic: q.chineseLogic,
        preferredStyle: user.preferredStyle,
        age: user.age,
        gender: user.gender,
        targetBand: user.targetBand
      };

      if (type === 'script') {
        const answer = await generateGeminiIA('script', 'part1', context, instruction);
        const aiCoaching = await generateGeminiIA('coaching', 'part1', { ...context, question: answer });
        baseUpdate = { 
          aiCoaching, 
          aiSuggestions: { ...currAiSuggestions, answer } 
        };
      } else if (type === 'translation') {
        const translation = await generateGeminiIA('translation', 'part1', { ...context, question: q.aiSuggestions?.answer || q.answer || q.question }, instruction);
        baseUpdate = { aiSuggestions: { ...currAiSuggestions, translation } };
      } else if (type === 'vocab') {
        const vocabAnalysisText = await generateGeminiIA('vocab', 'part1', { ...context, question: q.aiSuggestions?.answer || q.answer || q.question }, instruction);
        baseUpdate = { aiSuggestions: { ...currAiSuggestions, vocabAnalysisText } };
      } else if (type === 'coaching') {
        const aiCoaching = await generateGeminiIA('coaching', 'part1', { ...context, question: q.aiSuggestions?.answer || q.answer || q.question }, instruction);
        baseUpdate = { aiCoaching };
      }

      updateQuestion(catId, q.id, baseUpdate);
      if (editingQuestion?.id === q.id) {
        setEditingQuestion({ ...editingQuestion, ...baseUpdate });
      }
    } catch (error: any) {
      console.error("Part 2 AI Generation failed:", error);
      alert(`AI Generation failed: ${error.message || "Unknown error"}.`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-16 pt-4 animate-in fade-in duration-700">
      {importStatus && (
        <div className="fixed top-20 right-6 bg-black text-white text-[10px] uppercase tracking-widest px-6 py-3 rounded-full shadow-2xl z-50 animate-in slide-in-from-right-4 duration-500">
          {importStatus}
        </div>
      )}

      <header className="flex justify-between items-center border-b border-gray-100 pb-12">
        <div className="space-y-2">
          <h1 className="text-4xl font-playfair tracking-tight">Part 1 Q&A</h1>
          <p className="nga-label">Personal responses & topics</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 border border-black/5 rounded-full hover:bg-black hover:text-white transition-all group relative"
            title="Import from file (.txt, .docx)&#10;Supported labels:&#10;Topic: / 主题:&#10;Q: / 问题:&#10;A: / 答案:&#10;T: / 翻译:&#10;V: / 词汇:"
          >
            <Upload size={20} strokeWidth={1.5} />
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".txt,.docx" 
              onChange={handleFileUpload} 
            />
          </button>
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="p-3 border border-black/5 rounded-full hover:bg-black hover:text-white transition-all"
          >
            <Plus size={20} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {isAddingCategory && (
        <div className="nga-card border-black/20 animate-in fade-in slide-in-from-top-4">
          <div className="flex gap-4 items-center px-4">
            <input 
              autoFocus
              className="flex-1 border-b border-black py-4 outline-none text-lg font-playfair italic placeholder:text-gray-200"
              placeholder="Enter category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <button onClick={handleAddCategory} className="p-2 text-black"><Check size={20} /></button>
            <button onClick={() => setIsAddingCategory(false)} className="p-2 text-gray-400"><X size={20} /></button>
          </div>
        </div>
      )}

      <div className="space-y-0">
        {userCategories.length === 0 ? (
          <div className="text-center py-20 text-gray-300 italic font-playfair border-t border-dashed border-gray-100">
            Click the "+" to curate your first category.
          </div>
        ) : (
          userCategories.map((category: Category) => (
            <div key={category.id} className="border-b border-gray-100 last:border-0 overflow-hidden bg-white">
              <button 
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between py-10 hover:px-4 transition-all group"
              >
                <div className="flex items-baseline gap-6">
                  <span className="text-2xl font-playfair group-hover:italic transition-all">{category.name}</span>
                  <span className="nga-label text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">{category.questions.length} Items</span>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete entire category "${category.name}"?`)) deleteCategory(category.id);
                    }}
                    className="p-2 text-black hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                  {expandedCategories.includes(category.id) ? <ChevronUp size={18} strokeWidth={1} /> : <ChevronDown size={18} strokeWidth={1} />}
                </div>
              </button>

              {expandedCategories.includes(category.id) && (
                <div className="pb-12 space-y-12 px-4 animate-in fade-in duration-500">
                  <div className="space-y-10">
                    {category.questions.map((q) => (
                      <div key={q.id} className="group space-y-4">
                        {editingQuestion?.id === q.id ? (
                          <div className="space-y-10 bg-gray-50/30 p-10 rounded-[2rem] border border-gray-100">
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
                                englishValue={editingQuestion.answer}
                                chineseValue={editingQuestion.translation || ''}
                                chineseLogicValue={editingQuestion.chineseLogic || ''}
                                vocabAnalysisValue={editingQuestion.vocabAnalysisText || ''}
                                aiEnglishValue={editingQuestion.aiSuggestions?.answer}
                                aiChineseValue={editingQuestion.aiSuggestions?.translation}
                                aiVocabAnalysisValue={editingQuestion.aiSuggestions?.vocabAnalysisText}
                                aiCoachingValue={editingQuestion.aiCoaching}
                                onEnglishChange={(val) => setEditingQuestion((prev: any) => ({ ...prev, answer: val }))}
                                onChineseChange={(val) => setEditingQuestion((prev: any) => ({ ...prev, translation: val }))}
                                onChineseLogicChange={(val) => setEditingQuestion((prev: any) => ({ ...prev, chineseLogic: val }))}
                                onVocabAnalysisChange={(val) => setEditingQuestion((prev: any) => ({ ...prev, vocabAnalysisText: val }))}
                                onAiGenerate={(type, instruction) => handleAiGenerate(type, editingQuestion, category.id, instruction)}
                                isGenerating={isGenerating}
                              />
                              <div className="flex justify-end gap-6 pt-4 border-t border-gray-100">
                                <button onClick={() => setEditingQuestion(null)} className="nga-label text-[9px]">Discard</button>
                                <button 
                                  onClick={() => {
                                    updateQuestion(category.id, q.id, { 
                                      answer: editingQuestion.answer,
                                      translation: editingQuestion.translation,
                                      chineseLogic: editingQuestion.chineseLogic,
                                      vocabAnalysisText: editingQuestion.vocabAnalysisText,
                                      aiCoaching: editingQuestion.aiCoaching,
                                      isAiGenerated: editingQuestion.isAiGenerated,
                                      aiSuggestions: editingQuestion.aiSuggestions
                                    });
                                    setEditingQuestion(null);
                                }} 
                                className="nga-button-outline"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start gap-8">
                              <h3 className="text-xl font-playfair leading-relaxed">{q.question}</h3>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setEditingQuestion(q)}
                                  className="p-2 text-black transition-all"
                                >
                                  <Edit2 size={14} strokeWidth={1.5} />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm('Delete this question?')) deleteQuestion(category.id, q.id);
                                  }}
                                  className="p-2 text-black hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={14} strokeWidth={1.5} />
                                </button>
                              </div>
                            </div>
                            <div className="pl-6 border-l border-gray-100 space-y-4">
                              <div className="flex items-start gap-3">
                                {q.answer && (
                                  <button onClick={() => toggleSpeech(q.id, q.answer, 'user')} className="mt-1 flex-shrink-0 text-gray-300 hover:text-indigo-500 transition-colors">
                                    {playingId === q.id ? <Square size={14} className="fill-current" /> : <Volume2 size={14} />}
                                  </button>
                                )}
                                <p className="text-sm text-muted leading-loose whitespace-pre-wrap font-light flex-1">
                                  {q.answer || <span className="italic text-gray-300">No response recorded yet.</span>}
                                </p>
                              </div>
                              {q.translation && (
                                <p className="text-xs text-gray-400 italic leading-relaxed">{q.translation}</p>
                              )}
                              {q.vocabAnalysisText && (
                                <div className="pt-2 border-t border-gray-50">
                                  <p className="text-xs text-gray-500 italic whitespace-pre-wrap">{q.vocabAnalysisText}</p>
                                </div>
                              )}
                              {q.vocabAnalysis && q.vocabAnalysis.length > 0 && !q.vocabAnalysisText && (
                                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-gray-50">
                                  {q.vocabAnalysis.map((v: any, i: number) => (
                                    <span key={i} className="text-[10px] font-playfair italic">
                                      <span className="text-black">{v.phrase}</span>
                                      <span className="text-gray-300 mx-1">:</span>
                                      <span className="text-gray-400">{v.translation}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {addingToCategory === category.id ? (
                    <div className="space-y-6 pt-12 border-t border-gray-100 animate-in slide-in-from-bottom-4">
                      <input 
                        autoFocus
                        className="w-full border-b border-black py-2 outline-none text-xl font-playfair italic placeholder:text-gray-200"
                        placeholder="New question..."
                        value={newQ}
                        onChange={e => setNewQ(e.target.value)}
                      />
                      <textarea 
                        className="w-full border border-gray-100 rounded-2xl p-6 text-sm outline-none h-32 bg-gray-50/30 resize-none leading-relaxed"
                        placeholder="Draft your response here..."
                        value={newA}
                        onChange={e => setNewA(e.target.value)}
                      />
                      <div className="flex justify-end gap-6 items-center">
                        <button onClick={() => setAddingToCategory(null)} className="nga-label text-[9px] hover:text-black transition-colors">Discard</button>
                        <button onClick={() => handleAddQuestion(category.id)} className="nga-button-outline">Add Entry</button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setAddingToCategory(category.id)}
                      className="w-full py-6 border border-dashed border-gray-100 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-bold text-gray-300 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2 mt-4"
                    >
                      <Plus size={14} />
                      New Entry
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
