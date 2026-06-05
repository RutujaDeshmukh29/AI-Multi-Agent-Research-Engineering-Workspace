"use client";
// components/agents/ThinkingIndicator.tsx
// Animated thinking state shown while agents process

import { motion } from "framer-motion";

interface ThinkingIndicatorProps {
  agentName?: string;
  message?: string;
}

export function ThinkingIndicator({ agentName = "AI", message = "Thinking..." }: ThinkingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-start gap-3 px-1"
    >
      {/* Agent avatar */}
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
        ✦
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Thinking label */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 font-medium">{agentName}</span>
          <span className="text-[10px] text-violet-400/70 font-mono animate-pulse">{message}</span>
        </div>

        {/* Animated dots */}
        <div className="flex items-center gap-1.5 h-6">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-violet-400/50"
              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
