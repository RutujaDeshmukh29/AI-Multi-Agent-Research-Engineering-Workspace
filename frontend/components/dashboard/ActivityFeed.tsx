"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "roadmap" | "research" | "project" | "memory" | "voice";
  message: string;
  time: string;
  success: boolean;
}

const ACTIVITIES: Activity[] = [
  { id: "1", type: "roadmap", message: "Roadmap Checklist Generated", time: "25 min ago", success: true },
  { id: "2", type: "research", message: "Research Agent crawlers indexed", time: "1 hour ago", success: true },
  { id: "3", type: "memory", message: "User profile preferences synced", time: "2 hours ago", success: true },
  { id: "4", type: "project", message: "GitHub Integration established", time: "4 hours ago", success: true },
  { id: "5", type: "voice", message: "Voice Session audio transcribed", time: "1 day ago", success: true },
  { id: "6", type: "memory", message: "Memory database key parsed", time: "2 days ago", success: true },
];

export function ActivityFeed() {
  return (
    <div className="glass-card rounded-3xl p-5 border border-white/[0.06] space-y-4 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
        <span className="text-[9.5px] font-bold uppercase tracking-widest text-white/30">Recent Activity Feed</span>
        <span className="text-[9px] text-white/20">Live Sync</span>
      </div>

      <div className="space-y-4 relative pl-4 border-l border-white/[0.05] ml-2.5 mt-2">
        {ACTIVITIES.map((act, idx) => {
          let dotColor = "bg-violet-500 border-violet-400";
          if (act.type === "research") dotColor = "bg-emerald-500 border-emerald-400";
          if (act.type === "project") dotColor = "bg-blue-500 border-blue-400";
          if (act.type === "memory") dotColor = "bg-pink-500 border-pink-400";
          if (act.type === "voice") dotColor = "bg-amber-500 border-amber-400";

          return (
            <motion.div
              key={act.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="relative space-y-1"
            >
              {/* Timeline circle dot */}
              <div className={`absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full border ${dotColor}`} />
              
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[11.5px] font-bold text-white/80">{act.message}</span>
                <span className="text-[9px] text-white/25 flex-shrink-0 font-mono">{act.time}</span>
              </div>
              <p className="text-[9.5px] text-white/30">
                {act.type === "roadmap" ? "Roadmap generated successfully using Groq LLM." :
                 act.type === "research" ? "QA Research nodes completed web search indices scan." :
                 act.type === "project" ? "Synced repository branches list with database store." :
                 act.type === "voice" ? "STT module parsed 32s voice prompt audio waveform." :
                 "Memory vector index update finished successfully."}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
