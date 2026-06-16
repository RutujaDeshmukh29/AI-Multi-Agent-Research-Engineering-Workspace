"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface RoadmapTask {
  id: string;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  estimated_hours: number;
  description?: string;
  tags?: string[];
  phase_index: number;
}

interface RoadmapPhase {
  id: string;
  name: string;
  goal: string;
  week_start: number;
  week_end: number;
}

interface RoadmapData {
  id: string;
  project_title: string;
  total_phases: number;
  estimated_weeks: number;
  progress_percent: number;
  phases: RoadmapPhase[];
  tasks: RoadmapTask[];
}

interface RoadmapPanelProps {
  roadmap: RoadmapData;
  onTaskToggle: (taskId: string, completed: boolean) => Promise<void>;
  onRegenerate: () => Promise<void>;
  onDelete: () => Promise<void>;
  isGenerating: boolean;
}

const PRIORITY_STYLES = {
  high:   "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const PHASE_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

export function RoadmapPanel({ roadmap, onTaskToggle, onRegenerate, onDelete, isGenerating }: RoadmapPanelProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set((roadmap.phases || []).map((_, i) => i)));
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());

  const togglePhase = (idx: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleTaskToggle = async (task: RoadmapTask) => {
    setLoadingTasks(prev => new Set(prev).add(task.id));
    try {
      await onTaskToggle(task.id, !task.completed);
    } finally {
      setLoadingTasks(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const tasksByPhase = (roadmap.tasks || []).reduce((acc, task) => {
    const key = task.phase_index;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<number, RoadmapTask[]>);

  const totalTasks = roadmap.tasks?.length || 0;
  const completedTasks = (roadmap.tasks || []).filter(t => t.completed).length;

  return (
    <div className="bg-[#0d0e14] border border-white/8 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white/85">🗺️ {roadmap.project_title}</h3>
            <p className="text-xs text-white/35 mt-0.5">
              {roadmap.total_phases} phases · ~{roadmap.estimated_weeks} weeks · {completedTasks}/{totalTasks} tasks
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-white/90">{roadmap.progress_percent}%</div>
            <div className="text-[10px] text-white/35">complete</div>
          </div>
        </div>
        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${roadmap.progress_percent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}
          />
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {(roadmap.phases || []).map((phase, phaseIdx) => {
          const phaseTasks = tasksByPhase[phaseIdx] || [];
          const doneInPhase = phaseTasks.filter(t => t.completed).length;
          const phaseColor = PHASE_COLORS[phaseIdx % PHASE_COLORS.length];
          const isExpanded = expandedPhases.has(phaseIdx);

          return (
            <div key={phase.id || phaseIdx}>
              <button onClick={() => togglePhase(phaseIdx)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/3 transition-colors text-left">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: phaseColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white/75">Phase {phaseIdx + 1}: {phase.name}</span>
                    <span className="text-[10px] text-white/30">Wk {phase.week_start}–{phase.week_end}</span>
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5 truncate">{phase.goal}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-mono text-white/35">{doneInPhase}/{phaseTasks.length}</span>
                  <div className="w-3 h-3 border border-white/20 rounded-sm flex items-center justify-center text-[8px] transition-transform" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>›</div>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-4 pb-3 space-y-1.5">
                      {phaseTasks.map((task) => (
                        <motion.div key={task.id} layout
                          className={cn("flex items-start gap-2.5 p-2.5 rounded-lg border transition-all group", task.completed ? "bg-emerald-500/5 border-emerald-500/15 opacity-70" : "bg-white/3 border-white/8")}>
                          <div className="flex-shrink-0 mt-0.5">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => handleTaskToggle(task)}
                              disabled={loadingTasks.has(task.id)}
                              className="w-4 h-4 rounded bg-white/5 border-white/25 text-indigo-500 focus:ring-indigo-600 focus:ring-offset-0 focus:ring-2 disabled:opacity-50"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn("text-xs font-medium", task.completed ? "line-through text-white/35" : "text-white/75")}>{task.title}</span>
                              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium", PRIORITY_STYLES[task.priority])}>{task.priority}</span>
                              <span className="text-[9px] text-white/25">~{task.estimated_hours}h</span>
                            </div>
                            {task.description && <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{task.description}</p>}
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {task.tags.map(tag => <span key={tag} className="text-[9px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded">{tag}</span>)}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <div className="p-3 flex justify-end gap-2 border-t border-white/6 bg-black/10">
        <Button onClick={onDelete} variant="destructive" size="sm" disabled={isGenerating}>Delete</Button>
        <Button onClick={onRegenerate} variant="secondary" size="sm" disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Regenerate"}
        </Button>
      </div>
    </div>
  );
}
