"use client";
// app/auth/signup/page.tsx
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  User as UserIcon, Mail, Lock, Eye, EyeOff, Sparkles, 
  AlertCircle, ShieldCheck, CheckCircle2, ChevronRight 
} from "lucide-react";

// ─── Feature highlights shown on the left panel ──────────────────────────────
const FEATURES = [
  {
    icon: "⬡",
    title: "6 Specialized Agents",
    desc: "Research, Plan, Engineer, Critique, Innovate, QA — all working in parallel on your goals.",
    color: "#a78bfa",
  },
  {
    icon: "⚡",
    title: "Real-time Streaming",
    desc: "Watch agents think live. SSE-powered responses streamed token-by-token as they reason.",
    color: "#22d3ee",
  },
  {
    icon: "🧠",
    title: "Persistent Memory",
    desc: "pgvector semantic memory means your workspace learns you. Context carries across sessions.",
    color: "#34d399",
  },
  {
    icon: "🎙",
    title: "Voice I/O",
    desc: "Talk to your agents. Hear them respond. Hands-free multi-agent collaboration.",
    color: "#f59e0b",
  },
];

// ─── Live agent activity ticker ───────────────────────────────────────────────
const TICKER_ITEMS = [
  { agent: "Research", color: "#22d3ee",  msg: "Scraped 12 papers on LangGraph orchestration patterns…" },
  { agent: "Planner",  color: "#a78bfa",  msg: "Breaking goal into 7 executable sub-tasks…" },
  { agent: "Engineer", color: "#f59e0b",  msg: "Generated FastAPI endpoint with pgvector integration…" },
  { agent: "Critic",   color: "#f87171",  msg: "Found edge case in auth middleware — flagging for review…" },
  { agent: "Innovate", color: "#c084fc",  msg: "Proposing alternative: WebSocket instead of SSE for lower latency…" },
  { agent: "QA",       color: "#34d399",  msg: "All 14 unit tests passing. Coverage: 91%…" },
  { agent: "Research", color: "#22d3ee",  msg: "Cross-referencing Anthropic docs for tool_use schema…" },
  { agent: "Planner",  color: "#a78bfa",  msg: "Roadmap updated — Phase 2 estimated 3 days…" },
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

// ─── Floating label input with Lucide icons ─────────────────────────────────
function FloatingInput({
  id, label, type = "text", value, onChange, placeholder, autoComplete, required, icon: Icon
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  autoComplete?: string; required?: boolean; icon?: any;
}) {
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;

  return (
    <div className="relative group/field">
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        placeholder={focused ? (placeholder ?? "") : ""}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`peer w-full rounded-xl ${Icon ? 'pl-11' : 'px-4'} pt-5 pb-2 text-[13px] text-white/85 outline-none transition-all duration-200 placeholder-white/20`}
        style={{
          background: focused ? "rgba(139,92,246,0.05)" : "rgba(255,255,255,0.025)",
          border: focused
            ? "1px solid rgba(139,92,246,0.45)"
            : filled
            ? "1px solid rgba(255,255,255,0.12)"
            : "1px solid rgba(255,255,255,0.06)",
          boxShadow: focused ? "0 0 15px rgba(139,92,246,0.12)" : "none",
        }}
      />
      {Icon && (
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 transition-colors peer-focus:text-violet-400 pointer-events-none" style={{ marginTop: '4px' }} />
      )}
      <label
        htmlFor={id}
        className="pointer-events-none absolute transition-all duration-200 font-semibold select-none"
        style={{
          left:     Icon ? "44px" : "16px",
          top:      focused || filled ? "6px"   : "50%",
          transform: focused || filled ? "translateY(0)" : "translateY(-50%)",
          fontSize:  focused || filled ? "8.5px"  : "12px",
          color:     focused ? "rgba(167,139,250,0.9)" : "rgba(255,255,255,0.3)",
          letterSpacing: focused || filled ? "0.12em" : "0.02em",
          textTransform: "uppercase",
          marginTop: focused || filled ? "0px" : "-2px"
        }}
      >
        {label}
      </label>
    </div>
  );
}

// ─── Live ticker row ──────────────────────────────────────────────────────────
function LiveTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % TICKER_ITEMS.length);
        setVisible(true);
      }, 400);
    }, 2800);
    return () => clearInterval(cycle);
  }, []);

  const item = TICKER_ITEMS[idx];

  return (
    <div
      className="flex items-start gap-3 rounded-xl p-3.5 transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(4px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
    >
      <div
        className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }}
      />
      <div className="min-w-0">
        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: item.color }}>
          {item.agent}
        </span>
        <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed truncate">{item.msg}</p>
      </div>
      <span className="flex-shrink-0 text-[9px] text-white/18 mt-0.5 font-mono">LIVE</span>
    </div>
  );
}

// Password rules evaluator configuration
const PASSWORD_REQUIREMENTS = [
  { label: "8+ characters", test: (pw: string) => pw.length >= 8 },
  { label: "Uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
  { label: "Lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
  { label: "Number", test: (pw: string) => /[0-9]/.test(pw) },
  { label: "Special Character", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

// ─── Main signup page ─────────────────────────────────────────────────────────
export default function SignupPage() {
  const { signup, isLoading } = useAuth();
  
  // Advanced Registration fields
  const [firstName, setFirstName]             = useState("");
  const [lastName, setLastName]               = useState("");
  const [username, setUsername]               = useState("");
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPass, setShowPass] = useState(false);
  const [agree, setAgree]       = useState(false);
  const [error, setError]       = useState("");
  const [step, setStep]         = useState<"info" | "verify" | "done">("info");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");

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

    // Verify all requirements
    const allMet = PASSWORD_REQUIREMENTS.every(req => req.test(password));
    if (!allMet) {
      setError("Please satisfy all password security requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!agree) {
      setError("Please accept the terms to continue.");
      return;
    }

    try {
      const fullName = `${firstName} ${lastName}`.trim();
      await signup({ name: fullName, email, password });
      
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      setStep("verify");
      toast.info(`✉️ [Trust Security] Verification OTP sent: ${otp}`, { duration: 10000 });
    } catch (err: unknown) {
      const axiosErr = err as any;
      let message = "Could not create account.";
      if (axiosErr?.response?.data?.detail) message = axiosErr.response.data.detail;
      else if (axiosErr?.code === "ERR_NETWORK") message = "Backend unreachable. Make sure it's running on :8000";
      else if (axiosErr?.message) message = axiosErr.message;
      setError(message);
    }
  }

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp.trim() === generatedOtp) {
      const verifiedEmailsKey = "nexus_verified_emails";
      let list: string[] = [];
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(verifiedEmailsKey);
        if (stored) {
          try { list = JSON.parse(stored); } catch (ex) {}
        }
        const emailLower = email.toLowerCase().trim();
        if (!list.includes(emailLower)) {
          list.push(emailLower);
          localStorage.setItem(verifiedEmailsKey, JSON.stringify(list));
        }
      }
      
      toast.success("Email verified successfully!");
      setStep("done");
      setError("");
    } else {
      setError("Invalid OTP verification code. Please check the code and try again.");
    }
  };

  const handleResendOtp = () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setError("");
    toast.success(`✉️ [Trust Security] New OTP code sent: ${newOtp}`, { duration: 10000 });
  };

  return (
    <>
      <style>{`
        @keyframes agentPulse {
          0%   { transform: scale(1);   opacity: 0.55; }
          70%  { transform: scale(2.4); opacity: 0;    }
          100% { transform: scale(2.4); opacity: 0;    }
        }
        @keyframes orbitSpin {
          from { transform: rotate(0deg) translateX(38px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(38px) rotate(-360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .shimmer-btn {
          background: linear-gradient(90deg, #7c3aed 0%, #8b5cf6 40%, #a78bfa 50%, #8b5cf6 60%, #7c3aed 100%);
          background-size: 400px 100%;
          animation: shimmer 2.5s linear infinite;
        }
      `}</style>

      <div className="min-h-screen bg-[#040408] flex overflow-hidden">

        {/* ══ LEFT PANEL (50%) ══════════════════════════════════════════════ */}
        <div className="hidden lg:flex flex-col w-[50%] relative border-r border-white/[0.04] overflow-hidden">
          <Particles />

          {/* Ambient blobs */}
          <div className="absolute top-[20%] left-[20%] w-72 h-72 rounded-full blur-[90px] opacity-[0.09] bg-violet-600 pointer-events-none" />
          <div className="absolute bottom-[15%] right-[15%] w-56 h-56 rounded-full blur-[70px] opacity-[0.07] bg-cyan-400 pointer-events-none" />
          <div className="absolute top-[60%] left-[40%] w-40 h-40 rounded-full blur-[60px] opacity-[0.05] bg-emerald-400 pointer-events-none" />

          <div className="relative flex flex-col h-full px-12 py-10 select-none">

            {/* Logo */}
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-violet-500/20"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                }}
              >
                ✦
              </div>
              <span className="text-[13px] font-semibold text-white/55 tracking-wide">AI Multi-Agent Workspace</span>
            </motion.div>

            {/* Hero headline */}
            <motion.div
              className="mt-10 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.55 }}
            >
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-violet-400/60 mb-3">
                Your AI engineering team awaits
              </p>
              <h2 className="text-[30px] font-bold text-white/88 leading-[1.2] tracking-tight">
                Build faster with<br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(90deg, #a78bfa, #22d3ee)" }}
                >
                  six agents in sync
                </span>
              </h2>
              <p className="mt-4 text-[13px] text-white/35 leading-relaxed max-w-xs">
                A full-stack AI workspace where specialized agents collaborate, remember context, and ship work.
              </p>
            </motion.div>

            {/* Stats row */}
            <motion.div
              className="grid grid-cols-3 gap-3 mb-8"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {[
                { val: "6",    unit: "Agents",   color: "#a78bfa" },
                { val: "∞",   unit: "Memory",   color: "#22d3ee" },
                { val: "SSE",  unit: "Streaming", color: "#34d399" },
              ].map(({ val, unit, color }) => (
                <div
                  key={unit}
                  className="rounded-xl px-4 py-3 flex flex-col"
                    style={{
                      background: `${color}08`,
                      border: `1px solid ${color}20`,
                    }}
                >
                  <span className="text-[20px] font-bold" style={{ color }}>{val}</span>
                  <span className="text-[10px] text-white/35 font-medium tracking-wide mt-0.5">{unit}</span>
                </div>
              ))}
            </motion.div>

            {/* Feature list */}
            <div className="space-y-3.5 mb-8">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  className="flex items-start gap-3.5 group"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.09, duration: 0.45 }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                    style={{
                      background: `${f.color}12`,
                      border: `1px solid ${f.color}28`,
                      boxShadow: `0 0 14px ${f.color}18`,
                    }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-white/70">{f.title}</p>
                    <p className="text-[11.5px] text-white/30 leading-relaxed mt-0.5">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Live agent ticker */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/18 mb-2">
                ● Live agent activity
              </p>
              <LiveTicker />
            </motion.div>

            {/* Bottom branding */}
            <div className="mt-auto pt-4 flex items-center justify-between">
              <p className="text-[10px] text-white/15 tracking-widest uppercase">
                Built with LangGraph · Groq · pgvector
              </p>
              <div className="flex gap-1.5">
                {["#22d3ee","#a78bfa","#34d399","#f59e0b","#f87171","#c084fc"].map(c => (
                  <div key={c} className="w-1.5 h-1.5 rounded-full" style={{ background: c, opacity: 0.5 }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══ RIGHT PANEL (50% width) ════════════════════════════════════════ */}
        <div className="flex-1 lg:w-[50%] flex items-center justify-center p-6 relative overflow-hidden">

          {/* Right side background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-700/5 rounded-full blur-[100px] pointer-events-none" />

          <AnimatePresence mode="wait">
            {step === "done" ? (
              /* ── SUCCESS STATE ── */
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-[360px] text-center"
              >
                <motion.div
                  className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-3xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))",
                    border: "1px solid rgba(52,211,153,0.3)",
                    boxShadow: "0 0 40px rgba(52,211,153,0.15)",
                  }}
                  animate={{ rotate: [0, -8, 8, 0] }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  ✓
                </motion.div>
                <h2 className="text-[23px] font-bold text-white/88 mb-2">Workspace Ready!</h2>
                <p className="text-[13px] text-white/35 leading-relaxed mb-8">
                  Your node has been registered and verified successfully. Six agents are standing by.
                </p>
                <Link
                  href="/auth/login"
                  className="block w-full py-3 rounded-xl text-[13px] font-semibold text-white text-center shadow-lg shadow-violet-500/20 border border-violet-500/25 transition-all duration-300"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                  }}
                >
                  Establish Link →
                </Link>
              </motion.div>
            ) : step === "verify" ? (
              /* ── VERIFY EMAIL OTP STATE ── */
              <motion.div
                key="verify"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-[370px]"
              >
                {/* Heading */}
                <div className="mb-6 select-none">
                  <div className="inline-flex w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 items-center justify-center text-md mb-4 shadow-lg shadow-violet-500/20 text-white animate-pulse">
                    ✉️
                  </div>
                  <h1 className="text-[24px] font-bold text-white/90 tracking-tight leading-tight">
                    Verify Email Address
                  </h1>
                  <p className="text-[12.5px] text-white/35 mt-1.5 leading-relaxed">
                    A 6-digit verification code has been generated for <strong className="text-white/60">{email}</strong>.
                  </p>
                </div>

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
                  className="rounded-3xl p-6 space-y-4"
                >
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-500/8 border border-red-500/15 text-red-400/90 text-[11.5px] rounded-xl px-3.5 py-2.5 leading-relaxed flex items-start gap-2"
                      >
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/30 font-bold uppercase tracking-widest block mb-1">
                        Enter 6-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={enteredOtp}
                        onChange={e => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                        className="w-full text-center rounded-xl py-3 text-[22px] font-bold font-mono tracking-[0.3em] text-white bg-white/[0.03] border border-white/[0.08] focus:border-violet-500/40 outline-none transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 text-white rounded-xl text-[13px] font-semibold shadow-md shadow-violet-500/10 border border-violet-500/25 transition-all duration-300 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
                    >
                      Confirm Verification Code
                    </button>
                  </form>

                  <div className="flex items-center justify-between text-xs text-white/30 pt-2 border-t border-white/[0.04]">
                    <span>Didn't receive code?</span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-violet-400 hover:text-violet-300 font-bold transition-all"
                    >
                      Resend OTP
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              /* ── SIGNUP FORM ── */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-[380px] relative z-10"
              >
                {/* Heading */}
                <div className="mb-6 select-none">
                  <div
                    className="inline-flex w-10 h-10 rounded-2xl items-center justify-center text-lg font-bold text-white mb-4.5 shadow-lg shadow-violet-500/20"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                    }}
                  >
                    ✦
                  </div>
                  <h1 className="text-[24px] font-bold text-white/90 tracking-tight leading-tight">
                    Nexus Registration
                  </h1>
                  <p className="text-[12.5px] text-white/35 mt-1.5">
                    Create your profile to delegate and orchestrate multi-agent cells.
                  </p>
                </div>

                {/* ── Glass card container with 3D Tilt ── */}
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
                  className="rounded-3xl p-5 relative overflow-hidden"
                >
                  {/* Top shimmer line */}
                  <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                  {/* Form Errors */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        key="err"
                        initial={{ opacity: 0, height: 0, y: -8 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -8 }}
                        className="bg-red-500/8 border border-red-500/15 text-red-400/90 text-[11.5px] rounded-xl px-3.5 py-2.5 mb-4 leading-relaxed flex items-start gap-2"
                      >
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    
                    {/* First & Last Name side-by-side */}
                    <div className="grid grid-cols-2 gap-3">
                      <FloatingInput
                        id="firstName" label="First Name" value={firstName} onChange={setFirstName}
                        placeholder="John" required icon={UserIcon}
                      />
                      <FloatingInput
                        id="lastName" label="Last Name" value={lastName} onChange={setLastName}
                        placeholder="Doe" required icon={UserIcon}
                      />
                    </div>

                    {/* Username */}
                    <FloatingInput
                      id="username" label="Username" value={username} onChange={setUsername}
                      placeholder="johndoe" required icon={UserIcon}
                    />

                    {/* Email */}
                    <FloatingInput
                      id="email" label="Email Address" type="email" value={email}
                      onChange={setEmail} placeholder="you@workspace.net"
                      autoComplete="email" required icon={Mail}
                    />

                    {/* Password */}
                    <div className="relative">
                      <FloatingInput
                        id="password" label="Password"
                        type={showPass ? "text" : "password"}
                        value={password} onChange={setPassword}
                        placeholder="••••••••"
                        autoComplete="new-password" required icon={Lock}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        tabIndex={-1}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/45 transition-colors"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Live Password Validation Checklist */}
                    {password.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5 p-3 rounded-xl bg-white/[0.01] border border-white/[0.04] text-[11px]"
                      >
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                          Security Requirements
                        </p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                          {PASSWORD_REQUIREMENTS.map((req, i) => {
                            const isMet = req.test(password);
                            return (
                              <div key={i} className="flex items-center gap-1.5 transition-all duration-300">
                                <span className={`font-bold text-[11px] ${isMet ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {isMet ? "✓" : "✕"}
                                </span>
                                <span className={isMet ? 'text-emerald-400/80 font-medium' : 'text-red-400/60'}>
                                  {req.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* Confirm Password */}
                    <div className="relative">
                      <FloatingInput
                        id="confirmPassword" label="Confirm Password"
                        type={showPass ? "text" : "password"}
                        value={confirmPassword} onChange={setConfirmPassword}
                        placeholder="••••••••"
                        autoComplete="new-password" required icon={Lock}
                      />
                    </div>

                    {/* Confirm Match Validation */}
                    {confirmPassword.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-[10.5px] pl-1 font-medium transition-colors"
                      >
                        {password === confirmPassword ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                          </span>
                        ) : (
                          <span className="text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                          </span>
                        )}
                      </motion.div>
                    )}

                    {/* Terms checkbox */}
                    <label className="flex items-start gap-2.5 cursor-pointer group/opt select-none pt-1">
                      <div
                        onClick={() => setAgree(a => !a)}
                        className="w-4 h-4 mt-0.5 rounded-[6px] flex items-center justify-center flex-shrink-0 transition-all duration-200"
                        style={{
                          background: agree ? "rgba(139,92,246,0.7)" : "rgba(255,255,255,0.02)",
                          border: agree ? "1px solid rgba(139,92,246,0.7)" : "1px solid rgba(255,255,255,0.1)"
                        }}
                      >
                        {agree && (
                          <svg width="8" height="6" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.2 5.5L8 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-[11px] leading-relaxed text-white/30 group-hover/opt:text-white/50 transition-colors">
                        I agree to the{" "}
                        <span className="text-violet-400/80 hover:text-violet-300 transition-colors">Terms of Service</span>
                        {" "}and{" "}
                        <span className="text-violet-400/80 hover:text-violet-300 transition-colors">Privacy Policy</span>
                      </span>
                    </label>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={{ scale: isLoading ? 1 : 1.015 }}
                      whileTap={{ scale: isLoading ? 1 : 0.985 }}
                      className="w-full mt-2 py-2.5 text-white rounded-xl text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/10 border border-violet-500/25 transition-all duration-300"
                      style={{
                        background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                      }}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                          Establishing Profile...
                        </>
                      ) : (
                        <>
                          <span>Register Profile</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </form>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-5.5 select-none">
                    <div className="flex-1 h-px bg-white/[0.04]" />
                    <span className="text-[10px] text-white/18 font-bold uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>

                  {/* OAuth */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      {
                        label: "GitHub",
                        icon: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
                          </svg>
                        ),
                      },
                      {
                        label: "Google",
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

                  {/* Sign in link */}
                  <p className="text-center text-[12px] text-white/20 mt-5 select-none" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Already have a workspace?{" "}
                    <Link href="/auth/login" className="font-bold transition-colors" style={{ color: "rgba(167,139,250,0.85)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "rgba(196,181,253,1)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(167,139,250,0.85)")}
                    >
                      Sign in →
                    </Link>
                  </p>
                </motion.div>

                {/* Social proof */}
                <motion.div
                  className="mt-5 flex items-center justify-center gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="flex -space-x-2">
                    {["#7c3aed","#22d3ee","#34d399","#f59e0b"].map((c, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[7px] font-bold text-white"
                        style={{ background: c, borderColor: "#040408", zIndex: 4 - i }}
                      >
                        {["R","A","P","D"][i]}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10.5px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                    <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>2,400+</span> engineers already building
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}