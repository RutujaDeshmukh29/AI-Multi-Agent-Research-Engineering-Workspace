"use client";
// app/auth/login/page.tsx
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { 
  Brain, Search, Code, Compass, ShieldAlert, Lightbulb, 
  Mail, Lock, Eye, EyeOff, Sparkles, AlertCircle 
} from "lucide-react";

// ─── Agent config ───────────────────────────────────────────────────────────
const AGENTS = [
  { 
    id: "research",    
    label: "Research",    
    color: "#22d3ee", 
    glow: "rgba(34,211,238,0.35)",  
    x: 0.22, 
    y: 0.28,
    icon: Search,
    description: "Crawls external web documents and search indices to fetch relevant technical knowledge."
  },
  { 
    id: "planner",     
    label: "Planner",     
    color: "#a78bfa", 
    glow: "rgba(167,139,250,0.35)", 
    x: 0.50, 
    y: 0.18,
    icon: Compass,
    description: "Generates project phases, detailed milestones, roadmaps, and actionable developer checklists."
  },
  { 
    id: "engineering", 
    label: "Engineering", 
    color: "#f59e0b", 
    glow: "rgba(245,158,11,0.35)",  
    x: 0.78, 
    y: 0.28,
    icon: Code,
    description: "Generates high-performance scripts, drafts production backend APIs, and solves syntax logic."
  },
  { 
    id: "critic",      
    label: "Critic",      
    color: "#f87171", 
    glow: "rgba(248,113,113,0.35)", 
    x: 0.72, 
    y: 0.62,
    icon: ShieldAlert,
    description: "Reviews plans and code structures to flag security leaks, logic flaws, and performance gaps."
  },
  { 
    id: "innovation",  
    label: "Innovation",  
    color: "#c084fc", 
    glow: "rgba(192,132,252,0.35)", 
    x: 0.50, 
    y: 0.72,
    icon: Lightbulb,
    description: "Suggests novel product features, UX interactions, and creative alternative solutions."
  },
  { 
    id: "qa",          
    label: "QA",          
    color: "#34d399", 
    glow: "rgba(52,211,153,0.35)",  
    x: 0.28, 
    y: 0.62,
    icon: Brain,
    description: "Diagnoses stack trace logs, verifies API outputs, and generates automated integration tests."
  },
];

// Connections between agents (index pairs)
const CONNECTIONS = [
  { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
  { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 0 },
  { from: 0, to: 4 }, { from: 1, to: 3 }, { from: 2, to: 5 },
];

// ─── Particle background ─────────────────────────────────────────────────────
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 150 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; baseOpacity: number; opacity: number }[] = [];

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    // Spawn particles
    const particleCount = 70;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 1.6 + 0.4,
        baseOpacity: Math.random() * 0.25 + 0.05,
        opacity: 0,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mouse = mouseRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Interaction with mouse pointer
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        let displayOpacity = p.baseOpacity;

        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          p.x -= (dx / dist) * force * 0.8;
          p.y -= (dy / dist) * force * 0.8;
          displayOpacity = p.baseOpacity + force * 0.45;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${displayOpacity})`;
        ctx.fill();
        
        // Draw constellation lines between close particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const ldx = p.x - p2.x;
          const ldy = p.y - p2.y;
          const ldist = Math.sqrt(ldx * ldx + ldy * ldy);
          if (ldist < 80) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const lineOpacity = (1.0 - ldist / 80) * 0.07 * (displayOpacity / p.baseOpacity);
            ctx.strokeStyle = `rgba(167, 139, 250, ${lineOpacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
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
  x1, y1, x2, y2, delay, isHighlighted
}: { x1: number; y1: number; x2: number; y2: number; delay: number; isHighlighted: boolean }) {
  return (
    <line
      x1={`${x1 * 100}%`} y1={`${y1 * 100}%`}
      x2={`${x2 * 100}%`} y2={`${y2 * 100}%`}
      stroke={isHighlighted ? "url(#lineGlowGrad)" : "url(#lineGrad)"}
      strokeWidth={isHighlighted ? "1.6" : "0.8"}
      strokeOpacity={isHighlighted ? "0.65" : "0.25"}
      strokeDasharray={isHighlighted ? "6 4" : "4 6"}
      style={{
        animation: `dashFlow ${isHighlighted ? "1.5s" : "3.5s"} linear ${delay}s infinite`,
        transition: "stroke-width 0.3s, stroke-opacity 0.3s, stroke 0.3s"
      }}
    />
  );
}

// ─── Single agent node ────────────────────────────────────────────────────────
function AgentNode({ 
  agent, 
  index, 
  isHovered, 
  onHover, 
  onLeave 
}: { 
  agent: typeof AGENTS[0]; 
  index: number; 
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const IconComponent = agent.icon;
  return (
    <motion.div
      className="absolute flex flex-col items-center gap-2 -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 select-none"
      style={{ left: `${agent.x * 100}%`, top: `${agent.y * 100}%` }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: isHovered ? 1.12 : 1 }}
      transition={{ type: "spring", stiffness: 450, damping: 20 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Pulse ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 54, height: 54,
          border: `1px solid ${agent.color}`,
          boxShadow: `0 0 0 0 ${agent.glow}`,
          animation: `agentPulse 3s ease-out ${index * 0.5}s infinite`,
          opacity: isHovered ? 0.75 : 0.4,
        }}
      />
      {/* Node core */}
      <div
        className="relative w-11 h-11 rounded-2xl flex items-center justify-center z-10 transition-all duration-350"
        style={{
          background: isHovered 
            ? `linear-gradient(135deg, ${agent.color}35, ${agent.color}15)` 
            : `linear-gradient(135deg, ${agent.color}20, ${agent.color}08)`,
          border: isHovered ? `1px solid ${agent.color}` : `1px solid ${agent.color}45`,
          boxShadow: isHovered 
            ? `0 0 24px ${agent.glow}, inset 0 1px 0 ${agent.color}44`
            : `0 0 14px ${agent.glow}, inset 0 1px 0 ${agent.color}22`,
          color: agent.color,
        }}
      >
        <IconComponent className="w-5 h-5 transition-transform duration-300" style={{ transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'none' }} />
      </div>
      {/* Label */}
      <span
        className="text-[10px] font-semibold tracking-wide whitespace-nowrap z-10 transition-all duration-300"
        style={{ 
          color: isHovered ? "#ffffff" : `${agent.color}cc`,
          textShadow: isHovered ? `0 0 8px ${agent.color}` : 'none'
        }}
      >
        {agent.label}
      </span>
    </motion.div>
  );
}

// ─── Left panel – agent visualization ────────────────────────────────────────
function AgentVisualization() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center">
      <Particles />

      {/* Ambient glowing blobs */}
      <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full blur-[90px] opacity-[0.12] bg-violet-600 pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-1/4 right-1/3 w-56 h-56 rounded-full blur-[80px] opacity-[0.09] bg-cyan-400 pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

      {/* SVG flow lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0" />
            <stop offset="50%"  stopColor="#a78bfa" stopOpacity="1" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="30%"  stopColor="#a78bfa" stopOpacity="1" />
            <stop offset="70%"  stopColor="#c084fc" stopOpacity="1" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
          </linearGradient>
        </defs>
        {CONNECTIONS.map((c, i) => {
          const isHighlighted = hoveredIndex === c.from || hoveredIndex === c.to;
          return (
            <FlowLine
              key={i}
              x1={AGENTS[c.from].x} y1={AGENTS[c.from].y}
              x2={AGENTS[c.to].x} y2={AGENTS[c.to].y}
              delay={i * 0.3}
              isHighlighted={isHighlighted}
            />
          );
        })}
      </svg>

      {/* Agent nodes */}
      <div className="absolute inset-0">
        {AGENTS.map((agent, i) => (
          <AgentNode 
            key={agent.id} 
            agent={agent} 
            index={i} 
            isHovered={hoveredIndex === i}
            onHover={() => setHoveredIndex(i)}
            onLeave={() => setHoveredIndex(null)}
          />
        ))}
      </div>

      {/* Dynamic Agent Info Panel */}
      <div className="absolute bottom-16 left-8 right-8 h-20 pointer-events-none flex items-center justify-center">
        <AnimatePresence mode="wait">
          {hoveredIndex !== null ? (
            <motion.div
              key={hoveredIndex}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="px-5 py-3 rounded-2xl border border-white/[0.08] backdrop-blur-xl bg-[#080911]/60 text-center max-w-sm"
              style={{
                boxShadow: `0 12px 35px rgba(0, 0, 0, 0.5), 0 0 20px ${AGENTS[hoveredIndex].glow}`,
              }}
            >
              <h4 className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: AGENTS[hoveredIndex].color }}>
                {AGENTS[hoveredIndex].label} Agent
              </h4>
              <p className="text-[10.5px] text-white/55 leading-relaxed">
                {AGENTS[hoveredIndex].description}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/20 mb-1">
                Multi-Agent Intelligence Network
              </p>
              <p className="text-[10px] text-white/12 tracking-wider">
                Hover over any node to inspect agent specializations
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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

  // 3D Tilt state
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current.getBoundingClientRect();
    const x = e.clientX - card.left - card.width / 2;
    const y = e.clientY - card.top - card.height / 2;
    
    // Smooth tilt angles
    const rX = -(y / (card.height / 2)) * 6;
    const rY = (x / (card.width / 2)) * 6;
    setTilt({ x: rX, y: rY });
  };

  const handleCardMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

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
      <style>{`
        @keyframes agentPulse {
          0%   { transform: scale(1);   opacity: 0.55; }
          60%  { transform: scale(1.95); opacity: 0;   }
          100% { transform: scale(1.95); opacity: 0;   }
        }
        @keyframes dashFlow {
          from { stroke-dashoffset: 0;   }
          to   { stroke-dashoffset: -40; }
        }
      `}</style>

      <div className="min-h-screen bg-[#040408] flex overflow-hidden">

        {/* ── LEFT: Agent Visualisation (60% width) ────────────────────── */}
        <div className="hidden lg:flex flex-col w-[60%] relative border-r border-white/[0.04]">
          <AgentVisualization />

          {/* Bottom branding strip */}
          <motion.div
            className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400/50" />
            <span className="text-[10px] text-white/18 tracking-widest uppercase font-semibold">
              Conductor Node v1.0.0
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
          </motion.div>
        </div>

        {/* ── RIGHT: Login Panel (40% width) ─────────────────────────── */}
        <div className="flex-1 lg:w-[40%] flex items-center justify-center p-6 relative">

          {/* Glowing backdrops */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[370px] relative z-10"
          >

            {/* Title / Greeting */}
            <div className="mb-7 select-none">
              <div className="inline-flex w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 items-center justify-center text-lg font-bold mb-4.5 shadow-lg shadow-violet-500/20 text-white animate-pulse">
                ✦
              </div>
              <h1 className="text-[25px] font-bold text-white/90 tracking-tight leading-tight">
                Nexus Authentication
              </h1>
              <p className="text-[12.5px] text-white/35 mt-1.5">
                Authenticate to connect with your AI collaborative cell.
              </p>
            </div>

            {/* ── Glass card container with 3D Tilt ─────────────────────────── */}
            <motion.div
              ref={cardRef}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              animate={{ rotateX: tilt.x, rotateY: tilt.y }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              style={{ 
                transformStyle: "preserve-3d",
                background: "rgba(255,255,255,0.02)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 28px 65px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)"
              }}
              className="rounded-3xl p-6 relative overflow-hidden"
            >
              {/* Outer border edge highlight */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Form errors */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    className="bg-red-500/8 border border-red-500/15 text-red-400/90 text-[11.5px] rounded-xl px-3.5 py-2.5 mb-4.5 leading-relaxed flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Email field */}
                <div className="relative group/field">
                  <label className="text-[10px] text-white/30 font-bold uppercase tracking-widest block mb-1.5 transition-colors group-focus-within/field:text-violet-400">
                    Network ID (Email)
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-4 w-4 h-4 text-white/20 transition-colors group-focus-within/field:text-violet-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="identity@workspace.net"
                      autoComplete="email"
                      className="w-full rounded-xl pl-11 pr-4 py-2.5 text-[13px] text-white/80 placeholder-white/18 outline-none transition-all duration-300"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                      onFocus={e => {
                        e.currentTarget.style.border = "1px solid rgba(139,92,246,0.45)";
                        e.currentTarget.style.background = "rgba(139,92,246,0.04)";
                        e.currentTarget.style.boxShadow = "0 0 15px rgba(139,92,246,0.12)";
                      }}
                      onBlur={e => {
                        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)";
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="relative group/field">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-white/30 font-bold uppercase tracking-widest transition-colors group-focus-within/field:text-violet-400">
                      Security Phrase
                    </label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-[10.5px] text-violet-400/60 hover:text-violet-300 transition-colors"
                    >
                      Recover Code
                    </Link>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 w-4 h-4 text-white/20 transition-colors group-focus-within/field:text-violet-400 pointer-events-none" />
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full rounded-xl pl-11 pr-10 py-2.5 text-[13px] text-white/80 placeholder-white/18 outline-none transition-all duration-300"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                      onFocus={e => {
                        e.currentTarget.style.border = "1px solid rgba(139,92,246,0.45)";
                        e.currentTarget.style.background = "rgba(139,92,246,0.04)";
                        e.currentTarget.style.boxShadow = "0 0 15px rgba(139,92,246,0.12)";
                      }}
                      onBlur={e => {
                        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)";
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      className="absolute right-3.5 text-white/20 hover:text-white/45 transition-colors"
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember state */}
                <label className="flex items-center gap-2.5 cursor-pointer group/opt select-none w-max">
                  <div
                    onClick={() => setRemember(r => !r)}
                    className="w-4 h-4 rounded-[6px] flex items-center justify-center transition-all duration-200 flex-shrink-0"
                    style={{
                      background: remember ? "rgba(139,92,246,0.7)" : "rgba(255,255,255,0.02)",
                      border: remember ? "1px solid rgba(139,92,246,0.7)" : "1px solid rgba(255,255,255,0.1)"
                    }}
                  >
                    {remember && (
                      <svg width="8" height="6" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.2 5.5L8 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[11.5px] text-white/30 group-hover/opt:text-white/50 transition-colors">
                    Preserve connection
                  </span>
                </label>

                {/* Submit button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  className="w-full mt-2 py-2.5 text-white rounded-xl text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/10 border border-violet-500/25 transition-all duration-300"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "linear-gradient(135deg, #8b5cf6, #6d28d9)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "linear-gradient(135deg, #7c3aed, #5b21b6)";
                  }}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Establishing Link...
                    </>
                  ) : (
                    <>
                      <span>Establish Connection</span>
                      <Sparkles className="w-3.5 h-3.5" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Decorative separator */}
              <div className="flex items-center gap-3 my-5.5 select-none">
                <div className="flex-1 h-px bg-white/[0.04]" />
                <span className="text-[10px] text-white/18 font-bold uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-white/[0.04]" />
              </div>

              {/* OAuth flow button list */}
              <div className="space-y-2.5">
                {[
                  {
                    label: "Verify via GitHub",
                    icon: (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    ),
                  },
                  {
                    label: "Verify via Google",
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 24 24">
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
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-[12px] font-medium text-white/50 hover:text-white/75 transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.02)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.05)";
                    }}
                  >
                    <span className="text-white/50">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Sign up toggle links */}
              <p className="text-center text-[12px] text-white/20 mt-5 select-none">
                No active node?{" "}
                <Link
                  href="/auth/signup"
                  className="text-violet-400/75 hover:text-violet-300 font-bold transition-colors"
                >
                  Create Identity →
                </Link>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
}