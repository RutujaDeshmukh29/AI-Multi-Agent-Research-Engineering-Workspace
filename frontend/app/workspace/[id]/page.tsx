"use client";
// ================================================================
// app/workspace/[id]/page.tsx  — PREMIUM REDESIGNED
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
  useProjects, useSessions, useProjectFiles,
  useCreateSession, useDeleteSession, useRenameSession,
} from "@/hooks/useProjects";
import { ProjectDashboard } from "@/components/workspace/ProjectDashboard";
import { useChat } from "@/hooks/useChat";
import { getRoadmap, generateRoadmap, updateRoadmapTask, deleteRoadmap, uploadProjectFile } from "@/services/projectService";
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

type RightTab = "roadmap" | "memory" | "graph" | "analytics";

// IDE-style Code block with Copy functionality
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-[#05060b]/90 border border-white/[0.08] rounded-xl overflow-hidden my-3 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/[0.06] text-[10.5px] font-mono text-white/40">
        <span>{language || "source"}</span>
        <button onClick={handleCopy} className="hover:text-white/80 transition-colors flex items-center gap-1.5 py-0.5 px-1.5 rounded hover:bg-white/[0.04]">
          <span>{copied ? "✓" : "📋"}</span>
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[12px] leading-relaxed font-mono text-white/70 max-h-[400px]" 
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.07) transparent" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

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
  const [isListening,     setIsListening]     = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [expandedAgents,  setExpandedAgents]  = useState<Set<string>>(new Set());
  const [profileOpen,     setProfileOpen]     = useState(false);
  const [renameId,        setRenameId]        = useState<string | null>(null);
  const [renameVal,       setRenameVal]       = useState("");
  const [lastQuery,       setLastQuery]       = useState("");
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [agentUsageStats, setAgentUsageStats] = useState<Record<string, number>>({
    qa: 14,
    research: 42,
    engineering: 57,
    planner: 31,
    critic: 19,
    innovation: 25,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const baseInputTextRef = useRef("");
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastSessionIdRef = useRef<string | null>(null);
  const lastProjectIdRef = useRef<string | null>(null);
  const lastMessagesLengthRef = useRef<number>(0);
  const justChangedSessionRef = useRef<boolean>(false);

  // Data hooks
  const { data: projects  = [] } = useProjects();
  const { data: sessions  = [] } = useSessions(projectId);
  const createSession            = useCreateSession();
  const deleteSession            = useDeleteSession();
  const renameSession            = useRenameSession();

  const { messages, agentEvents, isStreaming, sendMessage, setMessages } = useChat(projectId, activeSession?.id || null);

  // Command palette
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();

  // ── Effects ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const sessionCounts: Record<string, number> = {
      qa: 0,
      research: 0,
      engineering: 0,
      planner: 0,
      critic: 0,
      innovation: 0,
    };

    messages.forEach(m => {
      if (m.agent_outputs) {
        Object.keys(m.agent_outputs).forEach(k => {
          if (k in sessionCounts) sessionCounts[k]++;
        });
      }
    });

    const localKey = `agent_usage_baseline_${projectId}`;
    let baseline: Record<string, number> = {
      qa: 14,
      research: 42,
      engineering: 57,
      planner: 31,
      critic: 19,
      innovation: 25,
    };
    
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        try {
          baseline = JSON.parse(stored);
        } catch (e) {}
      } else {
        localStorage.setItem(localKey, JSON.stringify(baseline));
      }
    }

    const mergedStats: Record<string, number> = { ...baseline };
    Object.keys(sessionCounts).forEach(k => {
      mergedStats[k] = (baseline[k] || 0) + sessionCounts[k];
    });

    setAgentUsageStats(mergedStats);
  }, [messages, projectId]);

  // ── Voice Actions ──────────────────────────────────────────────
  const toggleListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      toast.error("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      baseInputTextRef.current = inputValue;
      setIsVoice(true);

      rec.onstart = () => {
        setIsListening(true);
        toast.success("Listening... Speak now.");
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          toast.error("No speech detected. Try speaking again.");
        } else {
          toast.error(`Voice input issue: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const base = baseInputTextRef.current.trim();
        setInputValue(base ? `${base} ${transcript.trim()}` : transcript.trim());
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      toast.error("Failed to initialize microphone.");
      setIsListening(false);
    }
  };

  const handleSpeak = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Text-to-speech is not supported in this browser.");
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Strip markdown formatting for cleaner speech output
    const cleanText = text
      .replace(/[*#`_\-]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => {
      setSpeakingMessageId(null);
    };
    utterance.onerror = (e) => {
      console.error("Speech synthesis error:", e);
      setSpeakingMessageId(null);
    };

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => { if (!isAuthenticated) router.push("/auth/login"); }, [isAuthenticated, router]);
  
  useEffect(() => {
    const proj = projects.find((p: any) => p.id === projectId);
    if (proj) {
      setActiveProject(proj);
      setActiveSession(null);
    }
  }, [projectId, projects, setActiveProject, setActiveSession]);
  
  useEffect(() => {
    const sessionChanged = activeSession?.id !== lastSessionIdRef.current;
    const projectChanged = projectId !== lastProjectIdRef.current;

    if (sessionChanged || projectChanged) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      lastSessionIdRef.current = activeSession?.id || null;
      lastProjectIdRef.current = projectId || null;
      lastMessagesLengthRef.current = messages.length;
      justChangedSessionRef.current = true;
      return;
    }

    if (justChangedSessionRef.current) {
      justChangedSessionRef.current = false;
      lastMessagesLengthRef.current = messages.length;
      return;
    }

    const messagesAdded = messages.length > lastMessagesLengthRef.current;
    if (messagesAdded || isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    lastMessagesLengthRef.current = messages.length;
  }, [messages, isStreaming, activeSession?.id, projectId]);

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

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    if (speakingMessageId) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSpeakingMessageId(null);
    }

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
        setIsVoice(false);
      }
    } catch (err) {
      console.error("Failed to send chat message", err);
      toast.error("Unable to send message. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !projectId) return;

    const toastId = toast.loading(`Uploading ${file.name}...`);

    try {
      await uploadProjectFile(projectId, file);
      toast.success(`${file.name} uploaded and processed.`, { id: toastId });
    } catch (error: any) {
      console.error("File upload failed", error);
      toast.error(`Failed to upload ${file.name}: ${error.response?.data?.detail || "Unknown error"}`, { id: toastId });
    } finally {
      // Reset file input
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
    { id: "voice",        label: "Toggle Voice Mode",description: "Switch input to voice",      icon: "🎤",                      group: "Input",      action: toggleListening },
    { id: "export",       label: "Export Chat",      description: "Download as Markdown/PDF",   icon: "⬇️",                      group: "Actions",    action: () => {} },
    { id: "logout",       label: "Sign Out",         description: "Log out of workspace",       icon: "🚪",                      group: "Account",    action: () => { router.push("/auth/login"); } },
  ];

  return (
    <div className="h-screen w-screen flex bg-[#090b15] text-white overflow-hidden font-sans antialiased relative">
      
      {/* Background Gradients & Ambient Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/15 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/8 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] bg-indigo-600/8 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0 opacity-80" />

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />

      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Mobile backdrop to close sidebar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -230, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -230, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="absolute md:relative md:sticky top-0 left-0 w-[230px] flex-shrink-0 bg-[#0c0e18]/98 border-r border-white/[0.09] flex flex-col z-50 backdrop-blur-xl h-screen overflow-hidden"
            >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-white/[0.09] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg shadow-violet-500/15">✦</div>
                  <span className="text-[13.5px] font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">AI Command Center</span>
                </div>
              </div>
              
              <button onClick={handleNewSession}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-violet-600/10 border border-violet-500/25 text-violet-300 text-[12px] font-semibold hover:bg-violet-600/18 hover:border-violet-500/40 hover:scale-[0.98] active:scale-[0.95] transition-all">
                <span className="text-sm leading-none">+</span> New Chat
              </button>
              
              <button onClick={() => setCmdOpen(true)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] text-white/25 text-[11px] hover:border-white/[0.1] hover:text-white/40 hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-2">
                  <span>⌘</span>
                  <span className="text-left font-medium">Command palette</span>
                </div>
                <kbd className="text-[9px] bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded font-mono text-white/30">K</kbd>
              </button>
            </div>

            {/* Projects List */}
            <div className="px-3 pt-4 pb-1">
              <p className="text-[9.5px] font-bold text-white/20 uppercase tracking-widest px-2.5 mb-2">Projects</p>
              <div className="space-y-0.5 max-h-[160px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                {projects.map((p: any) => (
                  <button key={p.id} onClick={() => { router.push(`/workspace/${p.id}`); if (window.innerWidth < 768) setSidebarOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all hover:scale-[0.98]",
                      p.id === projectId 
                        ? "bg-violet-600/12 border border-violet-500/20 text-violet-200 font-semibold" 
                        : "text-white/40 border border-transparent hover:bg-white/[0.03] hover:text-white/70"
                    )}>
                    <span className="text-sm flex-shrink-0">{p.icon || "🧠"}</span>
                    <span className="text-[12px] truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chats List */}
            <div className="px-3 pt-4 pb-2 flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: "none" }}>
              <p className="text-[9.5px] font-bold text-white/20 uppercase tracking-widest px-2.5 mb-2">Recent Chats</p>
              <div className="space-y-0.5">
                {sessions.map((s: any) => (
                  <div key={s.id} className="group relative">
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
                        className="w-full px-2.5 py-1.5 bg-violet-600/10 border border-violet-500/30 rounded-lg text-[12px] text-white outline-none" />
                    ) : (
                      <button onClick={() => { setActiveSession(s); if (window.innerWidth < 768) setSidebarOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all border border-transparent pr-14 hover:scale-[0.98]",
                          s.id === activeSession?.id 
                            ? "bg-white/[0.06] border-white/[0.05] text-white/80 font-medium" 
                            : "text-white/35 hover:bg-white/[0.02] hover:text-white/60"
                        )}>
                        <span className="text-[10px] opacity-40 flex-shrink-0">{s.mode === "voice" ? "🎤" : "💬"}</span>
                        <span className="text-[12px] truncate flex-1">{s.title}</span>
                      </button>
                    )}
                    
                    {/* Rename/Delete Action Buttons */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
                      <button onClick={() => { setRenameId(s.id); setRenameVal(s.title); }}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-white/30 hover:text-white/70 hover:bg-white/10 transition-all" title="Rename">✏</button>
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
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">✕</button>
                    </div>
                  </div>
                ))}
                
                {sessions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                    <p className="text-[11px] text-white/15 leading-relaxed">No chats in this workspace.<br/>Click <strong className="text-white/35 font-medium">+ New Chat</strong>.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Profile & Settings (Bottom) */}
            <div className="p-3 border-t border-white/[0.09] relative bg-[#0e101b]">
              <button onClick={() => setProfileOpen(p => !p)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/[0.04] transition-all">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-[11px] font-bold flex-shrink-0 overflow-hidden ring-2 ring-white/10">
                  {user?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[12px] font-semibold text-white/70 truncate">{user?.name}</div>
                  <div className="text-[10px] text-white/35 truncate">{user?.email}</div>
                </div>
                <span className="text-white/20 text-[11px]">⚙</span>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    transition={{ duration: 0.15, type: "spring", stiffness: 350, damping: 25 }}
                    className="absolute bottom-16 left-3 w-[204px] bg-[#131627] border border-white/[0.12] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-2.5 z-50 backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/[0.06] mb-2 px-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-[11px] font-bold flex-shrink-0 overflow-hidden">
                        {user?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-bold text-white/80 truncate">{user?.name}</div>
                        <div className="text-[9.5px] text-white/30 truncate">{user?.email}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-0.5">
                      {[
                        { icon: "👤", label: "View Profile",     action: () => router.push("/profile") },
                        { icon: "🐙", label: "Connect GitHub",   action: () => {} },
                        { icon: "📧", label: "Connect Gmail",    action: () => {} },
                        { icon: "🧠", label: "View Memories",    action: () => { openRight("memory"); setProfileOpen(false); } },
                        { icon: "🚪", label: "Sign Out",         action: () => router.push("/auth/login") },
                      ].map(item => (
                        <button key={item.label} onClick={() => { item.action(); setProfileOpen(false); }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11.5px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all text-left">
                          <span className="w-4 text-center mr-1 text-[11px]">{item.icon}</span>{item.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Workspace Workspace Content */}
      <div className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden z-10 relative">

        {/* Workspace Top Bar Header */}
        <div className="h-14 border-b border-white/[0.08] flex items-center justify-between px-4 md:px-5 gap-3 bg-[#0c0e1a]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(p => !p)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-white/50 hover:text-white hover:bg-white/[0.05] transition-all text-[12px] flex-shrink-0 shadow-sm"
              title="Toggle sidebar">
              ☰
            </button>

            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-white/60 truncate">
              <span className="hover:text-white cursor-pointer transition-colors" onClick={() => router.push("/dashboard")}>Projects</span>
              <span className="text-white/20">/</span>
              <span className="text-white font-bold bg-white/[0.03] px-2 py-0.5 border border-white/[0.08] rounded-md truncate max-w-[140px] md:max-w-xs">{activeProject?.name || "Workspace"}</span>
              {activeSession && (
                <>
                  <span className="text-white/20">/</span>
                  <span className="text-violet-400 font-bold truncate max-w-[100px] md:max-w-[180px]">{activeSession.title}</span>
                </>
              )}
            </div>
          </div>

          {/* Real-time Agent Status Waveform Pulsers */}
          <div className="hidden xl:flex items-center gap-2">
            {AGENTS.slice(1).map(a => {
              const st = getAgentStatus(a.key);
              return (
                <div key={a.key} className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-semibold tracking-wide transition-all duration-300",
                  st === "thinking" 
                    ? "border-violet-500/40 bg-violet-500/10 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.15)] animate-pulse" 
                    : st === "done"     
                      ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-400" 
                      : "border-white/[0.05] bg-white/[0.01] text-white/25"
                )}>
                  {st === "thinking" ? (
                    <div className="flex items-center gap-0.5 w-2 h-2.5 mr-0.5">
                      <span className="w-[1.5px] h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-[1.5px] h-3 bg-violet-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                      <span className="w-[1.5px] h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0.5s]" />
                    </div>
                  ) : st === "done" ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  )}
                  <span>{a.icon} {a.label}</span>
                </div>
              );
            })}
          </div>

          {/* Utility buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ExportChat
              messages={messages}
              sessionTitle={activeSession?.title || "Chat"}
              projectName={activeProject?.name || "Project"}
            />
            
            <div className="h-6 w-[1px] bg-white/[0.08] mx-1 hidden sm:block" />

            <div className="flex items-center gap-1">
              {(["roadmap", "memory", "graph", "analytics"] as RightTab[]).map(tab => (
                <button key={tab} onClick={() => rightPanelOpen && rightTab === tab ? setRightPanelOpen(false) : openRight(tab)}
                  className={cn(
                    "p-2 rounded-lg border text-[11px] font-medium transition-all hover:scale-[0.98] active:scale-[0.95] flex items-center justify-center gap-1.5",
                    rightPanelOpen && rightTab === tab
                      ? "bg-violet-500/15 border-violet-500/30 text-violet-300 shadow-lg shadow-violet-500/5"
                      : "border-white/[0.06] bg-white/[0.01] text-white/35 hover:border-white/[0.15] hover:text-white/60"
                  )}>
                  <span>
                    {tab === "roadmap" ? "🗺️" : tab === "memory" ? "🧠" : tab === "graph" ? "🔀" : "📊"}
                  </span>
                  <span className="hidden md:inline capitalize">{tab}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Streaming pipeline overlay indicator */}
        <AnimatePresence>
          {agentEvents.length > 0 && isStreaming && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-white/[0.05] bg-black/30 backdrop-blur-md px-4 py-2 flex items-center gap-2 flex-wrap flex-shrink-0 z-10"
            >
              <span className="flex items-center gap-1.5 mr-2 flex-shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                </span>
                <span className="text-[10px] text-violet-400 font-bold uppercase tracking-widest">Orchestration Feed</span>
              </span>
              
              <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {agentEvents.slice(-4).map((ev, i) => (
                  <motion.div key={`${ev.agent}-${i}`}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap",
                      ev.status === "thinking" ? "text-violet-400 border-violet-500/35 bg-violet-500/8" :
                      ev.status === "done"     ? "text-emerald-400 border-emerald-500/25 bg-emerald-500/6" :
                                                 "text-red-400 border-red-500/20"
                    )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full",
                      ev.status === "thinking" ? "bg-violet-400 animate-pulse" :
                      ev.status === "done"     ? "bg-emerald-400" : "bg-red-400"
                    )} />
                    <span>{AGENTS.find(a => a.key === ev.agent)?.icon || "🤖"}</span>
                    <span className="text-white/60 capitalize font-medium">{ev.agent}:</span>
                    <span>{ev.message}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Message Window Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-44 space-y-6"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>

              {!activeSession ? (
                <ProjectDashboard
                  projectId={projectId}
                  activeProject={activeProject}
                  sessions={sessions}
                  onSelectSession={setActiveSession}
                  onNewChat={handleNewSession}
                  agentUsageStats={agentUsageStats}
                  activeRoadmap={activeRoadmap}
                />
              ) : (
                <div className="max-w-4xl mx-auto w-full space-y-6">
                  
                  {messages.length === 0 && !isStreaming && (
                    <div className="flex flex-col items-center justify-center text-center gap-5 py-20 px-4">
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 flex items-center justify-center text-3xl shadow-xl shadow-black/30">✦</motion.div>
                      
                      <div className="space-y-2">
                        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                          className="text-2xl font-bold tracking-tight text-white/80">Command your AI Agent Team</motion.h2>
                        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                          className="text-[13px] text-white/30 max-w-sm mx-auto leading-relaxed">
                          Your collaborative network of 6 specialized agents is ready to research, code, criticize, and draft.
                        </motion.p>
                      </div>

                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full max-w-lg mt-4">
                        {[
                          "Build an AI crop monitoring drone roadmap",
                          "Design a RAG system architecture template",
                          "Create a secure SaaS JWT authentication structure",
                          "Plan a deployment pipeline in GitHub Actions",
                        ].map(s => (
                          <button key={s} onClick={() => setInputValue(s)}
                            className="px-4 py-3 bg-[#0a0b12]/60 hover:bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/25 rounded-xl text-[12px] text-white/45 hover:text-violet-200 transition-all text-left leading-relaxed shadow-sm hover:translate-y-[-1px]">
                            <span className="text-violet-400 mr-1.5">✦</span> {s}
                          </button>
                        ))}
                      </motion.div>
                      
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                        className="text-[10px] text-white/15">
                        Tip: Open command utility overlay with <kbd className="bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded text-[9px] font-mono mx-1">⌘K</kbd>
                      </motion.p>
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <motion.div key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={cn("flex gap-4 md:gap-5 items-start", msg.role === "user" ? "flex-row-reverse" : "")}>

                      {/* Avatar */}
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 shadow-lg border",
                        msg.role === "user"
                          ? "bg-gradient-to-br from-violet-500 to-pink-500 border-violet-400/20"
                          : "bg-[#0f111c] border-white/[0.06] text-violet-400"
                      )}>
                        {msg.role === "user" ? initials : "✦"}
                      </div>

                      {/* Message Content Bubble */}
                      <div className={cn("max-w-[85%] flex flex-col gap-2.5", msg.role === "user" ? "items-end" : "items-start")}>
                        
                        {(msg as any).input_mode === "voice" && (
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/8 border border-emerald-500/15 rounded-full">
                            <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                            🎤 Voice input
                          </span>
                        )}

            <div className={cn(
              "px-5 py-4 text-[13.5px] leading-relaxed shadow-xl transition-all duration-300",
              msg.role === "user"
                ? "bg-gradient-to-r from-violet-600/15 to-indigo-600/15 border border-violet-500/30 rounded-2xl rounded-tr-sm text-white font-medium"
                : "bg-[#131627]/60 border border-white/[0.09] rounded-2xl rounded-tl-sm text-white/95 backdrop-blur-md hover:border-violet-500/20"
            )}>
              {msg.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                  code: ({ className, children, ...props }: any) => {
                    const inline = !className;
                    const match = /language-(\w+)/.exec(className || "");
                    const lang = match ? match[1] : "";
                    const codeContent = String(children).replace(/\n$/, "");
                    
                    return inline
                      ? <code className="bg-white/10 px-1.5 py-0.5 rounded text-violet-300 text-[12px] font-mono" {...props}>{children}</code>
                      : <CodeBlock code={codeContent} language={lang} />;
                  },
                  h1: ({ children }: any) => <h1 className="text-[17px] font-extrabold text-white mt-4 mb-2 pb-1 border-b border-white/10">{children}</h1>,
                  h2: ({ children }: any) => <h2 className="text-[15px] font-bold text-violet-200 mt-4 mb-2 flex items-center gap-2">{children}</h2>,
                  h3: ({ children }: any) => <h3 className="text-[13.5px] font-bold text-white mt-3 mb-1">{children}</h3>,
                  p:  ({ children }: any) => <p className="text-[13px] text-slate-100/90 leading-relaxed mb-3 font-normal">{children}</p>,
                  ul: ({ children }: any) => <ul className="space-y-1.5 my-2 pl-5 list-disc text-slate-200/90">{children}</ul>,
                  ol: ({ children }: any) => <ol className="space-y-1.5 my-2 pl-5 list-decimal text-slate-200/90">{children}</ol>,
                  li: ({ children }: any) => <li className="text-[12.5px] text-slate-100/95">{children}</li>,
                  table: ({ children }: any) => <div className="overflow-x-auto my-3 border border-white/10 rounded-xl"><table className="w-full text-[12px] border-collapse bg-white/[0.02]">{children}</table></div>,
                  th: ({ children }: any) => <th className="border-b border-white/15 px-3 py-2 text-white font-semibold bg-white/[0.04] text-left">{children}</th>,
                  td: ({ children }: any) => <td className="border-b border-white/[0.08] px-3 py-2 text-slate-200/90">{children}</td>,
                  blockquote: ({ children }: any) => <blockquote className="border-l-3 border-violet-500 bg-violet-500/8 px-4 py-2 my-3 rounded-r-lg text-slate-200/90 italic leading-relaxed">{children}</blockquote>,
                  strong: ({ children }: any) => <strong className="font-bold text-white">{children}</strong>,
                }}>
                              {msg.content || "⏳"}
                            </ReactMarkdown>
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>

                        {/* Text to Speech controller panel */}
                        {msg.role === "assistant" && msg.content && (
                          <div className="flex items-center gap-2 px-1">
                            <button
                              onClick={() => handleSpeak(msg.id, msg.content)}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border transition-all hover:scale-[0.98]",
                                speakingMessageId === msg.id
                                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300 animate-pulse shadow-md shadow-violet-500/10"
                                  : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white/70"
                              )}
                              title={speakingMessageId === msg.id ? "Stop voice synthesis" : "Read response aloud"}
                            >
                              {speakingMessageId === msg.id ? (
                                <>
                                  <span className="flex items-center gap-0.5 h-2">
                                    <span className="w-[1.5px] h-2 bg-violet-300 rounded animate-bounce [animation-delay:0.1s]" />
                                    <span className="w-[1.5px] h-3 bg-violet-300 rounded animate-bounce [animation-delay:0.3s]" />
                                    <span className="w-[1.5px] h-1.5 bg-violet-300 rounded animate-bounce [animation-delay:0.5s]" />
                                  </span>
                                  <span>Speaking... (Click to stop)</span>
                                </>
                              ) : (
                                <>
                                  <span>🔊</span>
                                  <span>Read Aloud</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Modular Agent Outputs Accordions */}
                        {msg.agent_outputs && Object.keys(msg.agent_outputs).length > 0 && (
                          <div className="w-full space-y-1.5 mt-1.5">
                            {Object.entries(msg.agent_outputs).map(([agent, output]) => {
                              const cfg      = AGENTS.find(a => a.key === agent);
                              const key      = `${msg.id}-${agent}`;
                              const isOpen   = expandedAgents.has(key);
                              return (
                                <div key={agent} className="bg-[#0b0c13]/70 border border-white/[0.05] rounded-xl overflow-hidden shadow-sm">
                                  <button onClick={() => setExpandedAgents(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-white/[0.02] transition-all text-left">
                                    <span className="text-[12px]">{cfg?.icon || "🤖"}</span>
                                    <span className="text-[11.5px] font-bold" style={{ color: cfg?.color || "#a5b4fc" }}>
                                      {cfg?.label || agent} Agent Logs
                                    </span>
                                    <span className="ml-auto text-[10px] text-white/20 font-medium">{isOpen ? "Hide ▴" : "Show ▾"}</span>
                                  </button>
                                  
                                  <AnimatePresence>
                                    {isOpen && (
                                      <motion.div 
                                        initial={{ height: 0 }} 
                                        animate={{ height: "auto" }} 
                                        exit={{ height: 0 }} 
                                        className="overflow-hidden bg-black/10 border-t border-white/[0.04]"
                                      >
                                        <div className="px-4 py-3 leading-relaxed text-[11.5px]">
                                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                            p:  ({ children }: any) => <p className="text-white/50 mb-2 leading-relaxed">{children}</p>,
                                            li: ({ children }: any) => <li className="text-white/50 list-disc ml-4 mb-1">{children}</li>,
                                            code: ({ children }: any) => <code className="text-[11px] font-mono text-violet-300 bg-white/5 px-1 py-0.5 rounded border border-white/5">{children}</code>,
                                            strong: ({ children }: any) => <strong className="font-semibold text-white/70">{children}</strong>,
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

                  {/* Realtime thinking pipeline checklist animation */}
                  {isStreaming && (
                    <div className="flex gap-4 md:gap-5 mt-4">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1 border border-indigo-400/20 shadow-md">✦</div>
                      <div className="flex-1 max-w-sm">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-[#0b0c13]/90 border border-violet-500/20 rounded-2xl p-4 backdrop-blur-md shadow-2xl relative overflow-hidden"
                        >
                          <div className="absolute -top-12 -right-12 w-28 h-28 bg-violet-500/10 rounded-full filter blur-xl animate-pulse" />
                          
                          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Agent Activity Pipeline</span>
                            </div>
                            <span className="text-[9px] text-white/30 font-mono">Running...</span>
                          </div>

                          <div className="space-y-2.5">
                            {AGENTS.map(agent => {
                              const status = getAgentStatus(agent.key);
                              const latestEvent = agentEvents.filter(e => e.agent === agent.key).slice(-1)[0];
                              
                              let statusLabel = `${agent.label} Agent Working...`;
                              if (status === "idle") {
                                statusLabel = `${agent.label} Agent Idle`;
                              } else if (status === "error") {
                                statusLabel = `${agent.label} Agent Failure`;
                              }

                              return (
                                <div key={agent.key} className="flex items-center justify-between text-[11.5px]">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-xs flex-shrink-0">{agent.icon}</span>
                                    <div className="min-w-0 flex-1">
                                      <span className={cn(
                                        "font-medium transition-colors duration-300",
                                        status === "thinking" ? "text-white font-semibold" :
                                        status === "done" ? "text-white/50" : "text-white/20"
                                      )}>
                                        {statusLabel}
                                      </span>
                                      {status === "thinking" && latestEvent?.message && (
                                        <span className="text-[9.5px] text-violet-400/80 animate-pulse ml-1.5 font-normal truncate inline-block">
                                          — {latestEvent.message}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-center flex-shrink-0 ml-3">
                                    {status === "thinking" ? (
                                      <div className="w-3.5 h-3.5 rounded-full border border-violet-500/25 border-t-violet-400 animate-spin" />
                                    ) : status === "done" ? (
                                      <span className="text-emerald-400 font-bold text-[12px]">✓</span>
                                    ) : status === "error" ? (
                                      <span className="text-red-400 font-bold">✕</span>
                                    ) : (
                                      <span className="w-1.5 h-1.5 rounded-full bg-white/5" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Command Prompt Input Panel */}
            <div className={cn(
              "fixed bottom-0 bg-gradient-to-b from-[#131628]/95 to-[#0e101d]/98 backdrop-blur-xl border-t border-white/[0.12] py-4 px-4 md:px-8 z-10 transition-all duration-300",
              sidebarOpen ? "left-[230px]" : "left-0",
              rightPanelOpen ? "right-[330px]" : "right-0"
            )}>
              <div className="max-w-4xl mx-auto w-full flex flex-col gap-3">
                
                <div className="relative group/input">
                  {/* Animated ambient glow ring around the input block */}
                  <div className="absolute -inset-px bg-gradient-to-r from-violet-500/30 to-indigo-500/30 rounded-2xl blur-[3px] opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  {/* Glass Card Input Box Container */}
                  <div className="relative flex items-end gap-3 bg-[#0d0e16]/60 border border-white/[0.08] focus-within:border-violet-500/40 rounded-2xl p-3.5 backdrop-blur-md transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.3)] focus-within:shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    
                    <textarea ref={inputRef} value={inputValue}
                      onChange={e => { setInputValue(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                      onKeyDown={handleKeyDown}
                      placeholder={isListening ? "Listening... Speak now!" : !activeSession ? "Type a prompt to start a new chat in this project..." : "Command the agent team..."}
                      rows={1} disabled={isStreaming}
                      className="flex-1 bg-transparent outline-none text-[13px] text-white/90 placeholder-white/35 leading-relaxed resize-none min-h-[22px] max-h-[120px]"
                    />
                    
                    {/* Action button layout */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 pb-0.5">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all border border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15]"
                        title="Upload file (CSV, TXT, PDF, etc.)"
                      >
                        📎
                      </button>
                      
                      <button onClick={toggleListening}
                        className={cn("relative w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all border",
                          isListening ? "bg-red-500/15 border-red-500/35 text-red-400 shadow-md shadow-red-500/10" :
                          isVoice ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400" :
                          "border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15]"
                        )} title={isListening ? "Stop voice listening" : "Enable microphone input"}>
                        {isListening ? (
                          <>
                            <span className="absolute inset-0 rounded-xl bg-red-500/20 animate-ping" />
                            <span className="z-10 animate-pulse text-[11px]">⏹️</span>
                          </>
                        ) : (
                          "🎤"
                        )}
                      </button>
                      
                      <button onClick={handleSend} disabled={isStreaming || !inputValue.trim()}
                        className="w-8 h-8 rounded-xl bg-violet-600 border border-violet-500 text-white flex items-center justify-center text-sm hover:bg-violet-500 hover:scale-[1.03] transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:scale-100 font-bold shadow-lg shadow-violet-500/15">
                        ↑
                      </button>
                    </div>
                  </div>
                </div>

                {/* Swarm Details and commands description */}
                <div className="flex items-center justify-between mt-1 px-2 text-[10px] text-white/35">
                  <span className="flex items-center gap-1.5">
                    <span>⚡ Multi-Agent Swarm</span>
                    <span>·</span>
                    <span>📁 RAG Context Embeddings</span>
                    <span>·</span>
                    <span>💬 SSE Streaming</span>
                  </span>
                  <span className="font-mono">⌘K Commands Panel</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel Utility Panels Drawer */}
          <AnimatePresence>
            {rightPanelOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 330, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 35 }}
                className="border-l border-white/[0.06] flex flex-col bg-[#08090f]/95 overflow-hidden flex-shrink-0 z-20 backdrop-blur-xl min-h-screen"
              >
                {/* Header Switch Tabs */}
                <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
                  <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {(["roadmap", "memory", "graph", "analytics"] as RightTab[]).map(tab => (
                      <button key={tab} onClick={() => setRightTab(tab)}
                        className={cn("px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all capitalize whitespace-nowrap",
                          rightTab === tab 
                            ? "bg-violet-500/12 text-violet-300 border border-violet-500/20 shadow-sm" 
                            : "text-white/25 hover:text-white/55 border border-transparent"
                        )}>
                        {tab === "roadmap" ? "🗺️ Roadmap" : tab === "memory" ? "🧠 Memory" : tab === "graph" ? "🔀 Graph" : "📊 Stats"}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setRightPanelOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-all text-[11px] border border-transparent hover:border-white/[0.05]">✕</button>
                </div>

                {/* Tab content bodies */}
                <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>

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
                      <div className="text-center py-16 px-4">
                        <div className="text-4xl mb-4">🗺️</div>
                        <h4 className="text-[13px] font-bold text-white/70 mb-1.5">No active roadmap</h4>
                        <p className="text-[11px] text-white/25 leading-relaxed mb-4">Ask the agents to structure your timeline tasks, or generate one instantly below.</p>
                        <Button onClick={handleGenerateRoadmap} disabled={isGeneratingRoadmap} className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-md">
                          {isGeneratingRoadmap ? "Compiling Roadmap..." : "Generate Checklist Roadmap"}
                        </Button>
                      </div>
                    )
                  )}

                  {rightTab === "memory" && (
                    <MemoryPanel searchQuery={lastQuery || undefined} />
                  )}

                  {rightTab === "graph" && (
                    <div className="space-y-4">
                      <div className="border-b border-white/[0.05] pb-3">
                        <h4 className="text-[12.5px] font-bold text-white/70">🔀 Agent Coordination Network</h4>
                        <p className="text-[10.5px] text-white/25 leading-relaxed mt-1">Live data packet visual routing stream.</p>
                      </div>
                      <AgentOrchestrationGraph agents={agentNodes} isActive={isStreaming} />
                      {!isStreaming && agentEvents.length === 0 && (
                        <div className="text-center text-[11px] text-white/20 py-6 border border-white/[0.05] bg-white/[0.01] rounded-xl font-medium">
                          Pipeline waiting for message input...
                        </div>
                      )}
                    </div>
                  )}

                  {rightTab === "analytics" && (
                    <div className="space-y-5">
                      <div className="border-b border-white/[0.05] pb-3">
                        <h4 className="text-[12.5px] font-bold text-white/70">📊 Swarm Usage Analytics</h4>
                        <p className="text-[10.5px] text-white/25 leading-relaxed mt-1">
                          Invocation counts and resource breakdown per agent.
                        </p>
                      </div>

                      <div className="space-y-4">
                        {AGENTS.map(agent => {
                          const calls = agentUsageStats[agent.key] || 0;
                          const totalCalls = Object.values(agentUsageStats).reduce((a, b) => a + b, 0);
                          const percent = totalCalls > 0 ? (calls / totalCalls) * 100 : 0;

                          return (
                            <div key={agent.key} className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">{agent.icon}</span>
                                  <span className="font-semibold text-white/60">{agent.label} Agent</span>
                                </div>
                                <span className="font-mono text-violet-300 font-bold bg-violet-500/10 px-2 py-0.5 border border-violet-500/10 rounded">
                                  {calls} {calls === 1 ? 'call' : 'calls'}
                                </span>
                              </div>
                              
                              <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.04]">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percent}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: agent.color }}
                                />
                              </div>
                              
                              <div className="flex justify-between text-[9px] text-white/20">
                                <span>Allocation: {percent.toFixed(1)}%</span>
                                <span>System Online</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-[#0b0c13]/55 border border-white/[0.05] rounded-xl p-3.5 space-y-2 mt-2">
                        <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-white/40 border-b border-white/[0.04] pb-1.5 mb-1.5">
                          <span>⚙️</span>
                          <span>Lifetime Run Profile</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div className="bg-white/[0.01] p-2.5 rounded border border-white/[0.04]">
                            <p className="text-white/20">Total Invokes</p>
                            <p className="text-[15px] font-bold text-white/80 mt-0.5">
                              {Object.values(agentUsageStats).reduce((a, b) => a + b, 0)}
                            </p>
                          </div>
                          <div className="bg-white/[0.01] p-2.5 rounded border border-white/[0.04]">
                            <p className="text-white/20">Active Driver</p>
                            <p className="text-[12.5px] font-bold text-emerald-400 mt-1 truncate">
                              {(() => {
                                let maxCalls = -1;
                                let activeAgent = "None";
                                AGENTS.forEach(a => {
                                  const calls = agentUsageStats[a.key] || 0;
                                  if (calls > maxCalls) {
                                    maxCalls = calls;
                                    activeAgent = a.label;
                                  }
                                });
                                return activeAgent;
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          if (confirm("Reset lifetime baseline counts?")) {
                            const resetVal = { qa: 0, research: 0, engineering: 0, planner: 0, critic: 0, innovation: 0 };
                            localStorage.setItem(`agent_usage_baseline_${projectId}`, JSON.stringify(resetVal));
                            setAgentUsageStats(resetVal);
                            toast.success("Usage counters reset.");
                          }
                        }}
                        className="w-full text-center text-[10.5px] py-2 rounded-xl bg-red-500/10 border border-red-500/15 text-red-400 hover:bg-red-500/20 transition-all font-semibold mt-4"
                      >
                        Reset Swarm Baselines
                      </button>
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
