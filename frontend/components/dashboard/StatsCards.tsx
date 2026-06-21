"use client";

import { motion } from "framer-motion";

interface StatsCardsProps {
  projectCount: number;
  sessionCount: number;
  messageCount: number;
  roadmapCount: number;
}

export function StatsCards({ projectCount, sessionCount, messageCount, roadmapCount }: StatsCardsProps) {
  const cards = [
    { label: "Active Workspaces", value: projectCount, icon: "📁", color: "from-blue-500/10 to-indigo-500/5 text-blue-400 border-blue-500/20" },
    { label: "Discussion Sessions", value: sessionCount, icon: "💬", color: "from-violet-500/10 to-purple-500/5 text-violet-400 border-violet-500/20" },
    { label: "Total Chat Prompts", value: messageCount, icon: "📨", color: "from-pink-500/10 to-rose-500/5 text-pink-400 border-pink-500/20" },
    { label: "Milestone Roadmaps", value: roadmapCount, icon: "🗺️", color: "from-cyan-500/10 to-teal-500/5 text-cyan-400 border-cyan-500/20" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.05 }}
          whileHover={{ y: -4, scale: 1.015 }}
          className={`glass-card card-glow rounded-2xl p-5 border flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all bg-gradient-to-br ${card.color}`}
        >
          {/* subtle inside glow bubble */}
          <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-white/[0.01] group-hover:bg-white/[0.04] rounded-full filter blur-md transition-all duration-300 pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/35 font-bold">{card.label}</span>
            <span className="text-lg flex-shrink-0">{card.icon}</span>
          </div>

          <div className="mt-3.5 flex items-baseline gap-1.5">
            <h3 className="text-2xl font-black font-mono tracking-tight text-white/85 group-hover:text-white transition-colors">
              {card.value}
            </h3>
            <span className="text-[10.5px] text-white/20">active</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
