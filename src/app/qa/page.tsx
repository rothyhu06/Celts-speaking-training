"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Plus, ChevronDown, ChevronUp, Edit2, Check, X, Book, Sparkles, Upload, Trash2, Volume2, Square, HelpCircle } from "lucide-react";
import { Category, Question } from "@/types";
import DualEditor from "@/components/DualEditor";
import { useTTS } from "@/hooks/useTTS";
import { parseFileContent } from "@/lib/fileParser";
import { useRef } from "react";
import mammoth from "mammoth";
import { generateGeminiIA } from "@/lib/gemini";

export default function QAPage() {
  const [mounted, setMounted] = useState(false);
  const { categories, addCategory, addQuestion, updateQuestion, user, updateProfile, batchImportQA, deleteCategory, updateCategory, deleteQuestion } = useStore();
  const { playingId, toggleSpeech } = useTTS();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

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

      {/* Bilingual Import Guide Modal */}
      {isGuideOpen && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-full max-w-2xl bg-white border border-gray-100 shadow-2xl rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center">
              <div className="space-y-1">
                <h2 className="text-3xl font-playfair tracking-tight">Import Guide</h2>
                <p className="nga-label text-[10px] text-gray-400">导入指南 (中英双语版)</p>
              </div>
              <button 
                onClick={() => setIsGuideOpen(false)}
                className="p-3 hover:bg-gray-50 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
              {/* General Rules */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold">1</div>
                  <h3 className="text-sm font-bold tracking-widest uppercase">General Rules (通用规则)</h3>
                </div>
                <div className="pl-9 space-y-4">
                  <p className="text-sm leading-relaxed text-gray-600">
                    <strong className="text-black">File Types:</strong> .txt or .docx only. Word files are automatically parsed for plain text.
                    <br/>
                    <small className="text-gray-400">支持文件格式：仅限 .txt 或 .docx。Word 文件会自动提取文本解析。</small>
                  </p>
                  <p className="text-sm leading-relaxed text-gray-600">
                    <strong className="text-black">Trigger:</strong> Any line ending with a <span className="underline">?</span> will start a new question block.
                    <br/>
                    <small className="text-gray-400">触发机制：任何以 ? 结尾的行都会被识别为新题目的开始。</small>
                  </p>
                </div>
              </section>

              {/* Keywords Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold">2</div>
                  <h3 className="text-sm font-bold tracking-widest uppercase">Keywords (识别关键字)</h3>
                </div>
                <div className="pl-9 grid grid-cols-2 gap-4">
                  {[
                    { en: 'Topic', zh: '主题/分类', markers: 'Topic:, 主题:' },
                    { en: 'Question', zh: '题目', markers: 'Q:, Question:, 问题:' },
                    { en: 'Answer', zh: '参考答案', markers: 'A:, Answer:, 答案:' },
                    { en: 'Translation', zh: '中文翻译', markers: 'T:, Translation:, 翻译:' },
                    { en: 'Vocab', zh: '词汇笔记', markers: 'V:, Vocab:, 词汇:' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
                      <p className="text-[10px] uppercase tracking-tighter font-bold text-gray-400 mb-1">{item.en} ({item.zh})</p>
                      <code className="text-[11px] font-mono text-indigo-600">{item.markers}</code>
                    </div>
                  ))}
                </div>
              </section>

              {/* Template Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold">3</div>
                  <h3 className="text-sm font-bold tracking-widest uppercase">Example Template (示例模板)</h3>
                </div>
                <div className="pl-9">
                  <div className="bg-black text-white p-8 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Book size={60} />
                    </div>
                    <pre className="text-xs font-mono leading-loose whitespace-pre-wrap opacity-80">
{`主题: Work & Study
Q: Do you prefer to study in the morning or evening?
A: Well, for me, I'm definitely a morning person. 
T: 对我来说，我绝对是一个早起的人。
V: morning person - 早起的人; definitely - 肯定

Q: Is it important to take breaks?
A: Absolutely! I find that my focus tends to dip...
T: 当然！我发现我的注意力往往会下降...`}
                    </pre>
                  </div>
                </div>
              </section>
            </div>

            <div className="p-10 border-t border-gray-50 flex justify-center">
              <button 
                onClick={() => setIsGuideOpen(false)}
                className="nga-button-outline px-12"
              >
                I Understand (了解了)
              </button>
            </div>
          </div>
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
            onClick={() => setIsGuideOpen(true)}
            className="p-3 border border-black/5 rounded-full hover:bg-black hover:text-white transition-all group relative mr-2"
            title="View Import Guide (查看导入指南)"
          >
            <HelpCircle size={20} strokeWidth={1.5} />
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
              <div className="w-full flex items-center justify-between py-10 hover:px-4 transition-all group">
                <div 
                  onClick={() => toggleCategory(category.id)}
                  className="flex-1 flex items-baseline gap-6 cursor-pointer"
                >
                  {editingCatId === category.id ? (
                    <div className="flex gap-4 items-center flex-1 pr-10" onClick={(e) => e.stopPropagation()}>
                      <input 
                        autoFocus
                        className="flex-1 border-b border-black py-1 outline-none text-2xl font-playfair italic bg-transparent"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateCategory(category.id, { name: editingCatName });
                            setEditingCatId(null);
                          } else if (e.key === 'Escape') {
                            setEditingCatId(null);
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          updateCategory(category.id, { name: editingCatName });
                          setEditingCatId(null);
                        }} 
                        className="p-2 text-black"
                      >
                        <Check size={20} />
                      </button>
                      <button onClick={() => setEditingCatId(null)} className="p-2 text-gray-400"><X size={20} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="text-2xl font-playfair group-hover:italic transition-all">{category.name}</span>
                      <span className="nga-label text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">{category.questions.length} Items</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {!editingCatId && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCatId(category.id);
                        setEditingCatName(category.name);
                      }}
                      className="p-2 text-black hover:scale-110 transition-all"
                    >
                      <Edit2 size={14} strokeWidth={1.5} />
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete entire category "${category.name}"?`)) deleteCategory(category.id);
                    }}
                    className="p-2 text-black hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                  {expandedCategories.includes(category.id) ? (
                    <button onClick={() => toggleCategory(category.id)}><ChevronUp size={18} strokeWidth={1} /></button>
                  ) : (
                    <button onClick={() => toggleCategory(category.id)}><ChevronDown size={18} strokeWidth={1} /></button>
                  )}
                </div>
              </div>

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
