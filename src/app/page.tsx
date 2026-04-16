"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { ArrowRight, Target, BookOpen, MessageSquare, Mic, Sparkles, MessageCircle, Download, Printer, Upload, RefreshCw, Info, HelpCircle } from "lucide-react";
import { useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
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
    (sum, c) => sum + c.questions.filter((q) => q.answer.trim().length > 0).length,
    0
  );
  const p1Coverage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const linkedTopics = userTopics.filter((t) => t.linkedStoryId).length;
  const p2Coverage = userTopics.length > 0 ? Math.round((linkedTopics / userTopics.length) * 100) : 0;

  const totalPart3 = userTopics.reduce((sum, t) => sum + (t.part3Questions?.length || 0), 0);
  const answeredPart3 = userTopics.reduce(
    (sum, t) => sum + (t.part3Questions?.filter(q => q.answer && q.answer.trim().length > 0).length || 0),
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
        <div className="nga-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="nga-label">Part 1</span>
            <MessageSquare size={14} className="text-muted" />
          </div>
          <p className="text-2xl font-playfair">{p1Coverage}%</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${p1Coverage}%` }} />
          </div>
          <p className="text-[10px] text-muted font-light">
            {answeredQuestions}/{totalQuestions} done
          </p>
        </div>
        <div className="nga-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="nga-label">Part 2</span>
            <BookOpen size={14} className="text-muted" />
          </div>
          <p className="text-2xl font-playfair">{p2Coverage}%</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${p2Coverage}%` }} />
          </div>
          <p className="text-[10px] text-muted font-light">
            {linkedTopics}/{userTopics.length} linked
          </p>
        </div>
        <div className="nga-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="nga-label">Part 3</span>
            <MessageCircle size={14} className="text-muted" />
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

      {/* System Guide */}
      <section className="space-y-6 pb-20">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-black" />
          <h2 className="text-xl font-playfair">System Guide</h2>
        </div>
        
        <div className="space-y-4">
          <div className="nga-card-sm border-dashed border-gray-100 bg-transparent">
            <h3 className="text-[10px] uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
              <RefreshCw size={10} /> 01 Data & Sync (同步与备份)
            </h3>
            <p className="text-xs leading-loose text-muted font-light">
              <strong className="text-black">Cloud:</strong> Use <span className="font-bold underline">Sync</span> to fetch data from Supabase. 
              <br/>
              <strong className="text-black">Local:</strong> Use <span className="font-bold underline">Backup</span> regularly to download your data as a JSON file.
              <br/>
              <small className="text-gray-400 italic">提醒：定期备份到本地以防止意外的数据冲突。</small>
            </p>
          </div>

          <div className="nga-card-sm border-dashed border-gray-100 bg-transparent">
            <h3 className="text-[10px] uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
              <MessageSquare size={10} /> 02 Part 1 Q&A (题库管理)
            </h3>
            <p className="text-xs leading-loose text-muted font-light">
              <strong className="text-black">Quick Import:</strong> Use the <span className="font-bold underline">?</span> icon in Part 1 to see formatting rules for .txt files. 
              <br/>
              <strong className="text-black">Expert Mode:</strong> Add questions manually and use AI to polish your "Chinese Logic" into natural English.
            </p>
          </div>

          <div className="nga-card-sm border-dashed border-gray-100 bg-transparent">
            <h3 className="text-[10px] uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
              <Sparkles size={10} /> 03 Part 2 Strategy (串联素材)
            </h3>
            <p className="text-xs leading-loose text-muted font-light">
              <strong className="text-black">The Core:</strong> Create <span className="italic">Stories</span> (素材) first, then <span className="font-bold underline">Link</span> them to multiple <span className="italic">Topics</span> (话题).
              <br/>
              One story can cover 5-10 topics! Use <span className="font-bold underline">AI Lab</span> to generate tailored scripts for each linkage.
              <br/>
              <small className="text-gray-400 italic">秘籍：以不变应万变，用 10 个好故事解决 50 个话题。</small>
            </p>
          </div>

          <div className="nga-card-sm border-dashed border-gray-100 bg-transparent">
            <h3 className="text-[10px] uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
              <Mic size={10} /> 04 Practice & Report (考场练习)
            </h3>
            <p className="text-xs leading-loose text-muted font-light">
              <strong className="text-black">Simulation:</strong> Practice with real-time timers in the <span className="font-bold underline">Mock Room</span>.
              <br/>
              <strong className="text-black">Assessment:</strong> Use the "Ask for Diagnosis" button after a session to get a Band Score and 4-way feedback report.
            </p>
          </div>
        </div>
      </section>
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
