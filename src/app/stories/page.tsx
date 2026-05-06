"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { Topic, Story } from "@/types";
import {
  Plus, X, Check, ChevronDown, Sparkles, Link2, Trash2,
  BookOpen, Edit2, Upload, MessageCircle, HelpCircle, FileText
} from "lucide-react";
import DualEditor from "@/components/DualEditor";
import { useRouter } from "next/navigation";
import { generateGeminiIA } from "@/lib/gemini";

const TAGS = ["Person", "Object", "Place", "Event"] as const;
const AI_SCRIPTS: Record<string, string> = {
  Person: `So I'd love to talk about my university professor, Professor Li — she's honestly one of the most inspiring people I've ever had the pleasure of knowing. I met her in my first year, and what struck me immediately was this sense of genuine passion she had for the subject. Like, she didn't just teach — she made you feel like you were uncovering secrets together.

What I think influenced me the most was her attitude toward failure. She'd always say, "Getting it wrong just means you're learning something new." That completely shifted how I approach challenges in my own life. Before her class, I was terrified of making mistakes — now I actually embrace them.

I think what she did was show me that intelligence isn't about being perfect — it's about being curious and resilient. That's something I carry with me every single day, honestly.`,
  Object: `The object I want to describe is actually my first smartphone. It sounds a bit ordinary, but it genuinely meant a lot to me at the time. My parents gave it to me when I started secondary school — I remember unwrapping it and just staring at it in disbelief.

Before that, I'd only ever used shared family computers, so having something that was completely mine felt surreal. I immediately downloaded all my favourite apps, started video-calling my cousins who lived in another city — it was like my whole world suddenly expanded overnight.

Looking back, I think it marked a real turning point in my independence. I started navigating places on my own, organising my own schedule, connecting with a much wider circle of people. So yeah, it's just a phone — but it genuinely shaped who I became in those early teenage years.`,
  Place: `The place I'd like to describe is a small park near my childhood home — honestly, it's nothing fancy by most people's standards, just some trees, a little pond, and a few old benches. But it holds so much meaning for me personally.

I used to go there almost every weekend with my dad when I was young. We'd bring some bread for the ducks and just... sit there for ages, talking about everything and nothing. Those mornings were so peaceful — no pressure, no screens, just the two of us.

Even now, when I go back to visit, I always make time to walk through that park. There's something about the smell of the grass and the way the light filters through the trees that instantly takes me back. It's like a reset button, you know? Just standing there, I feel completely calm.`,
  Event: `So I want to talk about the summer I taught myself to cook — this was about two years ago, during a particularly long break from university. Before that, my cooking skills were genuinely embarrassing. Like, I could barely boil an egg.

I started watching a lot of cooking videos online, specifically ones focused on simple Chinese home cooking, and I just sort of fell into this rabbit hole. Within a week I was attempting stir-fries and dumplings from scratch. Some were disasters, but a few actually turned out really well.

What made it so rewarding wasn't just the food itself — it was this sense of self-sufficiency. I realised I could learn pretty much anything if I just committed to practising consistently. Now I cook dinner for my flatmates at least twice a week, and it's honestly become one of my favourite ways to de-stress.`,
};

export default function StoriesPage() {
  const [mounted, setMounted] = useState(false);
  const { topics, stories, user, addTopic, updateTopic, deleteTopic, addStory, updateStory, deleteStory, addPart3Question, updatePart3Question, deletePart3Question, batchImportPart3, batchImportTopicsFull } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // New Part 3 UI state
  const [newPart3Q, setNewPart3Q] = useState("");
  const [isBulkPart3, setIsBulkPart3] = useState(false);
  const [part3BulkText, setPart3BulkText] = useState("");

  // UI state
  const [activeDrawerTopicId, setActiveDrawerTopicId] = useState<string | null>(null);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [isAddingStory, setIsAddingStory] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicCueCard, setNewTopicCueCard] = useState("");
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryTag, setNewStoryTag] = useState<typeof TAGS[number]>("Person");
  const [newStorySummary, setNewStorySummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tab, setTab] = useState<"topics" | "stories" | "map">("topics");
  const [bulkText, setBulkText] = useState("");
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicTitle, setEditingTopicTitle] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [localEditingTopic, setLocalEditingTopic] = useState<Topic | null>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  
  const activeTopic = topics.find((t) => t.id === activeDrawerTopicId) ?? null;

  useEffect(() => {
    if (activeTopic) {
      setLocalEditingTopic(activeTopic);
      setSnapshot({...activeTopic});
    } else {
      setLocalEditingTopic(null);
      setSnapshot(null);
    }
  }, [activeDrawerTopicId]);

  if (!mounted || !user) return null;

  const uid = user.id;
  const userTopics = topics.filter((t) => t.userId === uid);
  const userStories = stories.filter((s) => s.userId === uid);

  const handleAiGenerate = async (type: 'script' | 'translation' | 'vocab' | 'coaching', topic: Topic, instruction?: string) => {
    const story = topic.linkedStoryId ? userStories.find((s) => s.id === topic.linkedStoryId) : null;
    setIsGenerating(true);

    try {
      let baseUpdate: Partial<Topic> = {};
      const currAiSuggestions = topic.aiSuggestions || {};

      const context = {
        question: topic.title,
        cueCard: topic.cueCard,
        storyDetails: story ? story.summary : undefined,
        chineseLogic: topic.chineseLogic,
        preferredStyle: user.preferredStyle,
        age: user.age,
        gender: user.gender,
        targetBand: user.targetBand
      };

      if (type === 'script') {
        const script = await generateGeminiIA('script', 'part2', context, instruction);
        const aiCoaching = await generateGeminiIA('coaching', 'part2', { ...context, question: script });
        
        // Basic transition tip generation logic (can be further refined)
        const transitionTip = "Transition Tip: Part 2 was a personal story. For Part 3, zoom out. Use phrases like 'Generally speaking' or 'In my society' to sound more abstract and analytical.";
        
        baseUpdate = {
          aiCoaching,
          transitionTip,
          aiSuggestions: { ...currAiSuggestions, script }
        };
      } else if (type === 'translation') {
        const translation = await generateGeminiIA('translation', 'part2', { ...context, question: topic.aiSuggestions?.script || topic.script || topic.title }, instruction);
        baseUpdate = { aiSuggestions: { ...currAiSuggestions, translation } };
      } else if (type === 'vocab') {
        const vocabAnalysisText = await generateGeminiIA('vocab', 'part2', { ...context, question: topic.aiSuggestions?.script || topic.script || topic.title }, instruction);
        baseUpdate = { aiSuggestions: { ...currAiSuggestions, vocabAnalysisText } };
      }

      updateTopic(topic.id, baseUpdate);
    } catch (error) {
      console.error("Part 2 AI Generation failed:", error);
      alert("AI Generation failed. Please check your API key or connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const processImportedText = (text: string) => {
    const blocks = text.split(/\n\s*---\s*\n|\n\s*\n/).map(b => b.trim()).filter(Boolean);
    const topicsToImport: any[] = [];

    blocks.forEach((block) => {
      // Parse with regex if tags exist
      const titleMatch = block.match(/\[TopicTitle\]([\s\S]*?)(?=\[(CueCard|Answer|Translation|Vocab|Part3)\]|$)/i);
      const cueCardMatch = block.match(/\[CueCard\]([\s\S]*?)(?=\[(TopicTitle|Answer|Translation|Vocab|Part3)\]|$)/i);
      const answerMatch = block.match(/\[Answer\]([\s\S]*?)(?=\[(TopicTitle|CueCard|Translation|Vocab|Part3)\]|$)/i);
      const translationMatch = block.match(/\[Translation\]([\s\S]*?)(?=\[(TopicTitle|CueCard|Answer|Vocab|Part3)\]|$)/i);
      const vocabMatch = block.match(/\[Vocab\]([\s\S]*?)(?=\[(TopicTitle|CueCard|Answer|Translation|Part3)\]|$)/i);
      const part3Match = block.match(/\[Part3\]([\s\S]*?)(?=\[(TopicTitle|CueCard|Answer|Translation|Vocab)\]|$)/i);

      let title = "";
      let cueCard = "";
      
      // If we don't have tags, assume old format
      if (!titleMatch && !block.toLowerCase().includes('[topictitle]')) {
         const lines = block.split('\n');
         title = lines[0].trim();
         cueCard = lines.slice(1).join('\n').trim();
         if (title.length > 3) {
           topicsToImport.push({ title, cueCard: cueCard || undefined });
         }
      } else {
         title = titleMatch ? titleMatch[1].trim() : "";
         cueCard = cueCardMatch ? cueCardMatch[1].trim() : "";
         const script = answerMatch ? answerMatch[1].trim() : "";
         const translation = translationMatch ? translationMatch[1].trim() : "";
         const vocabAnalysisText = vocabMatch ? vocabMatch[1].trim() : "";
         
         const part3Questions = part3Match 
           ? part3Match[1].split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
           : [];
           
         if (title.length > 3) {
            topicsToImport.push({
               title,
               cueCard: cueCard || undefined,
               script: script || undefined,
               translation: translation || undefined,
               vocabAnalysisText: vocabAnalysisText || undefined,
               part3Questions
            });
         }
      }
    });

    if (topicsToImport.length > 0) {
      batchImportTopicsFull(topicsToImport);
    }
    
    setImportStatus(`Imported ${topicsToImport.length} topics.`);
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleBulkImport = () => {
    processImportedText(bulkText);
    setBulkText("");
    setIsBulkMode(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus("Processing file...");

    try {
      if (file.name.endsWith('.docx')) {
        const mammoth = await import("mammoth");
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
          setTimeout(() => setImportStatus(null), 3000);
        };
        reader.readAsText(file);
      } else {
        setImportStatus("Unsupported file type. Use .txt or .docx");
        setTimeout(() => setImportStatus(null), 3000);
      }
    } catch (error) {
      setImportStatus("Error uploading file.");
      setTimeout(() => setImportStatus(null), 3000);
    } finally {
      setIsImporting(false);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePart3Import = (topicId: string) => {
    const lines = part3BulkText.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      batchImportPart3(topicId, lines);
      setImportStatus(`Imported ${lines.length} Part 3 questions.`);
      setTimeout(() => setImportStatus(null), 3000);
    }
    setPart3BulkText("");
    setIsBulkPart3(false);
  };

  return (
    <div className="animate-in fade-in duration-700 space-y-10">
      {importStatus && (
        <div className="fixed top-20 right-6 bg-[var(--fg-primary)] text-[var(--bg-primary)] text-[10px] uppercase tracking-widest px-6 py-3 rounded-full shadow-2xl z-50 slide-in-from-right-4 animate-in">
          {importStatus}
        </div>
      )}

      {/* Bilingual Import Guide Modal */}
      {isGuideOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-[var(--border-color)] flex justify-between items-center">
              <div className="space-y-1">
                <h2 className="text-3xl font-playfair tracking-tight text-[var(--fg-primary)]">Import Guide</h2>
                <p className="nga-label text-[10px] text-[var(--fg-muted)]">导入指南 (Part 2 专属)</p>
              </div>
              <button 
                onClick={() => setIsGuideOpen(false)}
                className="p-3 hover:bg-[var(--bg-secondary)] rounded-full transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--fg-primary)] text-[var(--bg-primary)] flex items-center justify-center text-[10px] font-bold">1</div>
                  <h3 className="text-sm font-bold tracking-widest uppercase text-[var(--fg-primary)]">General Rules (通用规则)</h3>
                </div>
                <div className="pl-9 space-y-4">
                  <p className="text-sm leading-relaxed text-[var(--fg-secondary)]">
                    <strong className="text-[var(--fg-primary)]">File Types:</strong> .txt or .docx only. Word files are automatically parsed for plain text.
                    <br/>
                    <small className="text-[var(--fg-muted)]">支持文件格式：仅限 .txt 或 .docx。</small>
                  </p>
                  <p className="text-sm leading-relaxed text-[var(--fg-secondary)]">
                    <strong className="text-[var(--fg-primary)]">Separator:</strong> Separate different topics using <code className="bg-black/10 dark:bg-white/10 px-1 rounded">---</code> on a new line.
                    <br/>
                    <small className="text-[var(--fg-muted)]">分隔符：不同的话题之间请用三个减号 `---` 隔开。</small>
                  </p>
                </div>
              </section>

              {/* Keywords Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--fg-primary)] text-[var(--bg-primary)] flex items-center justify-center text-[10px] font-bold">2</div>
                  <h3 className="text-sm font-bold tracking-widest uppercase text-[var(--fg-primary)]">Keywords (支持的标签)</h3>
                </div>
                <div className="pl-9 grid grid-cols-2 gap-4">
                  {[
                    { en: 'Topic Title', zh: '话题题目', markers: '[TopicTitle]' },
                    { en: 'Cue Card', zh: '题卡内容', markers: '[CueCard]' },
                    { en: 'Answer Script', zh: '参考讲稿', markers: '[Answer]' },
                    { en: 'Translation', zh: '中文翻译', markers: '[Translation]' },
                    { en: 'Vocab', zh: '词汇笔记', markers: '[Vocab]' },
                    { en: 'Part 3 Qs', zh: 'P3扩展题', markers: '[Part3] (可多次使用)' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-[var(--bg-secondary)]/50 p-4 rounded-2xl border border-[var(--border-color)]">
                      <p className="text-[10px] uppercase tracking-tighter font-bold text-[var(--fg-muted)] mb-1">{item.en} ({item.zh})</p>
                      <code className="text-[11px] font-mono text-[var(--accent-color)]">{item.markers}</code>
                    </div>
                  ))}
                </div>
              </section>

              {/* Template Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--fg-primary)] text-[var(--bg-primary)] flex items-center justify-center text-[10px] font-bold">3</div>
                  <h3 className="text-sm font-bold tracking-widest uppercase text-[var(--fg-primary)]">Example Template (示例模板)</h3>
                </div>
                <div className="pl-9">
                  <div className="bg-[var(--bg-secondary)]/50 text-[var(--fg-primary)] p-8 rounded-3xl relative overflow-hidden border border-[var(--border-color)]">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <BookOpen size={60} />
                    </div>
                    <pre className="text-xs font-mono leading-loose whitespace-pre-wrap opacity-80 text-[var(--fg-primary)]">
{`[TopicTitle] Describe a person who has influenced you
[CueCard] You should say:
- Who this person is
- How you met them
- And explain why they influenced you
[Answer] I would like to talk about my high school teacher...
[Translation] 我想谈谈我的高中老师...
[Vocab] influence - 影响
mentor - 导师
[Part3] How do people in your country show respect to teachers?
[Part3] Do you think teachers should be friends with their students?
---
[TopicTitle] Describe an important object
[CueCard] You should say:
- What it is
...`}
                    </pre>
                  </div>
                </div>
              </section>
            </div>

            <div className="p-10 border-t border-[var(--border-color)] flex justify-center">
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

      {/* Header */}
      <header className="flex justify-between items-start border-b border-[var(--border-color)] pb-10">
        <div className="space-y-2">
          <h1 className="text-4xl font-playfair tracking-tight">Part 2</h1>
          <p className="nga-label">Stories <span className="font-sans opacity-40">&</span> Topics</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 border border-[var(--border-color)] rounded-full hover:bg-[var(--fg-primary)] hover:text-[var(--bg-primary)] transition-all group relative text-[var(--fg-primary)] shadow-sm"
            title="Import from file (.txt, .docx)"
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
            className="p-3 border border-[var(--border-color)] rounded-full hover:bg-[var(--fg-primary)] hover:text-[var(--bg-primary)] transition-all group relative mr-2 text-[var(--fg-primary)] shadow-sm"
            title="View Import Guide (查看导入指南)"
          >
            <HelpCircle size={20} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => tab === "topics" ? setIsAddingTopic(true) : setIsAddingStory(true)}
            className="p-3 border border-[var(--border-color)] rounded-full hover:bg-[var(--fg-primary)] hover:text-[var(--bg-primary)] transition-all text-[var(--fg-primary)] shadow-sm"
          >
            <Plus size={20} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Tab */}
      <div className="flex gap-1 bg-[var(--bg-secondary)] p-1.5 rounded-[1.5rem] border border-[var(--border-color)]">
        {(["topics", "stories", "map"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all"
            style={{
              background: tab === t ? "var(--bg-card)" : "transparent",
              color: tab === t ? "var(--fg-primary)" : "var(--fg-muted)",
              boxShadow: tab === t ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t === "topics" ? `Topics (${userTopics.length})` : t === "stories" ? `Stories (${userStories.length})` : `Logic Map`}
          </button>
        ))}
      </div>

      {/* ── TOPICS TAB ── */}
      {tab === "topics" && (
        <div className="space-y-4">
          {isAddingTopic && (
            <div className="nga-card space-y-4 animate-in slide-in-from-top-4 bg-[var(--bg-card)] border border-[var(--border-color)]">
              <input
                autoFocus
                className="w-full border-b border-[var(--fg-primary)] py-3 outline-none text-lg font-playfair italic placeholder:text-[var(--fg-muted)] bg-transparent text-[var(--fg-primary)]"
                placeholder="Topic title..."
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newTopicTitle.trim() && (addTopic(newTopicTitle.trim(), newTopicCueCard.trim()), setNewTopicTitle(""), setNewTopicCueCard(""), setIsAddingTopic(false))}
              />
              <textarea
                className="w-full border border-[var(--border-color)] rounded-xl p-4 text-sm outline-none h-24 bg-[var(--bg-secondary)] resize-none leading-relaxed font-light placeholder:text-[var(--fg-muted)] text-[var(--fg-primary)]"
                placeholder="Cue card (optional)..."
                value={newTopicCueCard}
                onChange={(e) => setNewTopicCueCard(e.target.value)}
              />
              <div className="flex justify-end gap-4">
                <button onClick={() => setIsAddingTopic(false)} className="nga-label text-[9px]">Cancel</button>
                <button
                  onClick={() => {
                    if (newTopicTitle.trim()) {
                      addTopic(newTopicTitle.trim(), newTopicCueCard.trim());
                      setNewTopicTitle(""); setNewTopicCueCard(""); setIsAddingTopic(false);
                    }
                  }}
                  className="nga-button-outline"
                >Add Topic</button>
              </div>
            </div>
          )}

          {/* Bulk import */}
          <button
            onClick={() => setIsBulkMode(true)}
            className="w-full text-[9px] nga-label flex items-center justify-center gap-2 py-3 border border-dashed border-[var(--border-color)] rounded-xl hover:border-[var(--fg-primary)] transition-all text-[var(--fg-muted)] hover:text-[var(--fg-primary)] bg-[var(--bg-secondary)]"
          >
            <FileText size={12} />
            Paste Text Import (粘贴文本导入)
          </button>
          
          {isBulkMode && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[var(--bg-card)] rounded-[2.5rem] w-full max-w-2xl p-8 space-y-6 animate-in zoom-in-95 duration-300 border border-[var(--border-color)] shadow-2xl">
                <div className="flex justify-between items-center">
                  <h3 className="font-playfair text-2xl text-[var(--fg-primary)]">Batch Import Topics</h3>
                  <button onClick={() => setIsBulkMode(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg-primary)]">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                  Paste raw text here. Separate topics with <code className="bg-black/10 dark:bg-white/10 px-1 rounded">---</code>. Support tags: [TopicTitle], [CueCard], [Answer], [Translation], [Vocab], [Part3].
                </p>
                <textarea
                  autoFocus
                  className="w-full border border-[var(--border-color)] rounded-xl p-4 text-sm outline-none h-64 bg-[var(--bg-secondary)] resize-none leading-relaxed text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] opacity-80"
                  placeholder="[TopicTitle] Describe a person...&#10;[CueCard] You should say...&#10;[Answer] I want to talk about...&#10;[Translation] 我想谈谈...&#10;[Vocab] influence - 影响&#10;[Part3] How do people...&#10;---&#10;[TopicTitle] Describe an object..."
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
                <div className="flex justify-end gap-4">
                  <button onClick={() => setIsBulkMode(false)} className="nga-label text-[9px]">Cancel</button>
                  <button onClick={handleBulkImport} className="nga-button-outline">Import</button>
                </div>
              </div>
            </div>
          )}

          {userTopics.length === 0 ? (
            <div className="text-center py-16 text-[var(--fg-muted)] italic font-playfair border border-dashed border-[var(--border-color)] rounded-2xl">
              No topics yet. Add one above.
            </div>
          ) : (
            userTopics.map((topic) => {
              const linked = userStories.find((s) => s.id === topic.linkedStoryId);
              const isEditing = editingTopicId === topic.id;

              return (
                <div 
                  key={topic.id} 
                  className="nga-card group flex items-start gap-5 cursor-pointer hover:shadow-sm transition-all"
                  onClick={() => !isEditing && setActiveDrawerTopicId(topic.id)}
                >
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex gap-4 items-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            autoFocus
                            className="flex-1 border-b border-[var(--fg-primary)] py-1 outline-none text-base font-playfair italic bg-transparent text-[var(--fg-primary)]"
                            value={editingTopicTitle}
                            onChange={(e) => setEditingTopicTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateTopic(topic.id, { title: editingTopicTitle });
                                setEditingTopicId(null);
                              } else if (e.key === 'Escape') {
                                setEditingTopicId(null);
                              }
                            }}
                          />
                          <button 
                            onClick={() => {
                              updateTopic(topic.id, { title: editingTopicTitle });
                              setEditingTopicId(null);
                            }} 
                            className="p-1 text-[var(--fg-primary)]"
                          >
                            <Check size={16} />
                          </button>
                        <button onClick={() => setEditingTopicId(null)} className="p-1 text-[var(--fg-muted)]"><X size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xl font-artsy leading-snug text-[var(--fg-primary)] opacity-90">{topic.title}</p>
                        {linked ? (
                          <span className="inline-flex items-center gap-1 mt-2 text-[9px] uppercase tracking-widest font-bold text-[var(--accent-color)] bg-[var(--accent-soft)] px-2 py-1 rounded-md">
                            <Link2 size={8} /> {linked.title}
                          </span>
                        ) : (
                          <span className="inline-block mt-2 text-[9px] uppercase tracking-widest font-semibold text-[var(--fg-muted)]">
                            Unlinked
                          </span>
                        )}
                        {topic.script && (
                          <p className="text-xs text-muted mt-2 line-clamp-2 font-light italic">
                            {topic.script.replace(/^\[Topic:.*?\]\n\n/, "")}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (confirm("Delete this topic?")) deleteTopic(topic.id); 
                      }}
                      className="p-1.5 text-[var(--fg-primary)] hover:text-[var(--danger-color)] transition-all"
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                    {!isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTopicId(topic.id);
                          setEditingTopicTitle(topic.title);
                        }}
                        className="p-1.5 text-[var(--fg-primary)] hover:scale-110 transition-all"
                      >
                        <Edit2 size={14} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── STORIES TAB ── */}
      {tab === "stories" && (
        <div className="space-y-4">
          {isAddingStory && (
            <div className="nga-card space-y-4 animate-in slide-in-from-top-4">
              <input
                autoFocus
                className="w-full border-b border-[var(--fg-primary)] py-3 outline-none text-lg font-playfair italic placeholder:text-[var(--fg-muted)] bg-transparent text-[var(--fg-primary)]"
                placeholder="Story title..."
                value={newStoryTitle}
                onChange={(e) => setNewStoryTitle(e.target.value)}
              />
              <select
                className="w-full border-b border-[var(--border-color)] py-2 outline-none text-sm bg-transparent"
                value={newStoryTag}
                onChange={(e) => setNewStoryTag(e.target.value as typeof TAGS[number])}
              >
                {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea
                className="w-full border border-[var(--border-color)] rounded-xl p-4 text-sm outline-none h-20 bg-[var(--bg-secondary)]/30 resize-none font-light placeholder:text-gray-200"
                placeholder="Short summary (optional)..."
                value={newStorySummary}
                onChange={(e) => setNewStorySummary(e.target.value)}
              />
              <div className="flex justify-end gap-4">
                <button onClick={() => setIsAddingStory(false)} className="nga-label text-[9px]">Cancel</button>
                <button
                  onClick={() => {
                    if (newStoryTitle.trim()) {
                      addStory(newStoryTitle.trim(), newStoryTag, newStorySummary.trim());
                      setNewStoryTitle(""); setNewStorySummary(""); setIsAddingStory(false);
                    }
                  }}
                  className="nga-button-outline"
                >Add Story</button>
              </div>
            </div>
          )}

          {userStories.length === 0 ? (
            <div className="text-center py-16 text-[var(--fg-muted)] italic font-playfair border border-dashed border-[var(--border-color)] rounded-2xl">
              No stories yet. Add one above.
            </div>
          ) : (
            userStories.map((story) => {
              const linkedCount = userTopics.filter((t) => t.linkedStoryId === story.id).length;
              return (
                <div key={story.id} className="nga-card group">
                  <div className="flex items-start gap-4">
                    <span className="text-[8px] bg-[var(--accent-color)] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter shrink-0 mt-0.5">
                      {story.tag}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-playfair font-medium">{story.title}</p>
                      {story.summary && <p className="text-xs text-muted mt-1 font-light">{story.summary}</p>}
                      <p className="text-[9px] nga-label mt-2">{linkedCount} topics linked</p>
                    </div>
                    <button
                      onClick={() => { if (confirm("Delete story?")) deleteStory(story.id); }}
                      className="p-1.5 text-[var(--fg-primary)] hover:text-[var(--danger-color)] transition-all"
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── SIDE DRAWER ── */}
      {activeTopic && (
        <>
          <div className="drawer-overlay" onClick={() => setActiveDrawerTopicId(null)} />
          <aside
            className="fixed top-0 right-0 bottom-0 bg-[var(--bg-card)] z-50 overflow-y-auto slide-in-from-right w-full md:w-[560px] border-l border-[var(--border-color)]"
            style={{ boxShadow: "-8px 0 40px rgba(0,0,0,0.05)" }}
          >
            <div className="p-8 space-y-10">
              {/* Drawer header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <p className="nga-label">Topic</p>
                  <h2 className="text-2xl font-artsy leading-snug text-[var(--fg-primary)] opacity-95">{activeTopic.title}</h2>
                </div>
                <button
                  onClick={() => setActiveDrawerTopicId(null)}
                  className="p-2 rounded-full hover:bg-[var(--bg-secondary)] transition-all mt-1 text-[var(--fg-primary)]"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              {/* Link story */}
              <div className="space-y-4">
                <p className="nga-label">Link to Story</p>
                {userStories.length === 0 ? (
                  <p className="text-xs text-muted italic">Add stories in the Stories tab first.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {userStories.map((story) => {
                      const isLinked = activeTopic.linkedStoryId === story.id;
                      return (
                        <button
                          key={story.id}
                          onClick={() => updateTopic(activeTopic.id, {
                            linkedStoryId: isLinked ? undefined : story.id,
                          })}
                          className={`text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                            isLinked 
                              ? "bg-[var(--bg-primary)] text-[var(--fg-primary)] border-[var(--fg-primary)] shadow-md" 
                              : "bg-transparent text-[var(--fg-primary)] border-[var(--border-color)] hover:border-[var(--fg-primary)]"
                          }`}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{story.title}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isLinked ? 'text-white/70 dark:text-black/70' : 'text-indigo-500'}`}>
                              {story.tag}
                            </p>
                          </div>
                          {isLinked && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dual Editor */}
              {activeTopic && localEditingTopic && (
                <DualEditor
                  title={activeTopic.title}
                  subtitle={activeTopic.cueCard}
                  englishValue={localEditingTopic.script ? localEditingTopic.script.replace(/^\[Topic:.*?\]\n\n/, "") : ''}
                  chineseValue={localEditingTopic.translation || ''}
                  chineseLogicValue={localEditingTopic.chineseLogic || ''}
                  vocabAnalysisValue={localEditingTopic.vocabAnalysisText || ''}
                  aiEnglishValue={localEditingTopic.aiSuggestions?.script}
                  aiChineseValue={localEditingTopic.aiSuggestions?.translation}
                  aiVocabAnalysisValue={localEditingTopic.aiSuggestions?.vocabAnalysisText}
                  aiCoachingValue={localEditingTopic.aiCoaching || ''}
                  onEnglishChange={(val) => setLocalEditingTopic(prev => prev ? { ...prev, script: val } : null)}
                  onChineseChange={(val) => setLocalEditingTopic(prev => prev ? { ...prev, translation: val } : null)}
                  onChineseLogicChange={(val) => setLocalEditingTopic(prev => prev ? { ...prev, chineseLogic: val } : null)}
                  onVocabAnalysisChange={(val) => setLocalEditingTopic(prev => prev ? { ...prev, vocabAnalysisText: val } : null)}
                  onAiGenerate={(type, instruction) => handleAiGenerate(type, activeTopic, instruction)}
                  isGenerating={isGenerating}
                  onSave={() => {
                    if (localEditingTopic) {
                      updateTopic(activeTopic.id, {
                        script: localEditingTopic.script,
                        translation: localEditingTopic.translation,
                        chineseLogic: localEditingTopic.chineseLogic,
                        vocabAnalysisText: localEditingTopic.vocabAnalysisText,
                        aiCoaching: localEditingTopic.aiCoaching,
                        aiSuggestions: localEditingTopic.aiSuggestions
                      });
                    }
                  }}
                />
              )}

              {/* Part 3 Questions */}
              {activeTopic && (
                <div className="pt-12 border-t border-[var(--border-color)] space-y-6">
                  <div className="space-y-2">
                    <p className="nga-label">Part 3 Extensions</p>
                    <h3 className="text-xl font-playfair">Extended Discussion Questions</h3>
                  </div>

                  {activeTopic.transitionTip && (
                    <div className="bg-[var(--accent-soft)]/30 border border-[var(--accent-color)]/20 rounded-2xl p-6">
                      <div className="flex items-start gap-3">
                        <Sparkles size={16} className="text-[var(--accent-color)] mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-[var(--accent-color)]">AI Transition Tip</p>
                          <p className="text-xs text-[var(--accent-color)]/80 leading-relaxed font-light">
                            {activeTopic.transitionTip}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {(activeTopic.part3Questions || []).map((q) => (
                      <div key={q.id} className="bg-white border border-[var(--border-color)] rounded-xl p-5 flex justify-between items-start gap-4 group hover:shadow-sm hover:border-gray-200 transition-all cursor-pointer" onClick={() => router.push(`/part3?topicId=${activeTopic.id}&questionId=${q.id}`)}>
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium leading-relaxed font-playfair">{q.question}</p>
                          {q.answer && q.answer.trim().length > 0 && (
                            <p className="text-[10px] text-[var(--fg-muted)] font-light flex items-center gap-1"><MessageCircle size={10} /> Answered</p>
                          )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete question?')) deletePart3Question(activeTopic.id, q.id); }} className="opacity-0 group-hover:opacity-100 text-[var(--fg-muted)] hover:text-[var(--danger-color)] transition-all shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Part 3 block */}
                  <div className="space-y-4 pt-2">
                    {isBulkPart3 ? (
                      <div className="space-y-3 animate-in slide-in-from-top-4">
                        <textarea
                          autoFocus
                          className="w-full border border-[var(--border-color)] dark:border-white/5 rounded-xl p-4 text-sm outline-none h-32 bg-[var(--bg-secondary)]/50 dark:bg-white/[0.02] resize-none leading-relaxed dark:text-[var(--fg-muted)]"
                          placeholder="Paste Part 3 questions, one per line..."
                          value={part3BulkText}
                          onChange={(e) => setPart3BulkText(e.target.value)}
                        />
                        <div className="flex justify-end gap-4">
                          <button onClick={() => setIsBulkPart3(false)} className="nga-label text-[9px]">Cancel</button>
                          <button onClick={() => handlePart3Import(activeTopic.id)} className="nga-button-outline">Import</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          className="flex-1 border-b border-[var(--fg-primary)] py-4 outline-none text-sm font-semibold bg-transparent placeholder:text-[var(--fg-muted)]"
                          placeholder="Enter a new Part 3 question..."
                          value={newPart3Q}
                          onChange={(e) => setNewPart3Q(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newPart3Q.trim()) {
                              addPart3Question(activeTopic.id, newPart3Q.trim());
                              setNewPart3Q("");
                            }
                          }}
                        />
                        <button
                          onClick={newPart3Q.trim() ? () => {
                            addPart3Question(activeTopic.id, newPart3Q.trim());
                            setNewPart3Q("");
                          } : () => setIsBulkPart3(true)}
                          className="p-4 text-[var(--fg-primary)] transition-all flex items-center justify-center border-b border-[var(--fg-primary)] hover:bg-[var(--bg-secondary)]"
                          title={newPart3Q.trim() ? "Add Question" : "Batch Import"}
                        >
                          {newPart3Q.trim() ? <Check size={16} strokeWidth={1.5} /> : <Upload size={16} strokeWidth={1.5} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Drawer Footer Actions */}
              <div className="flex justify-end gap-6 pt-12 border-t border-[var(--border-color)] italic transition-all">
                <button 
                  onClick={() => {
                    if (snapshot && activeTopic) updateTopic(activeTopic.id, snapshot);
                    setActiveDrawerTopicId(null);
                    setSnapshot(null);
                  }} 
                  className="text-[10px] text-[var(--fg-muted)] hover:text-[var(--danger-color)] tracking-widest uppercase font-bold"
                >
                  Discard & Revert
                </button>
                <button onClick={() => { setActiveDrawerTopicId(null); setSnapshot(null); }} className="nga-button-outline px-10">Done</button>
              </div>
            </div>
          </aside>
        </>
      )}
      {/* ── LOGIC MAP TAB ── */}
      {tab === "map" && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-2">
            <h3 className="text-xl font-playfair italic">Your Strategic Coverage</h3>
            <p className="text-[10px] text-muted tracking-widest uppercase">Efficiency Perspective: Stories to Topics Mapping</p>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {userStories.map((story) => {
              const linkedTopics = userTopics.filter(t => t.linkedStoryId === story.id);
              return (
                <div key={story.id} className="nga-card p-0 overflow-hidden border border-[var(--border-color)] bg-[var(--bg-card)]">
                  <div className="p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-secondary)]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] bg-[var(--accent-color)] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter shrink-0">
                          {story.tag}
                        </span>
                        <h4 className="text-2xl font-artsy dark:text-white leading-none opacity-90">{story.title}</h4>
                      </div>
                      <p className="text-xs text-muted line-clamp-1">{story.summary}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-playfair text-indigo-500">{linkedTopics.length}</div>
                      <p className="text-[8px] uppercase tracking-widest text-muted">Topics Covered</p>
                    </div>
                  </div>

                  <div className="p-8 bg-transparent">
                    {linkedTopics.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {linkedTopics.map(t => (
                          <div 
                            key={t.id} 
                            onClick={() => { setTab('topics'); setActiveDrawerTopicId(t.id); }}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] px-4 py-3 rounded-2xl flex items-center gap-3 hover:scale-105 transition-all cursor-pointer group shadow-sm hover:shadow-md hover:border-indigo-400"
                          >
                            <Link2 size={12} className="text-[var(--fg-muted)] group-hover:text-[var(--fg-primary)]" />
                            <span className="text-sm font-playfair group-hover:italic transition-all dark:text-[var(--fg-muted)] dark:group-hover:text-[var(--fg-primary)]">{t.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center opacity-30 italic text-xs">This story is currently standalone. Link it to some topics!</div>
                    )}
                  </div>
                </div>
              );
            })}

            {userStories.length === 0 && (
              <div className="py-20 text-center space-y-4 nga-card border-dashed">
                <BookOpen size={40} className="mx-auto text-gray-200" />
                <p className="text-sm text-muted font-playfair italic">No stories created yet to map.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
