"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/services/api";
import { cn } from "@/lib/utils";
import { useProjectFiles, useProjectSummary, useGenerateProjectSummary } from "@/hooks/useProjects";
import { Button } from "@/components/ui/Button";

interface ProjectDashboardProps {
  projectId: string;
  activeProject: any;
  sessions: any[];
  onSelectSession: (session: any) => void;
  onNewChat: () => void;
  agentUsageStats: Record<string, number>;
  activeRoadmap: any;
}

export function ProjectDashboard({
  projectId,
  activeProject,
  sessions,
  onSelectSession,
  onNewChat,
  agentUsageStats,
  activeRoadmap,
}: ProjectDashboardProps) {
  const [memoriesCount, setMemoriesCount] = useState<number>(0);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Queries
  const { data: files = [], isLoading: filesLoading } = useProjectFiles(projectId);
  const { data: summary, isLoading: summaryLoading } = useProjectSummary(projectId);
  const generateSummary = useGenerateProjectSummary();

  // Load Memories
  useEffect(() => {
    const fetchMemories = async () => {
      setMemoriesLoading(true);
      try {
        const r = await api.get("/api/users/me/memories", { params: { limit: "100" } });
        setMemoriesCount(r.data.length);
      } catch (err) {
        console.warn("Failed to fetch memories count", err);
      } finally {
        setMemoriesLoading(false);
      }
    };
    if (projectId) fetchMemories();
  }, [projectId]);

  // Calculate Roadmap Progress
  const roadmapTasks = activeRoadmap?.phases_json?.phases?.flatMap((p: any) => p.tasks || []) || [];
  const completedTasksCount = roadmapTasks.filter((t: any) => t.completed).length;
  const totalTasksCount = roadmapTasks.length;
  const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Deduce project status based on progress
  let projectStatus = "Planning";
  let statusColor = "bg-sky-500/10 text-sky-400 border-sky-500/25";
  if (totalTasksCount > 0) {
    if (progressPercent === 100) {
      projectStatus = "Completed";
      statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
    } else if (progressPercent > 0) {
      projectStatus = "In Development";
      statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/25";
    }
  }

  // Handle Summary Generation
  const handleGenerateSummary = async () => {
    const toastId = toast.loading("AI is compiling project summary from chat logs & roadmap...");
    try {
      await generateSummary.mutateAsync(projectId);
      toast.success("AI Project Summary generated and cached!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to compile summary. Try writing a message to build project context first.", { id: toastId });
    }
  };

  // Compile full Project document (For Export)
  const buildProjectDocument = async (format: "markdown" | "json"): Promise<string> => {
    // 1. Gather all session chats content
    const chatsData = [];
    for (const session of sessions) {
      try {
        const r = await api.get(`/api/projects/${projectId}/sessions/${session.id}/messages`);
        chatsData.push({
          title: session.title,
          mode: session.mode,
          created_at: session.created_at,
          messages: r.data,
        });
      } catch (err) {
        console.warn("Could not load messages for export", session.title, err);
      }
    }

    if (format === "json") {
      return JSON.stringify(
        {
          project: activeProject,
          roadmap: activeRoadmap,
          summary: summary || null,
          files: files.map((f: any) => ({ name: f.file_name, type: f.file_type, size: f.file_size })),
          chats: chatsData,
        },
        null,
        2
      );
    }

    // Markdown format
    const lines = [
      `# Project Workspace: ${activeProject?.name || "Project Overview"}`,
      `**Description:** ${activeProject?.description || "No description provided."}`,
      `**Status:** ${projectStatus} (${progressPercent}% complete)`,
      `**Exported At:** ${new Date().toLocaleString()}`,
      "",
      "---",
      "",
      "## 📊 Project Metadata",
      `* **Total Discussions:** ${sessions.length}`,
      `* **Knowledge Files:** ${files.length} uploaded`,
      `* **Semantic Memories:** ${memoriesCount} nodes recorded`,
      "",
    ];

    if (summary) {
      lines.push(
        "## ✨ AI Executive Summary",
        "### Goals",
        summary.goals,
        "",
        "### Key Decisions",
        summary.decisions,
        "",
        "### Architecture Layout",
        summary.architecture,
        "",
        "### Next Steps",
        summary.next_steps,
        "",
        "### Identified Risks",
        summary.risks,
        ""
      );
    }

    lines.push("## 🗺️ Project Roadmap Progress", "");
    if (activeRoadmap?.phases_json?.phases) {
      activeRoadmap.phases_json.phases.forEach((phase: any, pIdx: number) => {
        lines.push(`### Phase ${pIdx + 1}: ${phase.title}`);
        (phase.tasks || []).forEach((task: any) => {
          const check = task.completed ? "[x]" : "[ ]";
          lines.push(`- ${check} ${task.title}`);
        });
        lines.push("");
      });
    } else {
      lines.push("*No roadmap generated yet.*", "");
    }

    lines.push("## 💬 Chat Sessions Logs", "");
    chatsData.forEach(chat => {
      lines.push(`### Discussion: ${chat.title} (${chat.mode === "voice" ? "Voice" : "Text"} Session)`);
      lines.push(`*Created at: ${new Date(chat.created_at).toLocaleString()}*`, "");
      chat.messages.forEach((msg: any) => {
        lines.push(`**${msg.role === "user" ? "USER" : "AI"} (${new Date(msg.created_at).toLocaleTimeString()}):**`);
        lines.push(msg.content);
        lines.push("");
      });
      lines.push("---", "");
    });

    return lines.join("\n");
  };

  const handleExportMarkdown = async () => {
    setExportOpen(false);
    const toastId = toast.loading("Compiling project document...");
    try {
      const md = await buildProjectDocument("markdown");
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeProject?.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_project_workspace.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Project document exported as Markdown!", { id: toastId });
    } catch (err) {
      toast.error("Export compilation failed.", { id: toastId });
    }
  };

  const handleExportJSON = async () => {
    setExportOpen(false);
    const toastId = toast.loading("Compiling workspace database dump...");
    try {
      const jsonStr = await buildProjectDocument("json");
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeProject?.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_workspace_dump.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Workspace dump exported as JSON!", { id: toastId });
    } catch (err) {
      toast.error("Export compilation failed.", { id: toastId });
    }
  };

  const handleExportPDF = async () => {
    setExportOpen(false);
    const toastId = toast.loading("Compiling printable document...");
    try {
      const md = await buildProjectDocument("markdown");
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${activeProject?.name || "Workspace"} Export</title>
  <style>
    body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; max-width:850px; margin:40px auto; color:#1a1a1a; line-height:1.6; padding:0 24px; }
    h1 { border-bottom:3px solid #6366f1; padding-bottom:12px; color:#111; }
    h2 { color:#4f46e5; border-bottom:1px solid #e5e7eb; padding-bottom:6px; margin-top:2em; font-size:1.4em; }
    h3 { color:#312e81; margin-top:1.5em; font-size:1.1em; }
    pre { background:#f4f4f5; padding:12px; border-radius:6px; overflow-x:auto; font-size:0.9em; border: 1px solid #e4e4e7; }
    code { font-family: monospace; font-size:0.9em; background:#f4f4f5; padding:2px 5px; border-radius:4px; }
    ul { padding-left:20px; }
    li { margin-bottom: 4px; }
    hr { border:none; border-top:1px solid #e4e4e7; margin:2em 0; }
    @media print { body { margin:20px; } }
  </style>
</head>
<body>
  <pre style="white-space:pre-wrap;font-family:inherit;font-size:inherit;background:none;padding:0;border:none">${md.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
</body>
</html>`;
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
      }
      toast.success("Print dialog opened for PDF generation", { id: toastId });
    } catch (err) {
      toast.error("Export compilation failed.", { id: toastId });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Dashboard Top Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeProject?.icon || "🧠"}</span>
            <h1 className="text-lg font-bold text-white/90">{activeProject?.name} Workspace</h1>
          </div>
          <p className="text-xs text-white/40 mt-1 max-w-xl line-clamp-2">
            {activeProject?.description || "Collaborative multi-agent development space."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 relative">
          <button
            onClick={() => setExportOpen(prev => !prev)}
            className="px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-[11.5px] font-semibold transition-all flex items-center gap-1.5"
          >
            📥 Export Workspace
          </button>

          <AnimatePresence>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-[#0d0e16] border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold px-3.5 pt-3 pb-1.5">Export formats</p>
                  <button
                    onClick={handleExportPDF}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-white/[0.04] text-xs text-white/70 border-b border-white/[0.04]"
                  >
                    <span>📄</span>
                    <div>
                      <p className="font-semibold text-white/85">Export as PDF Document</p>
                      <p className="text-[9.5px] text-white/30 mt-0.5">Print ready report layout</p>
                    </div>
                  </button>
                  <button
                    onClick={handleExportMarkdown}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-white/[0.04] text-xs text-white/70 border-b border-white/[0.04]"
                  >
                    <span>📝</span>
                    <div>
                      <p className="font-semibold text-white/85">Export as Markdown</p>
                      <p className="text-[9.5px] text-white/30 mt-0.5">Perfect for project wikis</p>
                    </div>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-white/[0.04] text-xs text-white/70"
                  >
                    <span>⚙️</span>
                    <div>
                      <p className="font-semibold text-white/85">Export as JSON Dump</p>
                      <p className="text-[9.5px] text-white/30 mt-0.5">Raw workspace dump parameters</p>
                    </div>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <Button onClick={onNewChat} className="bg-violet-600 hover:bg-violet-500 text-xs font-semibold px-4 py-2 rounded-xl">
            💬 Start Discussion
          </Button>
        </div>
      </div>

      {/* Dynamic Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Project Status */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4.5 space-y-1.5 backdrop-blur-md">
          <span className="text-[9.5px] font-bold uppercase tracking-widest text-white/30">Workspace Status</span>
          <div className="flex items-center gap-2">
            <div className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", statusColor)}>
              {projectStatus}
            </div>
          </div>
        </div>

        {/* Roadmap Progress */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4.5 space-y-2.5 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <span className="text-[9.5px] font-bold uppercase tracking-widest text-white/30">Roadmap Progress</span>
            <span className="text-[10px] text-white/50 font-bold font-mono">{progressPercent}%</span>
          </div>
          <div className="space-y-1">
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-[9px] text-white/20 block">{completedTasksCount} / {totalTasksCount} tasks complete</span>
          </div>
        </div>

        {/* Files Uploaded */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4.5 space-y-1 backdrop-blur-md">
          <span className="text-[9.5px] font-bold uppercase tracking-widest text-white/30">Knowledge Database</span>
          <p className="text-xl font-black font-mono text-white/80">{files.length}</p>
          <span className="text-[9.5px] text-white/25 block">Uploaded files & documents</span>
        </div>

        {/* Memories count */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4.5 space-y-1 backdrop-blur-md">
          <span className="text-[9.5px] font-bold uppercase tracking-widest text-white/30">Persistent Memory</span>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-black font-mono text-white/80">
              {memoriesLoading ? "..." : memoriesCount}
            </p>
            <span className="text-[10px] text-violet-400 font-bold">pgvector</span>
          </div>
          <span className="text-[9.5px] text-white/25 block">Cross-session learnings</span>
        </div>
      </div>

      {/* Main Grid: Summary & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Project Timeline & Files Column (Left) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Visual Project Timeline */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-5 space-y-4.5 backdrop-blur-md">
            <span className="text-[9.5px] font-bold uppercase tracking-widest text-white/30 block">Project Milestone Path</span>
            
            <div className="relative pl-6 space-y-6 border-l border-white/[0.08] ml-2 mt-2">
              {[
                { phase: "Phase 1: Research", task: "Web indices lookup & Crawler setup", trigger: progressPercent >= 10 },
                { phase: "Phase 2: Architecture", task: "API endpoints & Data model layouts", trigger: progressPercent >= 30 },
                { phase: "Phase 3: Backend Tasks", task: "Business logic workflows & Memory storage", trigger: progressPercent >= 60 },
                { phase: "Phase 4: Frontend & UI", task: "Interactive dashboards & Voice setup", trigger: progressPercent >= 80 },
                { phase: "Phase 5: Deployment", task: "YAML orchestration config & Build checks", trigger: progressPercent === 100 },
              ].map((step, sIdx) => (
                <div key={step.phase} className="relative">
                  {/* Timeline point */}
                  <div className={cn(
                    "absolute -left-[31px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 transition-all",
                    step.trigger 
                      ? "bg-violet-600 border-violet-500 shadow-md shadow-violet-500/25" 
                      : "bg-[#0d0e16] border-white/[0.12]"
                  )}>
                    {step.trigger && <span className="text-[7.5px] text-white font-bold">✓</span>}
                  </div>
                  <div>
                    <h4 className={cn("text-[11.5px] font-bold", step.trigger ? "text-white/90" : "text-white/30")}>
                      {step.phase}
                    </h4>
                    <p className="text-[9.5px] text-white/30 mt-0.5">{step.task}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Files List Preview */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-5 space-y-3.5 backdrop-blur-md">
            <span className="text-[9.5px] font-bold uppercase tracking-widest text-white/30 block">Workspace Documents</span>
            <div className="space-y-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {files.map((file: any) => (
                <div key={file.id} className="flex items-center justify-between p-2.5 bg-white/[0.01] border border-white/[0.04] rounded-xl hover:border-white/[0.08] transition-all">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono text-white/70 truncate">{file.file_name}</p>
                    <span className="text-[8.5px] text-white/25 mt-0.5 block">
                      {(file.file_size / 1024).toFixed(1)} KB · {file.file_type?.split("/")[1] || "doc"}
                    </span>
                  </div>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] font-bold flex-shrink-0 uppercase",
                    file.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" :
                    file.status === "processing" ? "bg-amber-500/10 text-amber-400 border border-amber-500/10" :
                    "bg-red-500/10 text-red-400 border border-red-500/10"
                  )}>
                    {file.status}
                  </span>
                </div>
              ))}
              {files.length === 0 && (
                <p className="text-[10px] text-white/20 italic text-center py-4">No documents uploaded. Click 📎 in chat to upload context files.</p>
              )}
            </div>
          </div>

        </div>

        {/* AI summary & Chats Section (Right Columns) */}
        <div className="lg:col-span-2 space-y-6">

          {/* AI Project Summary */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-5 space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
              <span className="text-[9.5px] font-bold uppercase tracking-widest text-white/30">✨ AI Executive Project Summary</span>
              <button
                disabled={generateSummary.isPending}
                onClick={handleGenerateSummary}
                className="px-2.5 py-1.5 rounded-lg border border-violet-500/20 bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 text-[10px] font-bold transition-all disabled:opacity-40"
              >
                {generateSummary.isPending ? "Generating..." : "🔄 Regenerate"}
              </button>
            </div>

            {summaryLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-t-violet-500 border-r-transparent animate-spin rounded-full" />
                <span className="text-[10px] text-white/35">Fetching summary metadata...</span>
              </div>
            ) : summary ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                {[
                  { title: "🎯 Scope & Goals", value: summary.goals },
                  { title: "🛠️ System Architecture", value: summary.architecture },
                  { title: "⚖️ Milestone Progress", value: summary.roadmap },
                  { title: "⚖️ Core Technical Decisions", value: summary.decisions },
                  { title: "⚡ Immediate Next Steps", value: summary.next_steps },
                  { title: "⚠️ Primary Risks & Blocks", value: summary.risks },
                ].map((sec) => (
                  <div key={sec.title} className="bg-white/[0.01] border border-white/[0.04] p-3 rounded-2xl space-y-1.5">
                    <h4 className="text-[11px] font-bold text-white/80">{sec.title}</h4>
                    <p className="text-[11px] text-white/50 leading-relaxed whitespace-pre-wrap">{sec.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/[0.01] border border-white/[0.04] border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
                <p className="text-[11px] text-white/35 max-w-sm leading-relaxed">
                  No AI Project summary generated yet. The AI can audit your chats, checklist roadmap, and documents to construct goals, risks, decisions, and next steps block.
                </p>
                <button
                  disabled={generateSummary.isPending}
                  onClick={handleGenerateSummary}
                  className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold hover:shadow-lg hover:shadow-violet-600/25 active:scale-[0.98] transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  {generateSummary.isPending ? "Generating..." : "✨ Generate AI Project Summary"}
                </button>
              </div>
            )}
          </div>

          {/* Recent Discussion Sessions */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-5 space-y-3.5 backdrop-blur-md">
            <span className="text-[9.5px] font-bold uppercase tracking-widest text-white/30 block">Recent Chat Discussions</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sessions.slice(0, 4).map((s: any) => (
                <div key={s.id} className="bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.05] rounded-2xl p-3.5 flex flex-col justify-between gap-3 group transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]">{s.mode === "voice" ? "🎤" : "💬"}</span>
                      <h4 className="text-xs font-bold text-white/80 group-hover:text-white transition-all truncate max-w-[200px]" title={s.title}>
                        {s.title}
                      </h4>
                    </div>
                    <span className="text-[9px] text-white/20 block font-mono">Created {new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <button
                    onClick={() => onSelectSession(s)}
                    className="self-end px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.18] bg-white/[0.03] text-white/60 hover:text-white text-[10px] font-medium transition-all"
                  >
                    Resume Discussion →
                  </button>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="col-span-2 text-center py-6 text-white/20 italic text-xs">No active chat sessions. Click "Start Discussion" above to create one.</div>
              )}
            </div>
          </div>

          {/* Agent usage Analytics visual grids */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-5 space-y-3.5 backdrop-blur-md">
            <span className="text-[9.5px] font-bold uppercase tracking-widest text-white/30 block">Agent Usage Analytics</span>
            
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { name: "QA", icon: "🧠", key: "qa", color: "bg-indigo-500" },
                { name: "Research", icon: "🔍", key: "research", color: "bg-emerald-500" },
                { name: "Engineering", icon: "⚙️", key: "engineering", color: "bg-amber-500" },
                { name: "Planner", icon: "🗺️", key: "planner", color: "bg-purple-500" },
                { name: "Critic", icon: "🎯", key: "critic", color: "bg-red-500" },
                { name: "Innovation", icon: "💡", key: "innovation", color: "bg-cyan-500" },
              ].map((agent) => {
                const calls = agentUsageStats[agent.key] || 0;
                return (
                  <div key={agent.key} className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-2.5 text-center space-y-1">
                    <span className="text-sm block">{agent.icon}</span>
                    <span className="text-[9.5px] font-medium text-white/45 block truncate">{agent.name}</span>
                    <span className="text-xs font-black text-white/80 font-mono block">{calls} Calls</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
