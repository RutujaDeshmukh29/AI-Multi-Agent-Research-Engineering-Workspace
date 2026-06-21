"use client";

import { motion } from "framer-motion";

interface DashboardHeroProps {
  userName: string;
  onNewProject: () => void;
  onViewActivity: () => void;
}

const AGENTS = [
  { name: "Research", icon: "🔍", color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5 glow-research" },
  { name: "Engineering", icon: "⚙️", color: "border-amber-500/30 text-amber-400 bg-amber-500/5 glow-engineering" },
  { name: "Planner", icon: "🗺️", color: "border-purple-500/30 text-purple-400 bg-purple-500/5 glow-planner" },
  { name: "Critic", icon: "🎯", color: "border-red-500/30 text-red-400 bg-red-500/5 glow-critic" },
  { name: "Innovation", icon: "💡", color: "border-cyan-500/30 text-cyan-400 bg-cyan-500/5 glow-innovation" },
  { name: "QA", icon: "🧠", color: "border-indigo-500/30 text-indigo-400 bg-indigo-500/5 glow-qa" },
];

export function DashboardHero({ userName, onNewProject, onViewActivity }: DashboardHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent p-6 md:p-8 backdrop-blur-md shadow-2xl"
    >
      {/* Visual background decorations */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-44 h-44 bg-violet-600/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-600/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-3.5">
          <motion.h1 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl md:text-3xl font-black tracking-tight"
          >
            👋 Welcome back, <span className="gradient-text font-extrabold">{userName || "Developer"}</span>
          </motion.h1>
          
          <p className="text-[13px] text-white/45 max-w-xl leading-relaxed">
            Build, research and plan with your orchestrator AI Agent Team. Orchestrate workflows, track milestones checklists, and review repository structures in real-time.
          </p>

          {/* Glowing Agent status pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold mr-1 flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              6 Agents Ready:
            </span>
            {AGENTS.map((agent) => (
              <div
                key={agent.name}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-semibold transition-all ${agent.color}`}
              >
                <span>{agent.icon}</span>
                <span>{agent.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex sm:flex-row flex-col gap-3.5 flex-shrink-0">
          <button
            onClick={onNewProject}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-semibold hover:shadow-lg hover:shadow-violet-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            ➕ Create Project
          </button>
          <button
            onClick={onViewActivity}
            className="px-5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.18] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 text-white/80 hover:text-white"
          >
            ⚡ View Activity Feed
          </button>
        </div>
      </div>
    </motion.div>
  );
}
