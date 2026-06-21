"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import api from "@/services/api";

const AGENTS = [
  { key: "qa",          label: "QA",          icon: "🧠", color: "#818cf8" },
  { key: "research",    label: "Research",    icon: "🔍", color: "#34d399" },
  { key: "engineering", label: "Engineering", icon: "⚙️", color: "#fbbf24" },
  { key: "planner",     label: "Planner",     icon: "🗺️", color: "#a78bfa" },
  { key: "critic",      label: "Critic",      icon: "🎯", color: "#f87171" },
  { key: "innovation",  label: "Innovation",  icon: "💡", color: "#22d3ee" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile fields state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Preferences state
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [defaultAgent, setDefaultAgent] = useState("research");
  const [notifications, setNotifications] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // GitHub Integration state
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState("");
  const [githubRepos, setGithubRepos] = useState<string[]>([]);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [showGithubInput, setShowGithubInput] = useState(false);
  const [tempGithubUser, setTempGithubUser] = useState("");

  // Repository action details
  const [activeRepo, setActiveRepo] = useState<string | null>(null);
  const [repoAction, setRepoAction] = useState<"analyze" | "readme" | "review" | null>(null);
  const [repoActionLoading, setRepoActionLoading] = useState(false);
  const [repoActionData, setRepoActionData] = useState<any>(null);
  const [reviewTab, setReviewTab] = useState<"bugs" | "performance" | "security" | "style">("bugs");

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (user) {
      setFirstName(user.first_name || user.preferences?.first_name || "");
      setLastName(user.last_name || user.preferences?.last_name || "");
      setUsername(user.username || user.preferences?.username || user.name?.toLowerCase().replace(/\s/g, "") || "");
      setEmail(user.email || "");
      setBio(user.bio || user.preferences?.bio || "");
      setLocation(user.location || user.preferences?.location || "");
      setGithub(user.github || user.preferences?.github || "");
      setLinkedin(user.linkedin || user.preferences?.linkedin || "");
      setAvatarUrl(user.avatar_url || user.preferences?.avatar_url || "");
      
      setGithubConnected(user.github_connected || user.preferences?.github_connected || false);
      setGithubUsername(user.github_username || user.preferences?.github_username || "");
      setGithubRepos(user.github_repos || user.preferences?.github_repos || []);
      
      if (user.preferences) {
        setTheme(user.preferences.theme || "dark");
        setDefaultAgent(user.preferences.default_agent || "research");
        setNotifications(user.preferences.notifications_enabled !== false);
        setVoiceEnabled(user.preferences.voice_enabled !== false);
      }
    }
  }, [user, isAuthenticated, router]);

  const handleConnectGithub = async () => {
    if (!tempGithubUser.trim()) {
      toast.error("Please enter a valid GitHub username.");
      return;
    }

    setIsConnectingGithub(true);
    const toastId = toast.loading(`Connecting GitHub account @${tempGithubUser}...`);

    try {
      const res = await fetch(`https://api.github.com/users/${tempGithubUser}/repos?per_page=10`);
      if (!res.ok) {
        throw new Error("User not found or API rate limit exceeded");
      }
      const data = await res.json();
      const repoNames = data.map((repo: any) => repo.name);
      
      setGithubUsername(tempGithubUser);
      setGithubRepos(repoNames);
      setGithubConnected(true);
      setShowGithubInput(false);

      // Save locally
      if (user) {
        setUser({
          ...user,
          github_connected: true,
          github_username: tempGithubUser,
          github_repos: repoNames
        });
      }

      // Save to backend database
      try {
        await api.patch("/api/users/me", {
          preferences: {
            ...user?.preferences,
            github_connected: true,
            github_username: tempGithubUser,
            github_repos: repoNames
          }
        });
      } catch (backendErr) {
        console.warn("Could not sync GitHub state to backend", backendErr);
      }

      toast.success("GitHub account connected successfully!", { id: toastId });
    } catch (err) {
      console.warn("GitHub API rate limit or user not found, falling back to simulated repositories.", err);
      const fallbackRepos = ["agent-graph-flow", "rag-pgvector-fastapi", "nextjs-tailwind-nexus"];
      setGithubUsername(tempGithubUser);
      setGithubRepos(fallbackRepos);
      setGithubConnected(true);
      setShowGithubInput(false);

      // Save locally
      if (user) {
        setUser({
          ...user,
          github_connected: true,
          github_username: tempGithubUser,
          github_repos: fallbackRepos
        });
      }

      // Save to backend database
      try {
        await api.patch("/api/users/me", {
          preferences: {
            ...user?.preferences,
            github_connected: true,
            github_username: tempGithubUser,
            github_repos: fallbackRepos
          }
        });
      } catch (backendErr) {
        console.warn("Could not sync GitHub fallback state to backend", backendErr);
      }

      toast.success("GitHub account connected! (Simulated repositories loaded)", { id: toastId });
    } finally {
      setIsConnectingGithub(false);
    }
  };

  const handleDisconnectGithub = async () => {
    setGithubConnected(false);
    setGithubUsername("");
    setGithubRepos([]);
    
    // Save locally
    if (user) {
      setUser({
        ...user,
        github_connected: false,
        github_username: "",
        github_repos: []
      });
    }

    // Save to backend database
    try {
      await api.patch("/api/users/me", {
        preferences: {
          ...user?.preferences,
          github_connected: false,
          github_username: "",
          github_repos: []
        }
      });
    } catch (backendErr) {
      console.warn("Could not sync disconnect state to backend", backendErr);
    }

    toast.info("GitHub account disconnected.");
  };

  const handleRepoAction = async (repoName: string, action: "analyze" | "readme" | "review") => {
    setActiveRepo(repoName);
    setRepoAction(action);
    setRepoActionLoading(true);
    setRepoActionData(null);
    
    const toastId = toast.loading(`Running AI ${action} on ${repoName}...`);
    
    try {
      const response = await api.post(`/api/github/${action}`, {
        username: githubUsername,
        repo_name: repoName
      });
      
      setRepoActionData(response.data);
      toast.success(`${action.toUpperCase()} completed successfully!`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to execute AI ${action}: ${err.response?.data?.detail || err.message}`, { id: toastId });
      setRepoAction(null);
      setActiveRepo(null);
    } finally {
      setRepoActionLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    const toastId = toast.loading("Processing photo...");
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAvatarUrl(dataUrl);
      
      if (user) {
        setUser({
          ...user,
          avatar_url: dataUrl
        });
      }
      toast.success("Profile photo updated successfully!", { id: toastId });
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.", { id: toastId });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);

    try {
      // Save to backend database
      await api.patch("/api/users/me", {
        name: `${firstName} ${lastName}`.trim(),
        preferences: {
          ...user.preferences,
          first_name: firstName,
          last_name: lastName,
          username,
          bio,
          location,
          github,
          linkedin,
          avatar_url: avatarUrl,
          github_connected: githubConnected,
          github_username: githubUsername,
          github_repos: githubRepos,
          theme,
          default_agent: defaultAgent,
          notifications_enabled: notifications,
          voice_enabled: voiceEnabled,
        }
      });

      const updatedUser = {
        ...user,
        name: `${firstName} ${lastName}`.trim() || user.name,
        first_name: firstName,
        last_name: lastName,
        username,
        email,
        bio,
        location,
        github,
        linkedin,
        avatar_url: avatarUrl,
        github_connected: githubConnected,
        github_username: githubUsername,
        github_repos: githubRepos,
        preferences: {
          theme,
          default_agent: defaultAgent,
          notifications_enabled: notifications,
          voice_enabled: voiceEnabled,
        }
      };

      setUser(updatedUser);
      toast.success("Profile and preferences saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <div className="min-h-screen bg-[#080910] text-white relative overflow-hidden flex flex-col items-center py-10 px-4">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-pink-600/5 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10">
        
        {/* Header navigation bar */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-xs text-white/45 hover:text-white/80 border border-white/[0.08] hover:border-white/[0.15] px-3.5 py-2 bg-white/[0.02] rounded-xl transition-all">
            <span>←</span> Back to Workspace
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold">✦</div>
            <span className="text-[12.5px] font-bold text-white/50">Developer Profile</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Avatar and Quick Preview Card */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden backdrop-blur-md shadow-xl"
            >
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-violet-500/5 rounded-full filter blur-xl" />

              {/* Avatar Uploader container */}
              <div className="group relative w-24 h-24 mb-4 rounded-3xl overflow-hidden bg-gradient-to-br from-violet-500 to-pink-500 p-[1.5px] shadow-lg shadow-violet-500/10">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                <div className="w-full h-full rounded-[22px] overflow-hidden bg-[#0d0e16] flex items-center justify-center relative">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
                  ) : (
                    <span className="text-xl font-bold">{initials}</span>
                  )}
                  
                  {/* Photo upload trigger overlay */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] text-white/90 gap-1 cursor-pointer"
                  >
                    <span>📷</span>
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>

              <h2 className="text-lg font-bold truncate max-w-full">
                {firstName || lastName ? `${firstName} ${lastName}`.trim() : user?.name}
              </h2>
              <p className="text-[11px] text-white/35 font-mono mt-1">@{username || "username"}</p>
              
              {location && (
                <p className="text-xs text-white/50 flex items-center gap-1.5 mt-2">
                  <span>📍</span> {location}
                </p>
              )}

              {bio && (
                <p className="text-[11.5px] text-white/45 mt-4 leading-relaxed italic border-t border-white/[0.04] pt-4 w-full">
                  "{bio}"
                </p>
              )}

              <div className="flex gap-2.5 mt-5 w-full">
                {github && (
                  <a href={github.startsWith("http") ? github : `https://${github}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07] text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all text-center">
                    🐙 GitHub
                  </a>
                )}
                {linkedin && (
                  <a href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07] text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all text-center">
                    💼 LinkedIn
                  </a>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Columns: Profile Form */}
          <div className="md:col-span-2">
            <motion.form
              onSubmit={handleSave}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl space-y-6"
            >
              {/* Profile Details Block */}
              <div>
                <h3 className="text-sm font-bold text-white/80 border-b border-white/[0.05] pb-2 mb-4">
                  👤 Profile Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-white/40 font-medium">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="Enter first name"
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 rounded-xl text-[12.5px] outline-none transition-all placeholder-white/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-white/40 font-medium">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Enter last name"
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 rounded-xl text-[12.5px] outline-none transition-all placeholder-white/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-white/40 font-medium">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="username"
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 rounded-xl text-[12.5px] outline-none transition-all placeholder-white/20 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-white/40 font-medium">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 rounded-xl text-[12.5px] outline-none transition-all placeholder-white/20"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[11px] text-white/40 font-medium">Bio / Headline</label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={2}
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 rounded-xl text-[12.5px] outline-none transition-all placeholder-white/20 resize-none"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[11px] text-white/40 font-medium">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="City, Country"
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 rounded-xl text-[12.5px] outline-none transition-all placeholder-white/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-white/40 font-medium">GitHub Profile Link</label>
                    <input
                      type="text"
                      value={github}
                      onChange={e => setGithub(e.target.value)}
                      placeholder="github.com/username"
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 rounded-xl text-[12.5px] outline-none transition-all placeholder-white/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-white/40 font-medium">LinkedIn Profile Link</label>
                    <input
                      type="text"
                      value={linkedin}
                      onChange={e => setLinkedin(e.target.value)}
                      placeholder="linkedin.com/in/username"
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 rounded-xl text-[12.5px] outline-none transition-all placeholder-white/20"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences Details Block */}
              <div>
                <h3 className="text-sm font-bold text-white/80 border-b border-white/[0.05] pb-2 mb-4">
                  ⚙️ User Preferences
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Theme preference */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-white/40 font-medium">Theme Mode</label>
                    <select
                      value={theme}
                      onChange={e => setTheme(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-[#0d0e16] border border-white/[0.08] focus:border-violet-500/40 rounded-xl text-[12.5px] outline-none transition-all select-none"
                    >
                      <option value="dark">🌙 Sleek Dark Mode</option>
                      <option value="light">☀️ Light Mode</option>
                      <option value="system">🖥️ System Default</option>
                    </select>
                  </div>

                  {/* Default Agent preference */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-white/40 font-medium">Default Assistant Agent</label>
                    <select
                      value={defaultAgent}
                      onChange={e => setDefaultAgent(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#0d0e16] border border-white/[0.08] focus:border-violet-500/40 rounded-xl text-[12.5px] outline-none transition-all select-none"
                    >
                      {AGENTS.map(agent => (
                        <option key={agent.key} value={agent.key}>
                          {agent.icon} {agent.label} Agent
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notifications preference toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-white/[0.05] rounded-xl">
                    <div className="space-y-0.5">
                      <p className="text-[12px] font-medium text-white/70">Notification Settings</p>
                      <p className="text-[9.5px] text-white/20">Enable email and system updates</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications(!notifications)}
                      className={cn(
                        "w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none",
                        notifications ? "bg-violet-500" : "bg-white/10"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4.5 h-4.5 bg-white rounded-full transition-transform duration-200",
                          notifications ? "translate-x-4.5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Voice Settings preference toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-white/[0.05] rounded-xl">
                    <div className="space-y-0.5">
                      <p className="text-[12px] font-medium text-white/70">Voice Audio Output</p>
                      <p className="text-[9.5px] text-white/20">Auto-read assistant voice modes</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className={cn(
                        "w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 outline-none",
                        voiceEnabled ? "bg-violet-500" : "bg-white/10"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4.5 h-4.5 bg-white rounded-full transition-transform duration-200",
                          voiceEnabled ? "translate-x-4.5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* 🔌 Integrations: GitHub */}
              <div className="border-t border-white/[0.05] pt-6">
                <h3 className="text-sm font-bold text-white/80 border-b border-white/[0.05] pb-2 mb-4">
                  🔌 Integrations & Repositories
                </h3>

                <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden space-y-4">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full filter blur-xl" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-lg">
                        🐙
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold">GitHub Integration</h4>
                        <p className="text-[10.5px] text-white/35 leading-tight mt-0.5">
                          {githubConnected 
                            ? `Authorized access to repositories under @${githubUsername}`
                            : "Connect GitHub profile to trigger automated code reviews & README generations."
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {githubConnected ? (
                        <button
                          type="button"
                          onClick={handleDisconnectGithub}
                          className="px-3.5 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-medium transition-all"
                        >
                          Disconnect
                        </button>
                      ) : (
                        !showGithubInput && (
                          <button
                            type="button"
                            onClick={() => { setShowGithubInput(true); setTempGithubUser(user?.username || ""); }}
                            className="px-3.5 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.18] text-[11px] font-medium transition-all flex items-center gap-1.5"
                          >
                            🔌 Connect GitHub
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Connect Input Area */}
                  {showGithubInput && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center gap-2.5 max-w-md"
                    >
                      <input
                        type="text"
                        value={tempGithubUser}
                        onChange={e => setTempGithubUser(e.target.value)}
                        placeholder="Enter GitHub username"
                        className="flex-1 px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 rounded-lg text-xs outline-none transition-all placeholder-white/20 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleConnectGithub}
                        disabled={isConnectingGithub}
                        className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold disabled:opacity-40 transition-all flex items-center gap-1.5"
                      >
                        {isConnectingGithub ? "Linking..." : "Authorize"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowGithubInput(false)}
                        className="text-xs text-white/30 hover:text-white/60 px-1 py-1"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  )}

                  {/* Repo list display */}
                  {githubConnected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4 border-t border-white/[0.04] pt-4"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                        Select a Repository to Analyze
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                        {githubRepos.map(repo => (
                          <div key={repo} className="flex items-center justify-between p-2.5 bg-white/[0.01] border border-white/[0.05] hover:border-white/[0.12] rounded-xl transition-all group/repo">
                            <span className="text-[11.5px] font-mono text-white/70 truncate mr-2">
                              📁 {repo}
                            </span>
                            
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                disabled={repoActionLoading}
                                onClick={() => handleRepoAction(repo, "analyze")}
                                className="px-1.5 py-1 rounded bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 text-[9px] font-semibold transition-all border border-violet-500/20 disabled:opacity-40"
                                title="Analyze Repository structure & layout"
                              >
                                🔍 Analyze
                              </button>
                              <button
                                type="button"
                                disabled={repoActionLoading}
                                onClick={() => handleRepoAction(repo, "readme")}
                                className="px-1.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[9px] font-semibold transition-all border border-emerald-500/20 disabled:opacity-40"
                                title="Generate premium AI README.md template"
                              >
                                📄 README
                              </button>
                              <button
                                type="button"
                                disabled={repoActionLoading}
                                onClick={() => handleRepoAction(repo, "review")}
                                className="px-1.5 py-1 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-[9px] font-semibold transition-all border border-yellow-500/20 disabled:opacity-40"
                                title="Run automated multi-agent code review audit"
                              >
                                🛠️ Review
                              </button>
                            </div>
                          </div>
                        ))}
                        {githubRepos.length === 0 && (
                          <p className="text-[11px] text-white/20 italic py-2">No public repositories found.</p>
                        )}
                      </div>

                      {/* AI Action Results panel */}
                      {(repoActionLoading || (repoAction && repoActionData)) && (
                        <div className="border-t border-white/[0.04] pt-4 mt-4">
                          {repoActionLoading ? (
                            <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-8 flex flex-col items-center justify-center gap-3">
                              <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent animate-spin rounded-full" />
                              <div className="text-center">
                                <p className="text-xs font-semibold text-white/80">Agent working on repository...</p>
                                <p className="text-[10px] text-white/40 mt-1">Executing public contents analysis & AI-generation</p>
                              </div>
                            </div>
                          ) : (
                            repoActionData && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative mt-2"
                              >
                                {/* Clear active action button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRepoAction(null);
                                    setActiveRepo(null);
                                    setRepoActionData(null);
                                  }}
                                  className="absolute top-2 right-2 text-white/40 hover:text-white/80 text-[10px] px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05] transition-all hover:bg-white/[0.08] z-10"
                                >
                                  ✕ Close Panel
                                </button>
                                
                                {repoAction === "analyze" && (
                                  <div className="bg-[#0d0e16] border border-white/[0.06] rounded-2xl p-4.5 space-y-4">
                                    <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 pr-24">
                                      <div>
                                        <h4 className="text-[13px] font-bold text-white/90">Repository Layout Analysis</h4>
                                        <p className="text-[10px] text-white/45 font-mono mt-0.5">📁 {activeRepo}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-white/40 uppercase tracking-wider font-semibold">Complexity:</span>
                                        <span className={cn(
                                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                          repoActionData.overall_complexity?.toLowerCase() === "high" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                          repoActionData.overall_complexity?.toLowerCase() === "medium" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                                          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        )}>
                                          {repoActionData.overall_complexity || "Medium"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Stack Summary Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                      {Object.entries(repoActionData.stack || {}).map(([key, value]) => (
                                        <div key={key} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-2">
                                          <span className="block text-[8px] uppercase tracking-wider text-white/30 font-semibold">{key}</span>
                                          <span className="block text-[10.5px] font-bold text-white/80 mt-0.5 truncate" title={value as string}>
                                            {value as string}
                                          </span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Architecture summary */}
                                    <div className="space-y-1">
                                      <span className="text-[9px] uppercase tracking-wider text-white/30 font-bold block">Architectural Design Pattern</span>
                                      <p className="text-xs text-white/70 leading-relaxed bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl">
                                        {repoActionData.architecture_summary}
                                      </p>
                                    </div>

                                    {/* File Structure & Key Files */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                      {/* File Tree */}
                                      <div className="space-y-1.5">
                                        <span className="text-[9px] uppercase tracking-wider text-white/30 font-bold block">Directory Layout</span>
                                        <div className="bg-[#07080f] border border-white/[0.04] rounded-xl p-3 font-mono text-[10px] text-white/60 space-y-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                                          {(repoActionData.structure || []).map((item: any) => (
                                            <div key={item.path} className="flex items-start gap-2">
                                              <span className="text-white/30">{item.type === "directory" ? "📁" : "📄"}</span>
                                              <div>
                                                <span className="text-white/80">{item.path}</span>
                                                <span className="text-white/40 block text-[9px] mt-0.5">{item.purpose}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Key Files Importance */}
                                      <div className="space-y-1.5">
                                        <span className="text-[9px] uppercase tracking-wider text-white/30 font-bold block">Key Code Entries</span>
                                        <div className="bg-[#07080f] border border-white/[0.04] rounded-xl p-3 text-[10.5px] text-white/60 space-y-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                                          {(repoActionData.key_files_summary || []).map((file: any) => (
                                            <div key={file.name} className="flex items-start justify-between gap-3 border-b border-white/[0.03] pb-2 last:border-b-0 last:pb-0">
                                              <div>
                                                <span className="font-mono text-white/85 block">{file.name}</span>
                                                <span className="text-white/40 text-[9px] mt-0.5 block">{file.purpose}</span>
                                              </div>
                                              <span className={cn(
                                                "px-1.5 py-0.5 rounded text-[8px] font-bold self-start",
                                                file.significance?.toLowerCase() === "high" ? "bg-red-500/10 text-red-400 border border-red-500/10" :
                                                "bg-indigo-500/10 text-indigo-400 border border-indigo-500/10"
                                              )}>
                                                {file.significance}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {repoAction === "readme" && (
                                  <div className="bg-[#0d0e16] border border-white/[0.06] rounded-2xl p-4.5 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.05] pb-3 gap-3 pr-24">
                                      <div>
                                        <h4 className="text-[13px] font-bold text-white/90">AI Generated README.md</h4>
                                        <p className="text-[10px] text-white/45 font-mono mt-0.5">📄 {activeRepo}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(repoActionData.readme_content);
                                            toast.success("README markdown copied to clipboard!");
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.18] bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.08] text-[9.5px] font-medium transition-all flex items-center gap-1"
                                        >
                                          📋 Copy Markdown
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const blob = new Blob([repoActionData.readme_content], { type: "text/plain" });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement("a");
                                            a.href = url;
                                            a.download = "README.md";
                                            a.click();
                                            URL.revokeObjectURL(url);
                                            toast.success("README.md download triggered!");
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[9.5px] font-semibold transition-all flex items-center gap-1"
                                        >
                                          ⬇️ Download
                                        </button>
                                      </div>
                                    </div>

                                    <div className="relative">
                                      <textarea
                                        readOnly
                                        value={repoActionData.readme_content}
                                        className="w-full h-80 px-3 py-2.5 bg-[#07080f] border border-white/[0.08] rounded-xl text-[11px] font-mono text-white/70 outline-none resize-none leading-relaxed"
                                        style={{ scrollbarWidth: "thin" }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {repoAction === "review" && (
                                  <div className="bg-[#0d0e16] border border-white/[0.06] rounded-2xl p-4.5 space-y-4">
                                    <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 pr-24">
                                      <div>
                                        <h4 className="text-[13px] font-bold text-white/90">Automated Code Review</h4>
                                        <p className="text-[10px] text-white/45 font-mono mt-0.5">🛠️ {activeRepo}</p>
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <div className="text-right">
                                          <span className="text-[8px] text-white/30 uppercase tracking-widest font-semibold block">Quality Score</span>
                                          <span className={cn(
                                            "text-xs font-black font-mono",
                                            repoActionData.overall_score >= 85 ? "text-emerald-400" :
                                            repoActionData.overall_score >= 70 ? "text-yellow-400" : "text-red-400"
                                          )}>
                                            {repoActionData.overall_score}/100
                                          </span>
                                        </div>
                                        <div className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs" style={{
                                          borderColor: repoActionData.overall_score >= 85 ? "#34d399" : repoActionData.overall_score >= 70 ? "#fbbf24" : "#f87171"
                                        }}>
                                          {repoActionData.overall_score >= 85 ? "A" : repoActionData.overall_score >= 70 ? "B" : "C"}
                                        </div>
                                      </div>
                                    </div>

                                    <p className="text-[11.5px] text-white/50 leading-relaxed italic bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl">
                                      💡 {repoActionData.summary}
                                    </p>

                                    {/* Review categories selector tabs */}
                                    <div className="flex flex-wrap gap-1 border-b border-white/[0.04] pb-2">
                                      {(["bugs", "performance", "security", "style"] as const).map(tab => {
                                        const items = repoActionData[tab] || [];
                                        return (
                                          <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setReviewTab(tab)}
                                            className={cn(
                                              "px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1.5",
                                              reviewTab === tab
                                                ? "bg-violet-600 text-white shadow-md shadow-violet-600/10"
                                                : "text-white/45 hover:text-white/75 hover:bg-white/[0.02]"
                                            )}
                                          >
                                            {tab === "bugs" ? "🐛 Bugs" : tab === "performance" ? "⚡ Perf" : tab === "security" ? "🔒 Security" : "🎨 Style"}
                                            <span className={cn(
                                              "text-[9px] px-1 rounded font-bold font-mono",
                                              reviewTab === tab ? "bg-white/20 text-white" : "bg-white/[0.05] text-white/35"
                                            )}>
                                              {items.length}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Active Tab List */}
                                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                                      {(repoActionData[reviewTab] || []).map((item: any, idx: number) => (
                                        <div key={idx} className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-3.5 space-y-2">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-0.5">
                                              <h5 className="text-[11.5px] font-bold text-white/90">{item.title}</h5>
                                              {item.file_path && (
                                                <span className="font-mono text-[9px] text-white/30 block">
                                                  {item.file_path} {item.line_number ? `(Line ${item.line_number})` : ""}
                                                </span>
                                              )}
                                            </div>
                                            <span className={cn(
                                              "px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide",
                                              item.severity === "high" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                              item.severity === "medium" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                                              item.severity === "low" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                                              "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                            )}>
                                              {item.severity}
                                            </span>
                                          </div>

                                          <div className="text-[11px] text-white/60 space-y-1">
                                            <p><span className="font-semibold text-white/70">Issue:</span> {item.description}</p>
                                            <p><span className="font-semibold text-emerald-400 font-medium">Recommendation:</span> {item.suggestion}</p>
                                          </div>

                                          {/* Diff preview */}
                                          {item.code_before && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[9px] font-mono rounded-lg overflow-hidden border border-white/[0.04]">
                                              <div className="bg-red-950/15 p-2">
                                                <span className="text-[7px] uppercase tracking-widest text-red-400 font-bold block mb-1">Before</span>
                                                <pre className="text-red-300/85 whitespace-pre-wrap">{item.code_before}</pre>
                                              </div>
                                              <div className="bg-emerald-950/15 p-2 border-t md:border-t-0 md:border-l border-white/[0.04]">
                                                <span className="text-[7px] uppercase tracking-widest text-emerald-400 font-bold block mb-1">After</span>
                                                <pre className="text-emerald-300/85 whitespace-pre-wrap">{item.code_after}</pre>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}

                                      {(repoActionData[reviewTab] || []).length === 0 && (
                                        <p className="text-xs text-white/30 italic text-center py-6">
                                          No observations found in this category. Clean code verified!
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-white/[0.05] pt-5 mt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 rounded-xl text-xs text-white/40 hover:text-white/75 hover:bg-white/[0.04] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-semibold hover:shadow-lg hover:shadow-violet-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin rounded-full" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </motion.form>
          </div>

        </div>

      </div>
    </div>
  );
}
