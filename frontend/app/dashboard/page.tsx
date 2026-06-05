"use client";
// app/dashboard/page.tsx — Projects dashboard
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useProjects, useCreateProject } from "@/hooks/useProjects";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

const PROJECT_ICONS = ["🧠", "🤖", "🚀", "🔬", "⚡", "🌐", "🎯", "💡", "🔧", "📊"];
const PROJECT_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("🧠");
  const [newColor, setNewColor] = useState("#6366f1");
  const [creating, setCreating] = useState(false);

  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const p = await createProject.mutateAsync({ name: newName, description: newDesc, icon: newIcon, color: newColor });
      setShowCreate(false);
      setNewName(""); setNewDesc("");
      router.push(`/workspace/${p.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080910] text-white">
      <nav className="border-b border-white/[0.06] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold">✦</div>
          <span className="text-[14px] font-semibold">AI Workspace</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-white/40">Welcome, {user?.name}</span>
          <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-[11px] font-bold">{initials}</div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white/85 mb-1">Your Workspaces</h1>
          <p className="text-[13px] text-white/35">Select a project or create a new one to start collaborating with AI agents.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreate(true)}
            className="aspect-[4/3] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/[0.1] rounded-2xl text-white/30 hover:text-white/55 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
          >
            <div className="text-3xl">+</div>
            <span className="text-[13px] font-medium">New Project</span>
          </motion.button>

          {isLoading ? [1,2].map(i => (
            <div key={i} className="aspect-[4/3] bg-white/[0.03] border border-white/[0.06] rounded-2xl animate-pulse" />
          )) : projects.map((p: any, i: number) => (
            <motion.div key={p.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/workspace/${p.id}`)}
              className="aspect-[4/3] bg-[#0d0e16] border border-white/[0.07] rounded-2xl p-5 cursor-pointer flex flex-col justify-between hover:border-white/[0.14] transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{p.icon || "🧠"}</span>
                  <div className="w-2 h-2 rounded-full opacity-60" style={{ background: p.color || "#6366f1" }} />
                </div>
                <h3 className="text-[14px] font-semibold text-white/80 group-hover:text-white/95 transition-colors">{p.name}</h3>
                {p.description && <p className="text-[11.5px] text-white/30 mt-1 line-clamp-2">{p.description}</p>}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-white/25">{new Date(p.created_at).toLocaleDateString()}</span>
                <span className="text-[10px] text-violet-400/60 group-hover:text-violet-400 transition-colors">Open →</span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 20 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="w-full max-w-md bg-[#0d0e16] border border-white/10 rounded-2xl p-6 shadow-2xl"
              >
                <h2 className="text-[15px] font-semibold text-white/85 mb-5">Create New Project</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10.5px] text-white/35 uppercase tracking-wider mb-1.5 block">Icon</label>
                    <div className="flex gap-2 flex-wrap">
                      {PROJECT_ICONS.map(icon => (
                        <button key={icon} onClick={() => setNewIcon(icon)}
                          className={cn("w-9 h-9 rounded-lg text-lg border transition-all",
                            newIcon === icon ? "bg-violet-500/20 border-violet-500/40" : "border-white/10 hover:border-white/25"
                          )}>{icon}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10.5px] text-white/35 uppercase tracking-wider mb-1.5 block">Color</label>
                    <div className="flex gap-2">
                      {PROJECT_COLORS.map(color => (
                        <button key={color} onClick={() => setNewColor(color)}
                          className={cn("w-7 h-7 rounded-full border-2 transition-all",
                            newColor === color ? "border-white scale-110" : "border-transparent"
                          )} style={{ background: color }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10.5px] text-white/35 uppercase tracking-wider mb-1.5 block">Project Name *</label>
                    <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
                      placeholder="e.g. Drone AI System"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white/80 placeholder-white/20 focus:outline-none focus:border-violet-500/45 transition" />
                  </div>
                  <div>
                    <label className="text-[10.5px] text-white/35 uppercase tracking-wider mb-1.5 block">Description</label>
                    <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                      placeholder="What are you building?" rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white/80 placeholder-white/20 focus:outline-none focus:border-violet-500/45 transition resize-none" />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setShowCreate(false)}
                      className="flex-1 py-2.5 border border-white/10 rounded-xl text-[13px] text-white/45 hover:bg-white/5 transition-all">Cancel</button>
                    <button onClick={handleCreate} disabled={!newName.trim() || creating}
                      className="flex-1 py-2.5 bg-violet-600/30 hover:bg-violet-600/45 border border-violet-500/35 text-violet-200 rounded-xl text-[13px] font-medium transition-all disabled:opacity-40">
                      {creating ? "Creating..." : "Create Project"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
