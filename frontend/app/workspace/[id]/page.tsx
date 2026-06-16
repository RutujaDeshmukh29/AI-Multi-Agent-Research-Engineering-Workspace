"use client";
// ================================================================
// app/workspace/[id]/page.tsx  — ROADMAP REFACTORED
// - Centralized roadmap state in useWorkspaceStore
// - Using RoadmapPanel component
// - All API calls point to the correct projectService
// ================================================================

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { useAuthStore } from "@/store/authStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import {
  useProjects, useSessions,
  useCreateSession, useDeleteSession, useRenameSession,
} from "@/hooks/useProjects";
import { useChat } from "@/hooks/useChat";
import { getRoadmap, generateRoadmap, updateRoadmapTask, deleteRoadmap } from "@/services/projectService";
import { cn } from "@/lib/utils";

import { CommandPalette, useCommandPalette, type Command } from "@/components/ui/CommandPalette";
import { ExportChat } from "@/components/export/ExportChat";
import { AgentOrchestrationGraph } from "@/components/agents/AgentOrchestrationGraph";
import { MemoryPanel } from "@/components/workspace/MemoryPanel";
import { RoadmapPanel } from "@/components/roadmap/RoadmapPanel";
import { Button } from "@/components/ui/Button";

const AGENTS = [
  { key: "qa",          label: "QA",          icon: "🧠", color: "#818cf8" },
  { key: "research",    label: "Research",    icon: "🔍", color: "#34d399" },
  { key: "engineering", label: "Engineering", icon: "⚙️", color: "#fbbf24" },
  { key: "planner",     label: "Planner",     icon: "🗺️", color: "#a78bfa" },
  { key: "critic",      label: "Critic",      icon: "🎯", color: "#f87171" },
  { key: "innovation",  label: "Innovation",  icon: "💡", color: "#22d3ee" },
];

type RightTab = "roadmap" | "memory" | "graph";

export default function WorkspacePage() {
  const params    = useParams();
  const router    = useRouter();
  const projectId = params?.id as string;

  const { user, isAuthenticated } = useAuthStore();
  const { 
    activeProject, 
    activeRoadmap, 
    setActiveRoadmap, 
    activeSession,
    setActiveProject, 
    setActiveSession, 
  } = useWorkspaceStore();


  // UI state
  const [sidebarOpen,     setSidebarOpen]     = useState(true);
  const [rightPanelOpen,  setRightPanelOpen]  = useState(false);
  const [rightTab,        setRightTab]        = useState<RightTab>("roadmap");
  const [inputValue,      setInputValue]      = useState("");
  const [isVoice,         setIsVoice]         = useState(false);
  const [expandedAgents,  setExpandedAgents]  = useState<Set<string>>(new Set());
  const [profileOpen,     setProfileOpen]     = useState(false);
  const [renameId,        setRenameId]        = useState<string | null>(null);
  const [renameVal,       setRenameVal]       = useState("");
  const [lastQuery,       setLastQuery]       = useState("");
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  // Data hooks
  const { data: projects  = [] } = useProjects();
  const { data: sessions  = [] } = useSessions(projectId);
  const createSession            = useCreateSession();
  const deleteSession            = useDeleteSession();
  const renameSession            = useRenameSession();

  const { messages, agentEvents, isStreaming, sendMessage, setMessages } = useChat(projectId, activeSession?.id);

  // Command palette
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();

  // ── Effects ────────────────────────────────────────────────────
  useEffect(() => { if (!isAuthenticated) router.push("/auth/login"); }, [isAuthenticated, router]);
  
  useEffect(() => {
    const proj = projects.find((p: any) => p.id === projectId);
    if (proj) setActiveProject(proj);
  }, [projectId, projects, setActiveProject]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isStreaming]);

  useEffect(() => {
    if (projectId) {
      getRoadmap(projectId)
        .then(data => { if (data) setActiveRoadmap(data); })
        .catch(() => {});
    }
  }, [projectId, messages.length, setActiveRoadmap]);

  // ── Derived ────────────────────────────────────────────────────
  const initials       = user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const getAgentStatus = (key: string) => {
    const evs = agentEvents.filter(e => e.agent === key);
    return evs.length ? evs[evs.length - 1].status : "idle";
  };

  const agentNodes = AGENTS.map(a => ({
    ...a,
    status: getAgentStatus(a.key) as any,
    message: agentEvents.filter(e => e.agent === a.key).slice(-1)[0]?.message,
  }));

  // ── Actions ────────────────────────────────────────────────────
  const handleNewSession = async () => {
    if (!projectId) return;

    try {
      const s = await createSession.mutateAsync({ projectId, data: { title: "New Chat" } });
      setActiveSession(s);
    } catch (err) {
      console.error("Failed to create new session", err);
      toast.error("Unable to create a new chat. Try again.");
    }
  };

  const handleSend = async () => {
    const msg = inputValue.trim();
    if (!msg || isStreaming) return;

    setInputValue("");
    setLastQuery(msg);

    try {
      let sessionId = activeSession?.id;
      if (!sessionId) {
        const s = await createSession.mutateAsync({ projectId, data: { title: msg.slice(0, 50) } });
        sessionId = s.id;
        setActiveSession(s);
      }

      if (sessionId) {
        await sendMessage(msg, isVoice ? "voice" : "text", sessionId);
      }
    } catch (err) {
      console.error("Failed to send chat message", err);
      toast.error("Unable to send message. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };
  
  const handleGenerateRoadmap = async () => {
    if (!activeProject) return;
    setIsGeneratingRoadmap(true);
    try {
      const newRoadmap = await generateRoadmap(activeProject.id);
      setActiveRoadmap(newRoadmap);
      toast.success("Roadmap generated successfully!");
    } catch (error: any) {
      console.error("Failed to generate roadmap", error);
      const detail = error.response?.data?.detail || "An unexpected error occurred.";
      toast.error("Failed to generate roadmap", {
        description: detail,
      });
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const handleDeleteRoadmap = async () => {
    if (!activeProject || !activeRoadmap) return;
    if (!confirm("Are you sure you want to delete this roadmap?")) return;

    try {
      await deleteRoadmap(activeProject.id);
      setActiveRoadmap(null);
      toast.success("Roadmap deleted.");
    } catch (error: any) {
      console.error("Failed to delete roadmap", error);
      toast.error("Failed to delete roadmap", {
        description: error.response?.data?.detail || "An unexpected error occurred.",
      });
    }
  };

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    if (!activeProject) return;
    try {
      const updatedRoadmap = await updateRoadmapTask(activeProject.id, taskId, completed);
      setActiveRoadmap(updatedRoadmap);
    } catch (err) {
      console.error("Failed to update roadmap task", err);
      toast.error("Unable to update task. Please try again.");
    }
  };

  const openRight = (tab: RightTab) => {
    setRightTab(tab);
    setRightPanelOpen(true);
  };

  // ── Command palette commands ───────────────────────────────────
  const commands: Command[] = [
    { id: "new-chat",     label: "New Chat",         description: "Start a fresh conversation", icon: "💬", shortcut: "N",       group: "Navigation", action: handleNewSession },
    { id: "dashboard",    label: "Go to Dashboard",  description: "All your projects",          icon: "🏠", shortcut: "D",       group: "Navigation", action: () => router.push("/dashboard") },
    { id: "roadmap",      label: "Open Roadmap",     description: "View project checklist",     icon: "🗺️", shortcut: "R",       group: "Panels",     action: () => openRight("roadmap") },
    { id: "memory",       label: "Open Memory",      description: "View semantic memories",     icon: "🧠", shortcut: "M",       group: "Panels",     action: () => openRight("memory") },
    { id: "graph",        label: "Agent Graph",      description: "Orchestration visualization",icon: "🔀",                      group: "Panels",     action: () => openRight("graph") },
    { id: "toggle-sb",    label: "Toggle Sidebar",   description: "Show/hide sidebar",          icon: "◧",  shortcut: "\\",     group: "View",       action: () => setSidebarOpen(p => !p) },
    { id: "voice",        label: "Toggle Voice Mode",description: "Switch input to voice",      icon: "🎤",                      group: "Input",      action: () => setIsVoice(p => !p) },
    { id: "export",       label: "Export Chat",      description: "Download as Markdown/PDF",   icon: "⬇️",                      group: "Actions",    action: () => {} },
    { id: "logout",       label: "Sign Out",         description: "Log out of workspace",       icon: "🚪",                      group: "Account",    action: () => { router.push("/auth/login"); } },
  ];

  return (
    <div className="flex h-screen bg-[#080910] text-white overflow-hidden">

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />

      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -224, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -224, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="w-[220px] flex-shrink-0 bg-[#0d0e16] border-r border-white/[0.06] flex flex-col z-10"
          >
            <div className="p-3.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">✦</div>
                <span className="text-[13px] font-semibold tracking-tight">AI Workspace</span>
              </div>
              <button onClick={handleNewSession}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/25 text-violet-300 text-[12px] font-medium hover:bg-violet-500/18 transition-all">
                <span className="text-base leading-none">+</span> New Chat
              </button>
              <button onClick={() => setCmdOpen(true)}
                className="w-full mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] text-white/20 text-[11px] hover:border-white/[0.12] hover:text-white/40 transition-all">
                <span>⌘</span><span className="flex-1 text-left">Command palette</span>
                <kbd className="text-[9px] bg-white/[0.05] px-1.5 py-0.5 rounded font-mono">K</kbd>
              </button>
            </div>

            <div className="px-2.5 pt-3 pb-1">
              <p className="text-[9.5px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-2">Projects</p>
              {projects.map((p: any) => (
                <button key={p.id} onClick={() => router.push(`/workspace/${p.id}`)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all mb-0.5",
                    p.id === projectId ? "bg-violet-500/12 text-violet-300" : "text-white/40 hover:bg-white/[0.04] hover:text-white/65"
                  )}>
                  <span className="text-sm flex-shrink-0">{p.icon || "🧠"}</span>
                  <span className="text-[12px] font-medium truncate">{p.name}</span>
                </button>
              ))}
            </div>

            <div className="px-2.5 pt-2 pb-1 flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: "none" }}>
              <p className="text-[9.5px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-2">Chats</p>
              {sessions.map((s: any) => (
                <div key={s.id} className="group relative mb-0.5">
                  {renameId === s.id ? (
                    <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                      onBlur={async () => {
                        try {
                          if (renameVal.trim()) {
                            await renameSession.mutateAsync({ projectId, sessionId: s.id, title: renameVal });
                          }
                        } catch (err) {
                          console.error("Failed to rename session", err);
                          toast.error("Unable to rename chat. Please try again.");
                        } finally {
                          setRenameId(null);
                        }
                      }}
                      onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setRenameId(null); }}
                      className="w-full px-2.5 py-2 bg-violet-500/10 border border-violet-500/30 rounded-lg text-[12px] text-white/80 outline-none" />
                  ) : (
                    <button onClick={() => setActiveSession(s)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all pr-14",
                        s.id === activeSession?.id ? "bg-white/[0.07] text-white/80" : "text-white/35 hover:bg-white/[0.04] hover:text-white/55"
                      )}>
                      <span className="text-[10px] opacity-50 flex-shrink-0">{s.mode === "voice" ? "🎤" : "💬"}</span>
                      <span className="text-[12px] truncate flex-1">{s.title}</span>
                    </button>
                  )}
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
                    <button onClick={() => { setRenameId(s.id); setRenameVal(s.title); }}
                      className="w-5 h-5 rounded flex items-center justify-center text-[9px] text-white/30 hover:text-white/60 hover:bg-white/10 transition-all">✏</button>
                    <button onClick={async () => {
                      try {
                        await deleteSession.mutateAsync({ projectId, sessionId: s.id });
                        if (activeSession?.id === s.id) {
                          setActiveSession(null);
                          setMessages([]);
                        }
                      } catch (err) {
                        console.error("Failed to delete session", err);
                        toast.error("Unable to delete chat. Please try again.");
                      }
                    }}
                      className="w-5 h-5 rounded flex items-center justify-center text-[9px] text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">✕</button>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-[11px] text-white/18 px-2 py-4 text-center leading-relaxed">No chats yet.<br/>Click <strong className="text-white/35">+ New Chat</strong> above.</p>
              )}
            </div>

            <div className="p-2.5 border-t border-white/[0.06] relative">
              <button onClick={() => setProfileOpen(p => !p)}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-all">
                <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-[11px] font-bold flex-shrink-0">{initials}</div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[12px] font-medium text-white/65 truncate">{user?.name}</div>
                  <div className="text-[10px] text-white/30 truncate">{user?.email}</div>
                </div>
                <span className="text-white/20 text-[11px]">⚙</span>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-14 left-3 w-56 bg-[#12131e] border border-white/[0.1] rounded-xl shadow-2xl p-3 z-50"
                  >
                    <div className="flex items-center gap-3 pb-3 border-b border-white/[0.07] mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-sm font-bold flex-shrink-0">{initials}</div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-white/80 truncate">{user?.name}</div>
                        <div className="text-[10px] text-white/35 truncate">{user?.email}</div>
                      </div>
                    </div>
                    {[
                      { icon: "🐙", label: "Connect GitHub",   action: () => {} },
                      { icon: "📧", label: "Connect Gmail",    action: () => {} },
                      { icon: "📷", label: "Upload Photo",     action: () => {} },
                      { icon: "🧠", label: "View Memories",    action: () => { openRight("memory"); setProfileOpen(false); } },
                      { icon: "🚪", label: "Sign Out",         action: () => router.push("/auth/login") },
                    ].map(item => (
                      <button key={item.label} onClick={() => { item.action(); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[12px] text-white/50 hover:text-white/75 hover:bg-white/[0.05] transition-all">
                        <span className="w-4 text-center">{item.icon}</span>{item.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">

        <div className="h-12 border-b border-white/[0.06] flex items-center px-4 gap-3 flex-shrink-0 bg-[#080910]/90 backdrop-blur-sm">
          <button onClick={() => setSidebarOpen(p => !p)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all text-sm flex-shrink-0">☰</button>

          <div className="flex-1 min-w-0">
            <span className="text-[12.5px] font-medium text-white/50 truncate">
              {activeProject?.name || "Workspace"}
              {activeSession && <span className="text-white/25"> / {activeSession.title}</span>}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5">
            {AGENTS.slice(1).map(a => {
              const st = getAgentStatus(a.key);
              return (
                <div key={a.key} className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-medium transition-all",
                  st === "thinking" ? "border-violet-500/40 bg-violet-500/10 text-violet-300" :
                  st === "done"     ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-400" :
                                      "border-white/[0.07] text-white/22"
                )}>
                  {st === "thinking" && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
                  {st === "done"     && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  {st === "idle"     && <span className="w-1.5 h-1.5 rounded-full bg-white/12" />}
                  {a.icon}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ExportChat
              messages={messages}
              sessionTitle={activeSession?.title || "Chat"}
              projectName={activeProject?.name || "Project"}
            />
            {(["roadmap", "memory", "graph"] as RightTab[]).map(tab => (
              <button key={tab} onClick={() => rightPanelOpen && rightTab === tab ? setRightPanelOpen(false) : openRight(tab)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all capitalize",
                  rightPanelOpen && rightTab === tab
                    ? "bg-violet-500/15 border-violet-500/30 text-violet-300"
                    : "border-white/[0.08] text-white/30 hover:border-white/[0.18] hover:text-white/55"
                )}>
                {tab === "roadmap" ? "🗺️" : tab === "memory" ? "🧠" : "🔀"}
                <span className="ml-1 hidden sm:inline">{tab}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {agentEvents.length > 0 && isStreaming && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-white/[0.04] bg-black/20 px-4 py-2 flex items-center gap-2 flex-wrap flex-shrink-0"
            >
              <span className="flex items-center gap-1.5 mr-1 flex-shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                </span>
                <span className="text-[9.5px] text-violet-400/70 uppercase tracking-wider font-medium">Live</span>
              </span>
              {agentEvents.slice(-6).map((ev, i) => (
                <motion.div key={`${ev.agent}-${i}`}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] font-medium",
                    ev.status === "thinking" ? "text-violet-400 border-violet-500/35 bg-violet-500/8" :
                    ev.status === "done"     ? "text-emerald-400 border-emerald-500/25 bg-emerald-500/6" :
                                               "text-red-400 border-red-500/20"
                  )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full",
                    ev.status === "thinking" ? "bg-violet-400 animate-pulse" :
                    ev.status === "done"     ? "bg-emerald-400" : "bg-red-400"
                  )} />
                  {AGENTS.find(a => a.key === ev.agent)?.icon || "🤖"} {ev.message}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 min-h-0">

          <div className="flex-1 flex flex-col min-w-0">

            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.07) transparent" }}>

              {messages.length === 0 && !isStreaming && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="text-5xl mb-1">✦</motion.div>
                  <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="text-xl font-semibold text-white/70">What shall we build?</motion.h2>
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="text-[13px] text-white/28 max-w-xs leading-relaxed">
                    6 specialized AI agents will collaborate to research, architect, plan, critique and innovate.
                  </motion.p>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 gap-2 w-full max-w-sm mt-2">
                    {[
                      "Build an AI crop monitoring drone",
                      "Design a RAG system architecture",
                      "Create a SaaS authentication flow",
                      "Plan a machine learning pipeline",
                    ].map(s => (
                      <button key={s} onClick={() => setInputValue(s)}
                        className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.07] rounded-xl text-[12px] text-white/45 hover:text-white/70 hover:bg-white/[0.06] hover:border-white/[0.13] transition-all text-left leading-snug">
                        {s}
                      </button>
                    ))}
                  </motion.div>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="text-[10.5px] text-white/18 mt-2">
                    Press <kbd className="bg-white/[0.06] border border-white/[0.1] px-1.5 py-0.5 rounded text-[9.5px] font-mono">⌘K</kbd> for command palette
                  </motion.p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>

                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-violet-500 to-pink-500"
                      : "bg-gradient-to-br from-indigo-600 to-violet-600"
                  )}>
                    {msg.role === "user" ? initials : "✦"}
                  </div>

                  <div className={cn("max-w-[78%] flex flex-col gap-2", msg.role === "user" ? "items-end" : "items-start")}>
                    {(msg as any).input_mode === "voice" && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">🎤 Voice input</span>
                    )}

                    <div className={cn(
                      "px-4 py-3 text-[13px] leading-relaxed",
                      msg.role === "user"
                        ? "bg-violet-500/14 border border-violet-500/20 rounded-2xl rounded-tr-sm text-white/85"
                        : "bg-white/[0.04] border border-white/[0.07] rounded-2xl rounded-tl-sm text-white/80"
                    )}>
                      {msg.role === "assistant" ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                          code: ({ className, children, ...props }: any) => {
                            const inline = !className;
                            return inline
                              ? <code className="bg-white/10 px-1.5 py-0.5 rounded text-violet-300 text-[12px] font-mono" {...props}>{children}</code>
                              : <pre className="bg-black/40 border border-white/[0.09] rounded-xl p-3 overflow-x-auto my-2 text-[12px]"><code className="font-mono text-white/70" {...props}>{children}</code></pre>;
                          },
                          h1: ({ children }: any) => <h1 className="text-[15px] font-bold text-white/90 mt-3 mb-2">{children}</h1>,
                          h2: ({ children }: any) => <h2 className="text-[13.5px] font-semibold text-white/85 mt-3 mb-1.5 flex items-center gap-2">{children}</h2>,
                          h3: ({ children }: any) => <h3 className="text-[13px] font-medium text-white/75 mt-2 mb-1">{children}</h3>,
                          p:  ({ children }: any) => <p className="text-[13px] text-white/75 leading-relaxed mb-2">{children}</p>,
                          ul: ({ children }: any) => <ul className="space-y-1 my-1.5 pl-4">{children}</ul>,
                          ol: ({ children }: any) => <ol className="space-y-1 my-1.5 pl-4 list-decimal">{children}</ol>,
                          li: ({ children }: any) => <li className="text-[12.5px] text-white/68 list-disc">{children}</li>,
                          table: ({ children }: any) => <div className="overflow-x-auto my-2"><table className="w-full text-[11.5px] border-collapse">{children}</table></div>,
                          th: ({ children }: any) => <th className="border border-white/10 px-2 py-1.5 text-white/60 font-semibold bg-white/[0.05] text-left">{children}</th>,
                          td: ({ children }: any) => <td className="border border-white/[0.07] px-2 py-1.5 text-white/50">{children}</td>,
                          blockquote: ({ children }: any) => <blockquote className="border-l-2 border-violet-500/50 pl-3 my-2 text-white/50 italic">{children}</blockquote>,
                          strong: ({ children }: any) => <strong className="font-semibold text-white/85">{children}</strong>,
                        }}>
                          {msg.content || "⏳"}
                        </ReactMarkdown>
                      ) : msg.content}
                    </div>

                    {msg.agent_outputs && Object.keys(msg.agent_outputs).length > 0 && (
                      <div className="w-full space-y-1.5">
                        {Object.entries(msg.agent_outputs).map(([agent, output]) => {
                          const cfg      = AGENTS.find(a => a.key === agent);
                          const key      = `${msg.id}-${agent}`;
                          const isOpen   = expandedAgents.has(key);
                          return (
                            <div key={agent} className="bg-black/22 border border-white/[0.06] rounded-xl overflow-hidden">
                              <button onClick={() => setExpandedAgents(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] transition-all text-left">
                                <span className="text-[11px]">{cfg?.icon || "🤖"}</span>
                                <span className="text-[10.5px] font-semibold" style={{ color: cfg?.color || "#a5b4fc" }}>
                                  {cfg?.label || agent} Agent
                                </span>
                                <span className="ml-auto text-[9px] text-white/22">{isOpen ? "▾ collapse" : "▸ expand"}</span>
                              </button>
                              <AnimatePresence>
                                {isOpen && (
                                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="px-3 pb-3">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                        p:  ({ children }: any) => <p className="text-[11.5px] text-white/48 leading-relaxed mb-1">{children}</p>,
                                        li: ({ children }: any) => <li className="text-[11.5px] text-white/45 list-disc ml-3 mb-0.5">{children}</li>,
                                        code: ({ children }: any) => <code className="text-[11px] font-mono text-violet-300/80 bg-white/8 px-1 rounded">{children}</code>,
                                        strong: ({ children }: any) => <strong className="font-semibold text-white/60">{children}</strong>,
                                      }}>{output as string}</ReactMarkdown>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {isStreaming && (messages.length === 0 || messages[messages.length - 1]?.role === "user") && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-xs font-bold flex-shrink-0">✦</div>
                  <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.04] border border-white/[0.07] rounded-2xl rounded-tl-sm">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400/60"
                        animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 md:px-6 pb-4 pt-2 flex-shrink-0">
              <div className={cn(
                "flex items-end gap-2.5 bg-white/[0.04] border rounded-2xl px-4 py-3 transition-all",
                isStreaming ? "border-violet-500/25" : "border-white/[0.09] focus-within:border-violet-500/35"
              )}>
                <textarea ref={inputRef} value={inputValue}
                  onChange={e => { setInputValue(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask the agents anything… (Enter to send, Shift+Enter for newline)"
                  rows={1} disabled={isStreaming}
                  className="flex-1 bg-transparent outline-none text-[13px] text-white/80 placeholder-white/18 leading-relaxed resize-none min-h-[22px]"
                  style={{ maxHeight: "120px" }}
                />
                <div className="flex items-center gap-1.5 flex-shrink-0 pb-0.5">
                  <button onClick={() => setIsVoice(p => !p)}
                    className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all border",
                      isVoice ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-white/[0.04] border-white/[0.09] text-white/32 hover:text-white/60"
                    )} title={isVoice ? "Voice mode on" : "Enable voice mode"}>🎤</button>
                  <button onClick={handleSend} disabled={isStreaming || !inputValue.trim()}
                    className="w-8 h-8 rounded-lg bg-violet-600/25 border border-violet-500/30 text-violet-300 flex items-center justify-center text-sm hover:bg-violet-600/40 transition-all disabled:opacity-35 disabled:cursor-not-allowed font-bold">↑</button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[10px] text-white/15">6 agents · pgvector memory · SSE streaming</span>
                <span className="text-[10px] text-white/15">⌘K commands</span>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {rightPanelOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="border-l border-white/[0.06] flex flex-col bg-[#0d0e16] overflow-hidden flex-shrink-0"
              >
                <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
                  <div className="flex gap-1.5">
                    {(["roadmap", "memory", "graph"] as RightTab[]).map(tab => (
                      <button key={tab} onClick={() => setRightTab(tab)}
                        className={cn("px-2.5 py-1 rounded-lg text-[10.5px] font-medium transition-all capitalize",
                          rightTab === tab ? "bg-violet-500/15 text-violet-300 border border-violet-500/25" : "text-white/28 hover:text-white/55"
                        )}>
                        {tab === "roadmap" ? "🗺️ Roadmap" : tab === "memory" ? "🧠 Memory" : "🔀 Graph"}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setRightPanelOpen(false)} className="w-6 h-6 rounded-lg flex items-center justify-center text-white/25 hover:text-white/55 hover:bg-white/[0.06] transition-all text-sm">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-3.5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.07) transparent" }}>

                  {rightTab === "roadmap" && (
                    activeRoadmap ? (
                      <RoadmapPanel 
                        roadmap={activeRoadmap} 
                        onTaskToggle={handleTaskToggle}
                        onRegenerate={handleGenerateRoadmap}
                        onDelete={handleDeleteRoadmap}
                        isGenerating={isGeneratingRoadmap}
                      />
                    ) : (
                      <div className="text-center py-14 px-3">
                        <div className="text-3xl mb-3">🗺️</div>
                        <div className="text-[12.5px] font-medium text-white/45 mb-2">No roadmap yet</div>
                        <div className="text-[11.5px] text-white/25 leading-relaxed">Ask the agents to plan a project, or generate one here.</div>
                        <Button onClick={handleGenerateRoadmap} disabled={isGeneratingRoadmap} className="mt-4">
                          {isGeneratingRoadmap ? "Generating..." : "Generate Roadmap"}
                        </Button>
                      </div>
                    )
                  )}

                  {rightTab === "memory" && (
                    <MemoryPanel searchQuery={lastQuery || undefined} />
                  )}

                  {rightTab === "graph" && (
                    <div className="space-y-3">
                      <AgentOrchestrationGraph agents={agentNodes} isActive={isStreaming} />
                      {!isStreaming && agentEvents.length === 0 && (
                        <div className="text-center text-[11.5px] text-white/25 py-4">
                          Send a message to see the agent orchestration graph.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

