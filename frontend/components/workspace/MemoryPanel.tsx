"use client";
// ============================================================
// components/workspace/MemoryPanel.tsx
// Phase 4 — Shows user's persistent semantic memories
// Fetched from pgvector via /api/users/me/memories
// ============================================================

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/services/api";
import { cn } from "@/lib/utils";

interface Memory {
  id: string;
  content: string;
  memory_type: "session_summary" | "voice_summary" | "preference" | "project_context";
  metadata?: Record<string, any>;
  created_at: string;
}

interface MemoryPanelProps {
  searchQuery?: string;   // semantic search on the current message
}

const TYPE_STYLES: Record<string, { icon: string; color: string; label: string }> = {
  session_summary:  { icon: "💬", color: "text-violet-400", label: "Session" },
  voice_summary:    { icon: "🎤", color: "text-emerald-400", label: "Voice" },
  preference:       { icon: "⚙️", color: "text-amber-400",   label: "Preference" },
  project_context:  { icon: "📁", color: "text-cyan-400",    label: "Project" },
};

export function MemoryPanel({ searchQuery }: MemoryPanelProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading]   = useState(false);
  const [filter, setFilter]     = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchMemories = async (query?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "20" };
      if (query) params.query = query;
      if (filter !== "all") params.memory_type = filter;
      const r = await api.get("/api/users/me/memories", { params });
      setMemories(r.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMemories(searchQuery); }, [searchQuery, filter]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const deleteMemory = async (id: string) => {
    try {
      await api.delete(`/api/users/me/memories/${id}`);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {["all", "session_summary", "voice_summary", "preference"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10.5px] font-medium transition-all border",
              filter === f
                ? "bg-violet-500/15 border-violet-500/30 text-violet-300"
                : "border-white/[0.07] text-white/30 hover:text-white/55 hover:border-white/15"
            )}>
            {f === "all" ? "All" : TYPE_STYLES[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Search indicator */}
      {searchQuery && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-violet-500/8 border border-violet-500/20 rounded-lg">
          <span className="text-[10px] text-violet-400">🔍 Semantic search: "{searchQuery.slice(0, 30)}"</span>
        </div>
      )}

      {/* Memory list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-12 text-white/20">
          <div className="text-3xl mb-3">🧠</div>
          <div className="text-[12px]">No memories yet.</div>
          <div className="text-[11px] mt-1">Start chatting — summaries appear here after each session.</div>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {memories.map((mem, i) => {
              const cfg    = TYPE_STYLES[mem.memory_type] || { icon: "🧠", color: "text-white/50", label: "Memory" };
              const isOpen = expanded.has(mem.id);
              return (
                <motion.div
                  key={mem.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-[#0a0b12] border border-white/[0.06] rounded-xl overflow-hidden group"
                >
                  <button
                    onClick={() => toggleExpand(mem.id)}
                    className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-white/[0.03] transition-all"
                  >
                    <span className="text-[13px] mt-0.5 flex-shrink-0">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn("text-[9.5px] font-semibold uppercase tracking-wider", cfg.color)}>{cfg.label}</span>
                        <span className="text-[9px] text-white/20">
                          {new Date(mem.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={cn(
                        "text-[11.5px] text-white/55 leading-relaxed",
                        isOpen ? "" : "line-clamp-2"
                      )}>
                        {mem.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); deleteMemory(mem.id); }}
                        className="w-5 h-5 rounded flex items-center justify-center text-[9px] text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete memory"
                      >✕</button>
                      <span className="text-[9px] text-white/20">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && mem.metadata && Object.keys(mem.metadata).length > 0 && (
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 border-t border-white/[0.05]">
                          <div className="mt-2 text-[10px] text-white/25 font-mono">
                            {JSON.stringify(mem.metadata, null, 2)}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {memories.length > 0 && (
        <div className="text-center text-[10px] text-white/20 pt-1">
          {memories.length} memories stored · pgvector semantic search
        </div>
      )}
    </div>
  );
}
