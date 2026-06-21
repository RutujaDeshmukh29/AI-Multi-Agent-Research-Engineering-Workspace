"use client";

import { motion } from "framer-motion";

interface QuickActionsProps {
  onNewProject: () => void;
  onGenerateRoadmap: () => void;
  onOpenRecent: () => void;
  onVoiceSession: () => void;
}

export function QuickActions({
  onNewProject,
  onGenerateRoadmap,
  onOpenRecent,
  onVoiceSession,
}: QuickActionsProps) {
  const actions = [
    {
      title: "+ New Project",
      desc: "Deploy a fresh collaborative workspace",
      icon: "📁",
      color: "from-blue-600/10 hover:from-blue-600/20 text-blue-400 border-blue-500/15",
      action: onNewProject,
    },
    {
      title: "🧠 Generate Roadmap",
      desc: "Let AI structure your project milestone path",
      icon: "🗺️",
      color: "from-violet-600/10 hover:from-violet-600/20 text-violet-400 border-violet-500/15",
      action: onGenerateRoadmap,
    },
    {
      title: "📂 Open Recent Project",
      desc: "Instantly resume your last active project",
      icon: "🚀",
      color: "from-cyan-600/10 hover:from-cyan-600/20 text-cyan-400 border-cyan-500/15",
      action: onOpenRecent,
    },
    {
      title: "🎤 Voice Session",
      desc: "Start a real-time hands-free speech chat",
      icon: "🎤",
      color: "from-emerald-600/10 hover:from-emerald-600/20 text-emerald-400 border-emerald-500/15",
      action: onVoiceSession,
    },
  ];

  return (
    <div className="space-y-3">
      <span className="text-[9.5px] font-bold uppercase tracking-widest text-white/20 px-1">Quick Integrations</span>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((act, idx) => (
          <motion.button
            key={act.title}
            onClick={act.action}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 + 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`glass-card card-glow text-left rounded-2xl p-4.5 border transition-all duration-300 flex items-start gap-4 cursor-pointer bg-gradient-to-r ${act.color} w-full`}
          >
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-lg flex-shrink-0">
              {act.icon}
            </div>
            <div className="min-w-0">
              <h4 className="text-[12.5px] font-bold text-white/95">{act.title}</h4>
              <p className="text-[10px] text-white/35 mt-0.5 leading-snug line-clamp-2">{act.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
