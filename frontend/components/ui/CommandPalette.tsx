"use client";
// ============================================================
// components/ui/CommandPalette.tsx
// Cmd+K / Ctrl+K command palette
// Phase 4 — Keyboard Shortcuts
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type Command = {
  id: string;
  label: string;
  description?: string;
  icon: string;
  shortcut?: string;
  group: string;
  action: () => void;
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery]     = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.group.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Group commands
  const grouped = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected(s => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected(s => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selected]) {
          filtered[selected].action();
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selected, onClose]);

  const runCommand = (cmd: Command) => {
    cmd.action();
    onClose();
  };

  let flatIdx = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-lg bg-[#0d0e16] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden"
              style={{ boxShadow: "0 0 0 1px rgba(99,102,241,0.1), 0 25px 60px rgba(0,0,0,0.7)" }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
                <span className="text-white/30 text-[15px]">⌘</span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelected(0); }}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent outline-none text-[13.5px] text-white/80 placeholder-white/25"
                />
                <kbd className="text-[10px] text-white/25 bg-white/[0.06] border border-white/[0.08] rounded px-1.5 py-0.5 font-mono">ESC</kbd>
              </div>

              {/* Results */}
              <div className="max-h-[360px] overflow-y-auto py-2"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.07) transparent" }}>
                {Object.keys(grouped).length === 0 ? (
                  <div className="text-center py-10 text-white/25 text-[13px]">No commands found</div>
                ) : (
                  Object.entries(grouped).map(([group, cmds]) => (
                    <div key={group}>
                      <div className="px-4 py-1.5 text-[9.5px] text-white/30 uppercase tracking-widest font-semibold">{group}</div>
                      {cmds.map(cmd => {
                        const isSelected = flatIdx === selected;
                        const currentIdx = flatIdx++;
                        return (
                          <button
                            key={cmd.id}
                            onClick={() => runCommand(cmd)}
                            onMouseEnter={() => setSelected(currentIdx)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all",
                              isSelected ? "bg-violet-500/12" : "hover:bg-white/[0.04]"
                            )}
                          >
                            <span className="text-[16px] w-6 text-center flex-shrink-0">{cmd.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className={cn("text-[13px] font-medium", isSelected ? "text-white/90" : "text-white/65")}>{cmd.label}</div>
                              {cmd.description && <div className="text-[11px] text-white/30 mt-0.5">{cmd.description}</div>}
                            </div>
                            {cmd.shortcut && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {cmd.shortcut.split("+").map(k => (
                                  <kbd key={k} className="text-[9.5px] text-white/30 bg-white/[0.06] border border-white/[0.08] rounded px-1.5 py-0.5 font-mono">{k}</kbd>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-4 text-[10px] text-white/20">
                <span>↑↓ navigate</span>
                <span>⏎ run</span>
                <span>ESC close</span>
                <span className="ml-auto">{filtered.length} commands</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Global keyboard shortcut hook ──────
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(p => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
