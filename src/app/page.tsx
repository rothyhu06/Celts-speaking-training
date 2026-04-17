"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { ArrowRight, Target, BookOpen, MessageSquare, Mic, Sparkles, MessageCircle, Download, Printer, Upload, RefreshCw, Info, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<"p1" | "p2" | "p3" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { categories, topics, stories, user, updateProfile, logout, restoreBackup } = useStore();

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const handleManualSync = async () => {
    if (!user?.email || isSyncing) return;
    setIsSyncing(true);
    setSyncMessage("Syncing...");
    try {
      const { data, error } = await supabase
        .from("cloud_save")
        .select("app_data")
        .eq("email", user.email.toLowerCase())
        .single();
      
      if (error) throw error;
      if (data?.app_data) {
        restoreBackup(data.app_data);
        setSyncMessage("Synced!");
        setTimeout(() => setSyncMessage(null), 2000);
      }
    } catch (err) {
      console.error(err);
      setSyncMessage("Sync failed");
      setTimeout(() => setSyncMessage(null), 2000);
    } finally {
      setIsSyncing(false);
    }
  };

  const userCategories = categories.filter((c) => c.userId === (user?.id ?? "user-1"));
  const userTopics = topics.filter((t) => t.userId === (user?.id ?? "user-1"));
  const userStories = stories.filter((s) => s.userId === (user?.id ?? "user-1"));

  const totalQuestions = userCategories.reduce((sum, c) => sum + c.questions.length, 0);
  const answeredQuestions = userCategories.reduce(
    (sum, c) => sum + (c.questions?.filter((q) => q.prepared).length || 0),
    0
  );
  const p1Coverage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const linkedTopics = userTopics.filter((t) => t.linkedStoryId).length;
  const p2Coverage = userTopics.length > 0 ? Math.round((linkedTopics / userTopics.length) * 100) : 0;

  const totalPart3 = userTopics.reduce((sum, t) => sum + (t.part3Questions?.length || 0), 0);
  const answeredPart3 = userTopics.reduce(
    (sum, t) => sum + (t.part3Questions?.filter(q => q && q.prepared).length || 0),
    0
  );
  const p3Coverage = totalPart3 > 0 ? Math.round((answeredPart3 / totalPart3) * 100) : 0;

  const TAG_COLORS: Record<string, string> = {
    Person: "#0a0a0a",
    Object: "#555",
    Place: "#3b82f6",
    Event: "#8b5cf6",
  };

  const handleExportJSON = () => {
    const state = useStore.getState();
    // Only export the current user's data
    const exportData = {
      user,
      categories: state.categories.filter(c => c.userId === user?.id),
      topics: state.topics.filter(t => t.userId === user?.id),
      stories: state.stories.filter(s => s.userId === user?.id)
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ielts-flow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPrint = () => {
    window.print();
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.categories && data.topics) {
          if (confirm("This will merge the backup into your current account. Proceed?")) {
             restoreBackup(data);
             alert("Backup restored successfully!");
          }
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) {
        alert("Failed to read the backup file.");
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // reset
  };

  return (
    <div className="animate-in fade-in duration-700 space-y-12">
      <header className="space-y-2 pt-2 relative">
        <div className="absolute right-0 top-0 flex gap-4 items-center">
          {syncMessage && <span className="text-[10px] text-black font-bold animate-pulse">{syncMessage}</span>}
          <button 
            onClick={handleManualSync}
            disabled={isSyncing}
            className={`nga-label text-[10px] hover:text-black transition-colors flex items-center gap-1.5 ${isSyncing ? 'opacity-30' : ''}`}
            title="Sync with Cloud"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> Sync
          </button>
          <button 
            onClick={handleExportPrint}
            className="nga-label text-[10px] hover:text-black transition-colors flex items-center gap-1"
            title="Print to PDF"
          >
            <Printer size={10} /> PDF
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="nga-label text-[10px] hover:text-black transition-colors flex items-center gap-1"
            title="Restore JSON Backup"
          >
            <Upload size={10} /> Restore
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportJSON} 
            accept="application/json" 
            className="hidden" 
          />
          <button 
            onClick={handleExportJSON}
            className="nga-label text-[10px] hover:text-black transition-colors flex items-center gap-1"
            title="Download JSON Backup"
          >
            <Download size={10} /> Backup
          </button>
          <button 
            onClick={() => logout()}
            className="nga-label text-[10px] hover:text-black transition-colors"
          >
            Sign Out
          </button>
        </div>
        <p className="nga-label">IELTS Flow</p>
        <h1 className="text-4xl font-playfair tracking-tight">
          Good {getGreeting()},{" "}
          <span className="italic">{user?.name || "Candidate"}</span>.
        </h1>
        <p className="text-sm text-muted font-light">
          Target Band {user?.targetBand ?? 7}.0 &nbsp;·&nbsp; {userTopics.length} topics ready
        </p>
      </header>

      {/* Progress Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div 
          onClick={() => setSelectedModule("p1")}
          className="nga-card space-y-4 cursor-pointer hover:border-black transition-all group active:scale-95"
        >
          <div className="flex items-center justify-between">
            <span className="nga-label">Part 1</span>
            <MessageSquare size={14} className="text-muted group-hover:text-black transition-colors" />
          </div>
          <p className="text-2xl font-playfair">{p1Coverage}%</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${p1Coverage}%` }} />
          </div>
          <p className="text-[10px] text-muted font-light">
            {answeredQuestions}/{totalQuestions} done
          </p>
        </div>
        
        <div 
          onClick={() => setSelectedModule("p2")}
          className="nga-card space-y-4 cursor-pointer hover:border-black transition-all group active:scale-95"
        >
          <div className="flex items-center justify-between">
            <span className="nga-label">Part 2</span>
            <BookOpen size={14} className="text-muted group-hover:text-black transition-colors" />
          </div>
          <p className="text-2xl font-playfair">{p2Coverage}%</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${p2Coverage}%` }} />
          </div>
          <p className="text-[10px] text-muted font-light">
            {linkedTopics}/{userTopics.length} linked
          </p>
        </div>

        <div 
          onClick={() => setSelectedModule("p3")}
          className="nga-card space-y-4 cursor-pointer hover:border-black transition-all group active:scale-95"
        >
          <div className="flex items-center justify-between">
            <span className="nga-label">Part 3</span>
            <MessageCircle size={14} className="text-muted group-hover:text-black transition-colors" />
          </div>
          <p className="text-2xl font-playfair">{p3Coverage}%</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${p3Coverage}%` }} />
          </div>
          <p className="text-[10px] text-muted font-light">
            {answeredPart3}/{totalPart3} done
          </p>
        </div>
      </div>

      {/* Visual Map */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-playfair">Visual Map</h2>
          <span className="nga-label">{userStories.length} Stories</span>
        </div>

        {userStories.length === 0 ? (
          <div className="text-center py-12 text-muted italic font-playfair border border-dashed border-gray-100 rounded-2xl">
            Add stories in Part 2 to see the visual map.
          </div>
        ) : (
          <div className="space-y-3">
            {userStories.map((story) => {
              const linked = userTopics.filter((t) => t.linkedStoryId === story.id);
              return (
                <div key={story.id} className="nga-card-sm group">
                  <div className="flex items-start gap-4">
                    <span
                      className="flex-shrink-0 text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-md"
                      style={{
                        background: `${TAG_COLORS[story.tag] ?? "#0a0a0a"}12`,
                        color: TAG_COLORS[story.tag] ?? "#0a0a0a",
                      }}
                    >
                      {story.tag}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-playfair text-sm font-medium truncate">{story.title}</p>
                      {linked.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {linked.map((t) => (
                            <span
                              key={t.id}
                              className="text-[9px] uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-md text-muted"
                            >
                              {t.title.length > 30 ? t.title.slice(0, 30) + "…" : t.title}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted/50 mt-1 italic">No topics linked yet</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="space-y-4 pb-4">
        <h2 className="text-xl font-playfair">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3">
          <QuickLink href="/qa" icon={<MessageSquare size={18} strokeWidth={1.5} />} title="Manage Part 1 Q&A" sub="Add questions & draft answers" />
          <QuickLink href="/stories" icon={<Sparkles size={18} strokeWidth={1.5} />} title="AI Lab — Part 2" sub="Link stories & generate scripts" />
          <QuickLink href="/mock" icon={<Mic size={18} strokeWidth={1.5} />} title="Enter Mock Room" sub="Timer, recording & AI feedback" />
        </div>
      </section>

      {/* System Guide (Collapsible) */}
      <section className="space-y-4 pb-20">
        <button 
          onClick={() => setIsGuideOpen(!isGuideOpen)}
          className="w-full flex items-center justify-between py-6 px-8 rounded-3xl border border-gray-100 bg-gray-50/30 hover:bg-gray-50 transition-all group"
        >
          <div className="flex items-center gap-3">
            <HelpCircle size={18} className="text-black" />
            <div className="flex flex-col items-start">
              <h2 className="text-lg font-playfair">System Guide</h2>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">使用指南 (Bilingual)</p>
            </div>
          </div>
          {isGuideOpen ? <ChevronUp size={18} strokeWidth={1} /> : <ChevronDown size={18} strokeWidth={1} />}
        </button>
        
        {isGuideOpen && (
          <div className="space-y-8 animate-in slide-in-from-top-4 duration-500 mt-6 overflow-hidden">
            
            {/* 01: Core Highlights / 网站亮点 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <Sparkles size={16} className="text-indigo-500" />
                <h3 className="text-sm font-bold tracking-widest uppercase text-indigo-900 underline decoration-indigo-200 underline-offset-8 decoration-4">01 Site Highlights / 网站亮点</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="nga-card-sm border-indigo-100 bg-indigo-50/20">
                  <p className="text-xs leading-loose font-medium text-black">
                    <strong className="text-indigo-600">The Master Story System:</strong> Don't memorize 50 topics. Create 10 "Master Stories" and <strong>Link</strong> them to multiple topics to reduce memory load by 90%.
                  </p>
                  <p className="text-xs leading-loose text-muted mt-2 border-t border-indigo-50 pt-2 italic">
                    <strong className="text-black">万能素材串联法：</strong> 别再死记硬背 50 个话题。创建 10 个“万能故事（Story）”，然后将其<strong>关联（Link）</strong>到多个话题（Topic）上，瞬间减轻 90% 的记忆负担。
                  </p>
                </div>
                <div className="nga-card-sm border-purple-100 bg-purple-50/20">
                  <p className="text-xs leading-loose font-medium text-black">
                    <strong className="text-purple-600">Iterative AI Lab:</strong> Use the "AI Suggestion" box then refine it with specific instructions (e.g. "Use idioms", "Make it more natural"). Don't settle for the first draft.
                  </p>
                  <p className="text-xs leading-loose text-muted mt-2 border-t border-purple-50 pt-2 italic">
                    <strong className="text-black">AI 实验室迭代：</strong> 获取 AI 建议后，利用下方的“自定义指令”进行反复打磨（例如：“加入习语”、“语气更自然”），直到生成最适合你的满分范文。
                  </p>
                </div>
              </div>
            </div>

            {/* 02: Step-by-Step / 各模块用法 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <BookOpen size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold tracking-widest uppercase text-emerald-900 underline decoration-emerald-200 underline-offset-8 decoration-4">02 Training Workflow / 各模块用法</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="nga-card-sm border-gray-100">
                  <div className="flex flex-col md:flex-row gap-6 md:gap-12">
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-emerald-700">Part 1: Concise & Personal</p>
                      <p className="text-xs leading-loose text-muted">Upload your basic Q&A pairs via file import. Use AI to polish them into concise, 2-3 sentence natural spoken responses. Check the "?" icon in Part 1 for rapid import tips.</p>
                    </div>
                    <div className="flex-1 space-y-2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-12">
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">第一部分：简洁、生活化</p>
                      <p className="text-xs leading-loose text-muted font-light italic">利用文件导入批量上传你的 Q&A。让 AI 将其润色为 2-3 句的地道口语。记得点击 Part 1 页面的“？”查看批量导入秘籍。</p>
                    </div>
                  </div>
                </div>

                <div className="nga-card-sm border-gray-100">
                  <div className="flex flex-col md:flex-row gap-6 md:gap-12">
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-indigo-700">Part 2: Storytelling Strategy</p>
                      <p className="text-xs leading-loose text-muted">Navigate to "AI Lab" to manage your stories. Map each story to related topics. This creates a "One-Story-to-Many-Topics" network, transforming a random pool into a logical system.</p>
                    </div>
                    <div className="flex-1 space-y-2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-12">
                      <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">第二部分：故事串联法</p>
                      <p className="text-xs leading-loose text-muted font-light italic">核心在于“AI 实验室”。在这里建立你的故事轴，并将其映射到各个相关的话题。这能把零散的话题变成有逻辑的系统，大幅减少备考量。</p>
                    </div>
                  </div>
                </div>

                <div className="nga-card-sm border-gray-100">
                  <div className="flex flex-col md:flex-row gap-6 md:gap-12">
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-rose-700">Mock Room: Full Simulation</p>
                      <p className="text-xs leading-loose text-muted">Practice with professional timers and recording. After finishing, click "Ask for Diagnosis" to receive a full Band Score report with detailed 4-category IELTS feedback.</p>
                    </div>
                    <div className="flex-1 space-y-2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-12">
                      <p className="text-xs font-bold uppercase tracking-widest text-rose-700">模拟考场：全真计时模拟</p>
                      <p className="text-xs leading-loose text-muted font-light italic">在 Mock Room 中开启倒计时进行录音练习。练习结束后，一键开启“诊断报告”，获取专家级的 Band Score 评分和四维度反馈报告。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 03: Data / 数据安全 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <RefreshCw size={16} className="text-gray-400" />
                <h3 className="text-sm font-bold tracking-widest uppercase text-gray-500">03 Sync & Safety / 数据同步与备份</h3>
              </div>
              <div className="nga-card-sm bg-gray-50/50 border-gray-100">
                <p className="text-xs leading-loose text-muted">
                  Use the <strong>Sync</strong> button to save to cloud. Use <strong>Backup</strong> regularly to download a local JSON copy. Double protection for your study progress.
                </p>
                <p className="text-xs leading-loose text-muted mt-2 border-t border-gray-100 pt-2 italic">
                  点击顶部的 <strong>Sync</strong> 可云端同步；定期点击 <strong>Backup</strong> 下载本地快照。双重保障你的备考心血。
                </p>
              </div>
            </div>

          </div>
        )}
      </section>

      {/* Drill-down Modal */}
      {selectedModule && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedModule(null)} />
          <div className="fixed inset-x-4 bottom-10 md:inset-x-0 md:mx-auto md:max-w-4xl max-h-[75vh] bg-white z-50 rounded-[2.5rem] shadow-2xl p-10 overflow-hidden flex flex-col animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-1">
                <p className="nga-label">{selectedModule.toUpperCase()} PERSPECTIVE</p>
                <h3 className="text-3xl font-playfair">
                  {selectedModule === 'p1' ? 'Part 1 Mastery' : selectedModule === 'p2' ? 'Part 2 Linking' : 'Part 3 Criticals'}
                </h3>
              </div>
              <button onClick={() => setSelectedModule(null)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                <ChevronDown size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* LEFT COLUMN: Remaining / Pending */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h4 className="nga-label text-rose-600">Pending Tasks</h4>
                  <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold">
                    {selectedModule === 'p1' ? (totalQuestions - answeredQuestions) : selectedModule === 'p2' ? (userTopics.length - linkedTopics) : (totalPart3 - answeredPart3)}
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedModule === 'p1' && userCategories.map(c => c.questions.filter(q => !q.prepared).map(q => (
                    <Link key={q.id} href="/qa" className="block text-sm py-2 px-3 hover:bg-gray-50 rounded-xl transition-all font-playfair truncate">{q.question}</Link>
                  )))}
                  {selectedModule === 'p2' && userTopics.filter(t => !t.linkedStoryId).map(t => (
                    <Link key={t.id} href="/stories" className="block text-sm py-2 px-3 hover:bg-gray-50 rounded-xl transition-all font-playfair truncate">{t.title}</Link>
                  ))}
                  {selectedModule === 'p3' && userTopics.flatMap(t => (t.part3Questions || []).filter(q => !q.prepared).map(q => (
                    <Link key={q.id} href={`/part3?topicId=${t.id}&questionId=${q.id}`} className="block text-xs py-2 px-3 hover:bg-gray-50 rounded-xl transition-all font-playfair leading-relaxed">{q.question}</Link>
                  )))}
                  {(selectedModule === 'p3' ? answeredPart3 === totalPart3 : selectedModule === 'p1' ? answeredQuestions === totalQuestions : linkedTopics === userTopics.length) && (
                    <p className="text-xs text-muted italic p-4 text-center">Perfect! All clear.</p>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Prepared / Linked */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h4 className="nga-label text-emerald-600">Mastered</h4>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                    {selectedModule === 'p1' ? answeredQuestions : selectedModule === 'p2' ? linkedTopics : answeredPart3}
                  </span>
                </div>
                <div className="space-y-2 opacity-50">
                  {selectedModule === 'p1' && userCategories.map(c => c.questions.filter(q => q.prepared).map(q => (
                    <div key={q.id} className="text-sm py-2 px-3 font-playfair truncate flex items-center gap-2 italic"><Check size={12} className="text-emerald-500"/> {q.question}</div>
                  )))}
                  {selectedModule === 'p2' && userTopics.filter(t => t.linkedStoryId).map(t => (
                    <div key={t.id} className="text-sm py-2 px-3 font-playfair truncate flex items-center gap-2 italic"><Check size={12} className="text-emerald-500"/> {t.title}</div>
                  ))}
                  {selectedModule === 'p3' && userTopics.flatMap(t => (t.part3Questions || []).filter(q => q.prepared).map(q => (
                    <div key={q.id} className="text-xs py-2 px-3 font-playfair leading-relaxed flex items-start gap-2 italic"><Check size={10} className="text-emerald-500 mt-1 shrink-0"/> {q.question}</div>
                  )))}
                  {(selectedModule === 'p3' ? answeredPart3 === 0 : selectedModule === 'p1' ? answeredQuestions === 0 : linkedTopics === 0) && (
                    <p className="text-xs text-muted italic p-4 text-center">Nothing here yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  sub,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="nga-card flex items-center gap-5 hover:shadow-sm transition-all group"
      style={{ textDecoration: "none" }}
    >
      <div className="p-3 rounded-full border border-gray-100 group-hover:bg-black group-hover:text-white group-hover:border-black transition-all">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted font-light">{sub}</p>
      </div>
      <ArrowRight size={16} className="text-muted group-hover:text-black transition-colors" />
    </Link>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
