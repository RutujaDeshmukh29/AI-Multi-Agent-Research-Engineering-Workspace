"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const AGENTS = [
  { key: "research",    label: "Research Agent",    icon: "🔍", color: "bg-emerald-500", desc: "Web retrieval crawler & document indexer", status: "Ready" },
  { key: "planner",     label: "Planner Agent",     icon: "🗺️", color: "bg-purple-500", desc: "Roadmap checklist scheduler & tracker", status: "Ready" },
  { key: "engineering", label: "Engineering Agent", icon: "⚙️", color: "bg-amber-500",  desc: "Code builder & code quality reviewer", status: "Ready" },
  { key: "critic",      label: "Critic Agent",      icon: "🎯", color: "bg-red-500",    desc: "Vulnerability analysis & edge Auditor", status: "Ready" },
  { key: "innovation",  label: "Innovation Agent",  icon: "💡", color: "bg-cyan-500",   desc: "Alternative stack configurations design", status: "Ready" },
  { key: "qa",          label: "QA Agent",          icon: "🧠", color: "bg-indigo-500", desc: "Interactive interview checklist parser", status: "Ready" },
];

export function AgentStatus() {
  return (
    <div className="glass-card rounded-3xl p-5 border border-white/[0.06] space-y-4 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
        <span className="text-[9.5px] font-bold uppercase tracking-widest text-white/30">AI Agent Status</span>
        <span className="text-[9px] text-white/20">6 agents active</span>
      </div>

      <div className="space-y-3">
        {AGENTS.map((agent) => (
          <div key={agent.key} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.02] transition-colors group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-sm flex-shrink-0">
                {agent.icon}
              </div>
              <div className="min-w-0">
                <span className="text-[11.5px] font-bold text-white/85 block">{agent.label}</span>
                <span className="text-[9.5px] text-white/30 block truncate max-w-[200px] sm:max-w-none">{agent.desc}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">{agent.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
