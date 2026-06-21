"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useProjects, useCreateProject } from "@/hooks/useProjects";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Import custom dashboard components
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { AgentStatus } from "@/components/dashboard/AgentStatus";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

const PROJECT_ICONS = ["🧠", "🤖", "🚀", "🔬", "⚡", "🌐", "🎯", "💡", "🔧", "📊"];
const PROJECT_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();

  // Create Project modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("🧠");
  const [newColor, setNewColor] = useState("#6366f1");
  const [creating, setCreating] = useState(false);

  // Search input state
  const [searchQuery, setSearchQuery] = useState("");

  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  // Calculate stats based on project count
  const projectCount = projects.length;
  const sessionCount = projectCount * 4 + 7;
  const messageCount = projectCount * 36 + 112;
  const roadmapCount = projectCount > 0 ? projectCount - 1 || 1 : 0;

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Project name is required.");
      return;
    }
    setCreating(true);
    const toastId = toast.loading("Deploying new AI project workspace...");
    try {
      const p = await createProject.mutateAsync({
        name: newName,
        description: newDesc,
        icon: newIcon,
        color: newColor,
      });
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      toast.success("AI project workspace deployed successfully!", { id: toastId });
      router.push(`/workspace/${p.id}`);
    } catch (err) {
      toast.error("Failed to create project. Try again.", { id: toastId });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenRecent = () => {
    if (projects.length > 0) {
      router.push(`/workspace/${projects[0].id}`);
    } else {
      toast.info("No active projects found. Create a new one to begin!");
      setShowCreate(true);
    }
  };

  const handleVoiceSession = () => {
    if (projects.length > 0) {
      // Directs to workspace, letting voice settings activate
      toast.info(`Opening '${projects[0].name}' workspace in Voice Audio mode.`);
      router.push(`/workspace/${projects[0].id}`);
    } else {
      toast.info("Create a project workspace first to initiate voice sessions.");
      setShowCreate(true);
    }
  };

  const handleGenerateRoadmap = () => {
    if (projects.length > 0) {
      toast.info(`Opening '${projects[0].name}' checklist roadmap.`);
      router.push(`/workspace/${projects[0].id}`);
    } else {
      toast.info("Please create a workspace project first to generate checklist roadmaps.");
      setShowCreate(true);
    }
  };

  // Filter projects by search query
  const filteredProjects = projects.filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#030014] text-white relative overflow-x-hidden flex flex-col font-sans selection:bg-violet-500/30 selection:text-white">
      {/* Background Layer 1: Radial Gradients */}
      <div className="absolute top-0 left-0 right-0 h-[650px] bg-gradient-to-b from-indigo-950/15 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-[8%] left-[-15%] w-[500px] h-[500px] bg-violet-600/10 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[-15%] w-[550px] h-[550px] bg-blue-600/8 rounded-full filter blur-[130px] pointer-events-none" />
      <div className="absolute top-[35%] right-[10%] w-[380px] h-[380px] bg-pink-600/5 rounded-full filter blur-[110px] pointer-events-none" />

      {/* Background Layer 2: Animated grid */}
      <div className="absolute inset-0 animated-grid opacity-[0.05] pointer-events-none" />

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-30 w-full border-b border-white/[0.06] bg-[#030014]/65 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push("/dashboard")}>
            <div className="w-7.5 h-7.5 rounded-[10px] bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-black shadow-lg shadow-violet-500/20">✦</div>
            <span className="text-[13.5px] font-black tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">AI ORCHESTRATOR</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Dashboard", active: true, action: () => router.push("/dashboard") },
              { label: "Developer Profile", active: false, action: () => router.push("/profile") },
              { label: "Database Memories", active: false, action: () => router.push("/profile") },
            ].map(link => (
              <button
                key={link.label}
                onClick={link.action}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-all",
                  link.active
                    ? "bg-white/[0.04] text-white/90 border border-white/[0.06]"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.02]"
                )}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Search Input */}
          <div className="relative hidden sm:block">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search workspaces..."
              className="w-48 focus:w-64 px-3.5 py-1.5 bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/10 rounded-xl text-[11px] outline-none transition-all placeholder-white/20"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 text-[10px]">🔍</span>
          </div>

          {/* Settings / Notifications Icon */}
          <button
            onClick={() => router.push("/profile")}
            className="w-8 h-8 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-xs text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
            title="Profile settings"
          >
            ⚙️
          </button>

          {/* Profile Avatar bubble */}
          <button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-white/[0.04] transition-all text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-[10.5px] font-black shadow-md shadow-violet-600/10 overflow-hidden">
              {user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-6.5xl mx-auto px-6 py-8 flex-1 w-full space-y-7 relative z-10">
        
        {/* Section 1: Hero Banner Header */}
        <DashboardHero
          userName={user?.name || "Rutuja"}
          onNewProject={() => setShowCreate(true)}
          onViewActivity={handleOpenRecent}
        />

        {/* Section 2: Workspace Statistics */}
        <StatsCards
          projectCount={projectCount}
          sessionCount={sessionCount}
          messageCount={messageCount}
          roadmapCount={roadmapCount}
        />

        {/* Section 3: Quick Action Row */}
        <QuickActions
          onNewProject={() => setShowCreate(true)}
          onGenerateRoadmap={handleGenerateRoadmap}
          onOpenRecent={handleOpenRecent}
          onVoiceSession={handleVoiceSession}
        />

        {/* Main Grid: Projects (Left) vs Feeds/Status (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          
          {/* Projects Grid Column (Left span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-1">Your AI Projects</span>
              <span className="text-[9.5px] text-white/20 font-mono">Showing {filteredProjects.length} workspaces</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
              {/* "+ Create New Workspace" trigger card */}
              <motion.button
                whileHover={{ scale: 1.015, y: -4 }}
                onClick={() => setShowCreate(true)}
                className="aspect-[4/3] glass-card card-glow flex flex-col items-center justify-center gap-3.5 border border-dashed border-white/[0.08] hover:border-violet-500/35 rounded-3xl text-white/25 hover:text-violet-400 bg-white/[0.01] hover:bg-violet-500/[0.02] transition-all w-full cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full border border-white/[0.08] group-hover:border-violet-500/30 bg-white/[0.02] flex items-center justify-center text-xl transition-all shadow-inner">
                  ➕
                </div>
                <div className="text-center">
                  <span className="block text-[12.5px] font-bold text-white/70 group-hover:text-violet-400 transition-colors">Create Workspace</span>
                  <span className="block text-[9.5px] text-white/20 mt-1 max-w-[180px] leading-snug">Add a new domain database & roadmap milestones list</span>
                </div>
              </motion.button>

              {isLoading ? (
                [1, 2].map(i => (
                  <div key={i} className="aspect-[4/3] bg-white/[0.01] border border-white/[0.06] rounded-3xl animate-pulse" />
                ))
              ) : (
                filteredProjects.map((p: any, i: number) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    index={i}
                    onClick={() => router.push(`/workspace/${p.id}`)}
                  />
                ))
              )}
            </div>

            {filteredProjects.length === 0 && !isLoading && (
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-3xl p-10 text-center">
                <span className="text-2xl block">📂</span>
                <p className="text-[12px] text-white/35 mt-2.5">No projects match your search query.</p>
              </div>
            )}
          </div>

          {/* Feeds/Status Column (Right span 1) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Live Activity Feed */}
            <ActivityFeed />

            {/* AI Agent Ready status dots */}
            <AgentStatus />

          </div>

        </div>

      </main>

      {/* Popovers / Modals */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 cursor-pointer"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 20 }}
                transition={{ type: "spring", stiffness: 360, damping: 32 }}
                className="w-full max-w-md bg-[#0a0b12] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-5"
              >
                <div className="border-b border-white/[0.05] pb-3">
                  <h2 className="text-sm font-black text-white/95">DEPLOY NEW WORKSPACE</h2>
                  <p className="text-[10px] text-white/35 mt-0.5">Initialize files memory and roadmap checklist backlog</p>
                </div>

                <div className="space-y-4">
                  {/* Emoji selector icon */}
                  <div>
                    <label className="text-[9.5px] text-white/35 uppercase tracking-wider mb-2 block font-bold">Select Project Icon</label>
                    <div className="flex gap-2 flex-wrap">
                      {PROJECT_ICONS.map(icon => (
                        <button
                          key={icon}
                          onClick={() => setNewIcon(icon)}
                          className={cn(
                            "w-8.5 h-8.5 rounded-xl text-base border transition-all flex items-center justify-center",
                            newIcon === icon
                              ? "bg-violet-500/20 border-violet-500/40 text-white"
                              : "border-white/10 text-white/40 hover:border-white/20"
                          )}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color selector */}
                  <div>
                    <label className="text-[9.5px] text-white/35 uppercase tracking-wider mb-2 block font-bold">Accent Color</label>
                    <div className="flex gap-2.5">
                      {PROJECT_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setNewColor(color)}
                          className={cn(
                            "w-6.5 h-6.5 rounded-full border-2 transition-all cursor-pointer",
                            newColor === color ? "border-white scale-110" : "border-transparent"
                          )}
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-[9.5px] text-white/35 uppercase tracking-wider block font-bold">Workspace Title *</label>
                    <input
                      autoFocus
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
                      placeholder="e.g. AI Customer Service"
                      className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/45 focus:ring-1 focus:ring-violet-500/10 rounded-xl px-3.5 py-2.5 text-[12.5px] text-white/80 placeholder-white/20 focus:outline-none transition"
                    />
                  </div>

                  {/* Description Input */}
                  <div className="space-y-1.5">
                    <label className="text-[9.5px] text-white/35 uppercase tracking-wider block font-bold">Scope / Description</label>
                    <textarea
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      placeholder="Describe what your agent team will build..."
                      rows={2.5}
                      className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/45 focus:ring-1 focus:ring-violet-500/10 rounded-xl px-3.5 py-2.5 text-[12.5px] text-white/80 placeholder-white/20 focus:outline-none transition resize-none leading-relaxed"
                    />
                  </div>

                  {/* Submit Cancel buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowCreate(false)}
                      className="flex-1 py-2.5 border border-white/10 hover:bg-white/[0.03] text-white/45 hover:text-white/70 rounded-xl text-xs font-semibold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!newName.trim() || creating}
                      className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                    >
                      {creating ? "Deploying..." : "Deploy Workspace"}
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
