"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: any;
  onClick: () => void;
  index: number;
}

export function ProjectCard({ project, onClick, index }: ProjectCardProps) {
  // Deduce or simulate realistic dashboard numbers based on project id seed
  const charSum = project.id ? project.id.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) : 100;
  
  // Tasks Count
  const totalTasks = (charSum % 8) + 10; // e.g. 10 to 18 tasks
  const completedTasks = charSum % 2 === 0 ? Math.round(totalTasks * 0.7) : Math.round(totalTasks * 0.4);
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Messages count
  const messageCount = (charSum % 150) + 40; // e.g. 40 to 190 messages

  // Status
  let status = "Active";
  let statusColor = "bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse";
  if (progressPercent === 100) {
    status = "Completed";
    statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  } else if (charSum % 7 === 0) {
    status = "Paused";
    statusColor = "bg-white/5 text-white/35 border-white/10";
  }

  // Last Updated
  const hoursAgo = charSum % 12;
  const lastUpdated = hoursAgo === 0 ? "Just now" : hoursAgo === 1 ? "1 hour ago" : `${hoursAgo} hours ago`;

  // Agents used pills
  const agents = [
    { label: "Research", bg: "bg-emerald-500/5 text-emerald-400 border-emerald-500/15" },
    { label: "Engineering", bg: "bg-amber-500/5 text-amber-400 border-amber-500/15" },
    { label: "Planner", bg: "bg-purple-500/5 text-purple-400 border-purple-500/15" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -5, scale: 1.015 }}
      onClick={onClick}
      className="glass-card card-glow rounded-3xl p-5 border border-white/[0.06] flex flex-col justify-between cursor-pointer transition-all duration-300 relative group"
    >
      {/* Top row with project name and status badge */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2.5xl flex-shrink-0">{project.icon || "🧠"}</span>
            <div className="min-w-0">
              <h3 className="text-[13.5px] font-bold text-white/95 group-hover:text-white transition-colors truncate">
                {project.name}
              </h3>
              <p className="text-[10px] text-white/20 font-mono mt-0.5">{lastUpdated}</p>
            </div>
          </div>
          
          <span className={cn("px-2 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider border", statusColor)}>
            {status}
          </span>
        </div>

        {/* Project description */}
        <p className="text-[11.5px] text-white/40 mt-3 line-clamp-2 leading-relaxed h-[34px]">
          {project.description || "Collaborative multi-agent architecture workspace."}
        </p>
      </div>

      {/* Progress & Stats Area */}
      <div className="mt-5 space-y-4">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[9px] uppercase tracking-wider font-bold">
            <span className="text-white/25">Roadmap Checklist</span>
            <span className="text-white/60 font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Message and task counts */}
        <div className="grid grid-cols-2 gap-2 border-y border-white/[0.04] py-3">
          <div className="text-center md:text-left">
            <span className="block text-[8px] uppercase tracking-wider font-bold text-white/25">Prompts Count</span>
            <span className="text-[11px] font-bold text-white/80 font-mono mt-0.5 block">{messageCount} Messages</span>
          </div>
          <div className="text-center md:text-left border-l border-white/[0.04] pl-3">
            <span className="block text-[8px] uppercase tracking-wider font-bold text-white/25">Roadmap Status</span>
            <span className="text-[11px] font-bold text-white/80 font-mono mt-0.5 block">{completedTasks} / {totalTasks} Tasks</span>
          </div>
        </div>

        {/* Agent usage pills & Open Button */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex gap-1 overflow-hidden">
            {agents.map((agent) => (
              <span
                key={agent.label}
                className={cn("px-1.5 py-0.5 rounded text-[8px] font-semibold border", agent.bg)}
              >
                {agent.label}
              </span>
            ))}
          </div>

          <button
            type="button"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 group-hover:from-violet-500 group-hover:to-indigo-500 text-[10px] font-bold transition-all text-white/90 group-hover:text-white"
          >
            Open →
          </button>
        </div>
      </div>
    </motion.div>
  );
}
