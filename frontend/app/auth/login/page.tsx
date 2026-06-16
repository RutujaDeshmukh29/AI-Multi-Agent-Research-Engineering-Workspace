"use client";
// app/auth/login/page.tsx
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

// ─── Agent config ───────────────────────────────────────────────────────────
const AGENTS = [
  { id: "research",    label: "Research",    color: "#22d3ee", glow: "rgba(34,211,238,0.35)",  x: 0.22, y: 0.28 },
  { id: "planner",     label: "Planner",     color: "#a78bfa", glow: "rgba(167,139,250,0.35)", x: 0.50, y: 0.18 },
  { id: "engineering", label: "Engineering", color: "#f59e0b", glow: "rgba(245,158,11,0.35)",  x: 0.78, y: 0.28 },
  { id: "critic",      label: "Critic",      color: "#f87171", glow: "rgba(248,113,113,0.35)", x: 0.72, y: 0.62 },
  { id: "innovation",  label: "Innovation",  color: "#c084fc", glow: "rgba(192,132,252,0.35)", x: 0.50, y: 0.72 },
  { id: "qa",          label: "QA",          color: "#34d399", glow: "rgba(52,211,153,0.35)",  x: 0.28, y: 0.62 },
];

// Connections between agents (index pairs)
const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
  [0, 4], [1, 3], [2, 5],
];

// ─── Particle background ─────────────────────────────────────────────────────
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = [];

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Spawn particles
    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 1.5 + 0.4,
        opacity: Math.random() * 0.35 + 0.05,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${p.opacity})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

// ─── Animated flow line between two agents ───────────────────────────────────
function FlowLine({
  x1, y1, x2, y2, delay,
}: { x1: number; y1: number; x2: number; y2: number; delay: number }) {
  return (
    <line
      x1={`${x1 * 100}%`} y1={`${y1 * 100}%`}
      x2={`${x2 * 100}%`} y2={`${y2 * 100}%`}
      stroke="url(#lineGrad)"
      strokeWidth="0.8"
      strokeOpacity="0.3"
      strokeDasharray="4 6"
      style={{
        animation: `dashFlow 3s linear ${delay}s infinite`,
      }}
    />
  );
}

// ─── Single agent node ────────────────────────────────────────────────────────
function AgentNode({ agent, index }: { agent: typeof AGENTS[0]; index: number }) {
  return (
    <motion.div
      className="absolute flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${agent.x * 100}%`, top: `${agent.y * 100}%` }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 + index * 0.12, duration: 0.5, ease: "easeOut" }}
    >
      {/* Pulse ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: 52, height: 52,
          border: `1px solid ${agent.color}`,
          boxShadow: `0 0 0 0 ${agent.glow}`,
          animation: `agentPulse 3s ease-out ${index * 0.5}s infinite`,
          opacity: 0.5,
        }}
      />
      {/* Node core */}
      <div
        className="relative w-11 h-11 rounded-2xl flex items-center justify-center text-[10px] font-bold tracking-widest uppercase z-10"
        style={{
          background: `linear-gradient(135deg, ${agent.color}22, ${agent.color}11)`,
          border: `1px solid ${agent.color}55`,
          boxShadow: `0 0 18px ${agent.glow}, inset 0 1px 0 ${agent.color}33`,
          color: agent.color,
        }}
      >
        {agent.label.slice(0, 2).toUpperCase()}
      </div>
      {/* Label */}
      <span
        className="text-[10px] font-medium tracking-wide whitespace-nowrap z-10"
        style={{ color: `${agent.color}cc` }}
      >
        {agent.label}
      </span>
    </motion.div>
  );
}

// ─── Left panel – agent visualization ────────────────────────────────────────
function AgentVisualization() {
  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center">
      <Particles />

      {/* Ambient blobs */}
      <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full blur-[80px] opacity-10 bg-violet-500 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-48 h-48 rounded-full blur-[70px] opacity-8 bg-cyan-400 pointer-events-none" />

      {/* SVG flow lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0" />
            <stop offset="50%"  stopColor="#a78bfa" stopOpacity="1" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {CONNECTIONS.map(([a, b], i) => (
          <FlowLine
            key={i}
            x1={AGENTS[a].x} y1={AGENTS[a].y}
            x2={AGENTS[b].x} y2={AGENTS[b].y}
            delay={i * 0.4}
          />
        ))}
      </svg>

      {/* Agent nodes */}
      <div className="absolute inset-0">
        {AGENTS.map((agent, i) => (
          <AgentNode key={agent.id} agent={agent} index={i} />
        ))}
      </div>

      {/* Center label */}
      <motion.div
        className="relative z-10 text-center pointer-events-none"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.6 }}
      >
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/20 mb-1">
          Multi-Agent Workspace
        </p>
        <p className="text-[10px] text-white/12 tracking-wider">
          6 specialized agents · always on
        </p>
      </motion.div>
    </div>
  );
}

// ─── Main login page ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password });
    } catch {
      setError("Invalid email or password. Check your credentials and try again.");
    }
  }

  return (
    <>
      {/* Global keyframe animations */}
      <style>{`
        @keyframes agentPulse {
          0%   { transform: scale(1);   opacity: 0.5; }
          60%  { transform: scale(1.9); opacity: 0;   }
          100% { transform: scale(1.9); opacity: 0;   }
        }
        @keyframes dashFlow {
          from { stroke-dashoffset: 0;   }
          to   { stroke-dashoffset: -40; }
        }
      `}</style>

      <div className="min-h-screen bg-[#07080f] flex overflow-hidden">

        {/* ── LEFT: agent viz (60%) ────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col w-[60%] relative border-r border-white/[0.05]">
          <AgentVisualization />

          {/* Bottom branding strip */}
          <motion.div
            className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6 }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400/50" />
            <span className="text-[11px] text-white/18 tracking-widest uppercase font-medium">
              AI Multi-Agent Workspace
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
          </motion.div>
        </div>

        {/* ── RIGHT: login panel (40%) ─────────────────────────────────── */}
        <div className="flex-1 lg:w-[40%] flex items-center justify-center p-6 relative">

          {/* Subtle right-side glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] bg-violet-700/6 rounded-full blur-[100px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="w-full max-w-[360px] relative"
          >

            {/* Logo + heading */}
            <div className="mb-8">
              <div className="inline-flex w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 items-center justify-center text-lg font-bold mb-5 shadow-lg shadow-violet-500/25">
                ✦
              </div>
              <h1 className="text-[26px] font-bold text-white/88 tracking-tight leading-tight">
                Welcome back
              </h1>
              <p className="text-[13px] text-white/35 mt-1.5">
                Continue building with your AI team
              </p>
            </div>

            {/* ── Glass card ───────────────────────────────────────────── */}
            <div
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.035)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* Card inner top shimmer */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/8 border border-red-500/20 text-red-400/90 text-[12px] rounded-xl px-4 py-3 mb-5 leading-relaxed"
                >
                  {error}
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="text-[10.5px] text-white/38 font-semibold uppercase tracking-widest block mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white/80 placeholder-white/18 outline-none transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                    onFocus={e => {
                      e.currentTarget.style.border = "1px solid rgba(139,92,246,0.5)";
                      e.currentTarget.style.background = "rgba(139,92,246,0.05)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)";
                    }}
                    onBlur={e => {
                      e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10.5px] text-white/38 font-semibold uppercase tracking-widest">
                      Password
                    </label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-[11px] text-violet-400/70 hover:text-violet-300 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full rounded-xl px-4 py-2.5 pr-10 text-[13px] text-white/80 placeholder-white/18 outline-none transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                      onFocus={e => {
                        e.currentTarget.style.border = "1px solid rgba(139,92,246,0.5)";
                        e.currentTarget.style.background = "rgba(139,92,246,0.05)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)";
                      }}
                      onBlur={e => {
                        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors text-[11px] select-none"
                      tabIndex={-1}
                    >
                      {showPass ? "hide" : "show"}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    onClick={() => setRemember(r => !r)}
                    className="w-4 h-4 rounded-[5px] flex items-center justify-center transition-all duration-150 flex-shrink-0"
                    style={{
                      background: remember ? "rgba(139,92,246,0.8)" : "rgba(255,255,255,0.04)",
                      border: remember ? "1px solid rgba(139,92,246,0.8)" : "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    {remember && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.2 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[12px] text-white/35 group-hover:text-white/50 transition-colors select-none">
                    Remember me
                  </span>
                </label>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="w-full mt-1 py-2.5 text-white rounded-xl text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    boxShadow: "0 4px 20px rgba(109,40,217,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "linear-gradient(135deg, #8b5cf6, #7c3aed)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "linear-gradient(135deg, #7c3aed, #6d28d9)";
                  }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Signing in…
                    </span>
                  ) : (
                    "Sign in →"
                  )}
                </motion.button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[11px] text-white/20 font-medium">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* OAuth buttons */}
              <div className="space-y-2.5">
                {[
                  {
                    label: "Continue with GitHub",
                    icon: (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    ),
                  },
                  {
                    label: "Continue with Google",
                    icon: (
                      <svg width="15" height="15" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    ),
                  },
                ].map(({ label, icon }) => (
                  <button
                    key={label}
                    type="button"
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-[12.5px] font-medium text-white/55 hover:text-white/75 transition-all duration-150"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                    }}
                  >
                    <span className="text-white/60">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              {/* Sign-up link */}
              <p className="text-center text-[12px] text-white/25 mt-5">
                No account?{" "}
                <Link
                  href="/auth/signup"
                  className="text-violet-400/80 hover:text-violet-300 font-medium transition-colors"
                >
                  Create one →
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}