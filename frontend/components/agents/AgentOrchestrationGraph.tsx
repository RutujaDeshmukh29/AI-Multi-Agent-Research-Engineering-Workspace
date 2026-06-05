"use client";
// ============================================================
// components/agents/AgentOrchestrationGraph.tsx
// Phase 4 — Visual workflow diagram showing agent orchestration
// Shows which agents ran, in what order, with timing
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type AgentStatus = "idle" | "thinking" | "done" | "error" | "skipped";

interface AgentNode {
  key: string;
  label: string;
  icon: string;
  color: string;
  status: AgentStatus;
  message?: string;
  durationMs?: number;
}

interface AgentOrchestrationGraphProps {
  agents: AgentNode[];
  isActive: boolean;
}

const AGENT_DEFAULTS: Omit<AgentNode, "status">[] = [
  { key: "qa",          label: "QA Controller",  icon: "🧠", color: "#818cf8" },
  { key: "research",    label: "Research",        icon: "🔍", color: "#34d399" },
  { key: "engineering", label: "Engineering",     icon: "⚙️", color: "#fbbf24" },
  { key: "planner",     label: "Planner",         icon: "🗺️", color: "#a78bfa" },
  { key: "critic",      label: "Critic",          icon: "🎯", color: "#f87171" },
  { key: "innovation",  label: "Innovation",      icon: "💡", color: "#22d3ee" },
];

const STATUS_RING: Record<AgentStatus, string> = {
  idle:     "border-white/10",
  thinking: "border-violet-400 shadow-violet-500/30",
  done:     "border-emerald-400/60",
  error:    "border-red-400/60",
  skipped:  "border-white/8 opacity-40",
};

const STATUS_BG: Record<AgentStatus, string> = {
  idle:     "bg-white/[0.04]",
  thinking: "bg-violet-500/10",
  done:     "bg-emerald-500/8",
  error:    "bg-red-500/8",
  skipped:  "bg-transparent",
};

export function AgentOrchestrationGraph({ agents, isActive }: AgentOrchestrationGraphProps) {
  // Merge defaults with live status
  const nodes: AgentNode[] = AGENT_DEFAULTS.map(def => {
    const live = agents.find(a => a.key === def.key);
    return { ...def, status: live?.status ?? "idle", message: live?.message, durationMs: live?.durationMs };
  });

  const activeCount = nodes.filter(n => n.status === "thinking").length;
  const doneCount   = nodes.filter(n => n.status === "done").length;

  return (
    <div className="bg-[#0a0b12] border border-white/[0.07] rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[12px] font-semibold text-white/70">Agent Orchestration</h3>
          <p className="text-[10px] text-white/30 mt-0.5">
            {isActive
              ? `${activeCount} thinking · ${doneCount} complete`
              : doneCount > 0
              ? `${doneCount} agents completed`
              : "Waiting for query..."}
          </p>
        </div>
        {isActive && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
            </span>
            <span className="text-[9.5px] text-violet-400 font-medium">LIVE</span>
          </div>
        )}
      </div>

      {/* Flow: QA → [agents] → combine */}
      <div className="space-y-2">
        {/* QA node (top) */}
        <div className="flex justify-center">
          <AgentBubble node={nodes[0]} size="lg" />
        </div>

        {/* Arrow down */}
        <div className="flex justify-center">
          <FlowArrow active={nodes[0].status === "done"} />
        </div>

        {/* Agent nodes (row) */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {nodes.slice(1).map((node, i) => (
            <div key={node.key} className="flex items-center gap-2">
              <AgentBubble node={node} size="sm" />
              {i < nodes.length - 2 && (
                <div className="w-3 h-px bg-white/10" />
              )}
            </div>
          ))}
        </div>

        {/* Arrow down */}
        <div className="flex justify-center">
          <FlowArrow active={doneCount > 0} />
        </div>

        {/* Combine node */}
        <div className="flex justify-center">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl border text-[11px] font-medium transition-all",
            doneCount === nodes.filter(n => n.status !== "idle").length && doneCount > 0
              ? "border-emerald-400/40 bg-emerald-500/8 text-emerald-300"
              : "border-white/10 text-white/30"
          )}>
            <span>🔀</span>
            <span>Synthesize Response</span>
          </div>
        </div>
      </div>

      {/* Live activity log */}
      <AnimatePresence>
        {agents.filter(a => a.message).slice(-1).map(a => (
          <motion.div
            key={a.message}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[10px] font-mono text-white/25 px-1 truncate"
          >
            › {a.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function AgentBubble({ node, size }: { node: AgentNode; size: "lg" | "sm" }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.div
        animate={node.status === "thinking" ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={{ duration: 1.4, repeat: node.status === "thinking" ? Infinity : 0 }}
        className={cn(
          "border-2 rounded-xl flex items-center justify-center transition-all",
          size === "lg" ? "w-11 h-11 text-[18px]" : "w-9 h-9 text-[14px]",
          STATUS_RING[node.status],
          STATUS_BG[node.status],
          node.status === "thinking" ? "shadow-lg" : ""
        )}
        style={node.status === "thinking" ? { boxShadow: `0 0 12px ${getColor(node.key)}40` } : {}}
      >
        {node.status === "done" ? "✓" : node.icon}
      </motion.div>
      <span className={cn(
        "text-[9px] font-medium text-center leading-tight",
        node.status === "thinking" ? "text-violet-400" :
        node.status === "done"     ? "text-emerald-400" :
        node.status === "skipped"  ? "text-white/20" :
                                     "text-white/30"
      )}>
        {node.label}
      </span>
      {node.status === "thinking" && (
        <div className="flex gap-0.5">
          {[0,1,2].map(i => (
            <motion.div key={i} className="w-0.5 h-0.5 rounded-full bg-violet-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      )}
    </div>
  );
}

function FlowArrow({ active }: { active: boolean }) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-0 transition-all",
      active ? "opacity-70" : "opacity-20"
    )}>
      <div className="w-px h-3 bg-current" />
      <div className="text-[8px] leading-none">▼</div>
    </div>
  );
}

function getColor(key: string): string {
  const map: Record<string, string> = {
    qa: "#818cf8", research: "#34d399", engineering: "#fbbf24",
    planner: "#a78bfa", critic: "#f87171", innovation: "#22d3ee",
  };
  return map[key] || "#818cf8";
}
