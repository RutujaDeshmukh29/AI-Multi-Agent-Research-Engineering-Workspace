"use client";
// ========================
// components/agents/AgentActivityFeed.tsx
// CONCEPT: Perceived Intelligence
// Shows users exactly what each agent is doing in real-time.
// This is the most important UX feature — it makes the AI
// feel ALIVE and orchestrated, not just a black box.
// ========================

import { motion, AnimatePresence } from "framer-motion";
import { AGENT_CONFIG, type AgentType } from "@/lib/utils";

export type AgentEvent = {
  agent: AgentType | "qa";
  status: "idle" | "thinking" | "done" | "error";
  message: string;
  timestamp?: number;
};

interface AgentActivityFeedProps {
  events: AgentEvent[];
  isActive: boolean;
}

const STATUS_COLORS = {
  idle:     "text-white/20 border-white/10",
  thinking: "text-violet-400 border-violet-500/40 bg-violet-500/8",
  done:     "text-emerald-400 border-emerald-500/30 bg-emerald-500/6",
  error:    "text-red-400 border-red-500/30 bg-red-500/6",
};

const STATUS_DOT = {
  idle:     "bg-white/15",
  thinking: "bg-violet-400",
  done:     "bg-emerald-400",
  error:    "bg-red-400",
};

const AGENT_ICONS: Record<string, string> = {
  qa: "🧠", research: "🔍", engineering: "⚙️",
  innovation: "💡", critic: "🎯", planner: "🗺️",
};

export function AgentActivityFeed({ events, isActive }: AgentActivityFeedProps) {
  if (!isActive && events.length === 0) return null;

  // Deduplicate — show latest status per agent
  const latestByAgent = events.reduce((acc, ev) => {
    acc[ev.agent] = ev;
    return acc;
  }, {} as Record<string, AgentEvent>);

  const activeAgents = Object.values(latestByAgent);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="border-b border-white/5 bg-black/20"
    >
      <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap">
        {/* Live indicator */}
        {isActive && (
          <div className="flex items-center gap-1.5 mr-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
            </span>
            <span className="text-[10px] text-violet-400/80 font-medium tracking-wide uppercase">
              Agents active
            </span>
          </div>
        )}

        <AnimatePresence>
          {activeAgents.map((event) => (
            <motion.div
              key={event.agent}
              initial={{ opacity: 0, scale: 0.85, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${STATUS_COLORS[event.status]}`}
            >
              {/* Animated status dot */}
              <span className="relative flex h-1.5 w-1.5">
                {event.status === "thinking" && (
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${STATUS_DOT[event.status]}`} />
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${STATUS_DOT[event.status]}`} />
              </span>

              <span>{AGENT_ICONS[event.agent] || "🤖"}</span>
              <span>{event.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Latest activity log line */}
      {events.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={events[events.length - 1]?.message}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-2 text-[11px] text-white/25 font-mono truncate"
          >
            › {events[events.length - 1]?.message}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
