"use client";
// app/auth/signup/page.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

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

// ─── Canvas particle background ───────────────────────────────────────────────
function Particles({ density = 50 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let id: number;
    type P = { x: number; y: number; vx: number; vy: number; r: number; o: number; hue: number };
    const ps: P[] = [];

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < density; i++) {
      ps.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.4 + 0.3,
        o: Math.random() * 0.3 + 0.04,
        hue: Math.random() > 0.6 ? 265 : 195,
      });
    }

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of ps) {
        p.x = (p.x + p.vx + canvas.width)  % canvas.width;
        p.y = (p.y + p.vy + canvas.height) % canvas.height;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},80%,70%,${p.o})`;
        ctx.fill();
      }
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, [density]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ─── Password strength evaluator ─────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak",   color: "#f87171" };
  if (score <= 2) return { score, label: "Fair",   color: "#f59e0b" };
  if (score <= 3) return { score, label: "Good",   color: "#a78bfa" };
  return             { score, label: "Strong", color: "#34d399" };
}

// ─── Floating label input ─────────────────────────────────────────────────────
function FloatingInput({
  id, label, type = "text", value, onChange, placeholder, autoComplete, required,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  autoComplete?: string; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;

  return (
    <div className="relative">
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
        className="peer w-full rounded-xl px-4 pt-5 pb-2 text-[13px] text-white/85 outline-none transition-all duration-200 placeholder-white/20"
        style={{
          background: focused ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.035)",
          border: focused
            ? "1px solid rgba(139,92,246,0.55)"
            : filled
            ? "1px solid rgba(255,255,255,0.12)"
            : "1px solid rgba(255,255,255,0.07)",
          boxShadow: focused ? "0 0 0 3px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.04)" : "none",
        }}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 transition-all duration-200 font-medium select-none"
        style={{
          top:      focused || filled ? "6px"   : "50%",
          transform: focused || filled ? "translateY(0)" : "translateY(-50%)",
          fontSize:  focused || filled ? "9px"  : "12.5px",
          color:     focused ? "rgba(167,139,250,0.9)" : "rgba(255,255,255,0.3)",
          letterSpacing: focused || filled ? "0.12em" : "0.02em",
          textTransform: "uppercase",
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

// ─── Main signup page ─────────────────────────────────────────────────────────
export default function SignupPage() {
  const { signup, isLoading } = useAuth();
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [agree,    setAgree]    = useState(false);
  const [error,    setError]    = useState("");
  const [step,     setStep]     = useState<"info" | "done">("info");

  const strength = getStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!agree) { setError("Please accept the terms to continue."); return; }
    try {
      await signup({ name, email, password });
      setStep("done");
    } catch (err: unknown) {
      const axiosErr = err as any;
      let message = "Could not create account.";
      if (axiosErr?.response?.data?.detail) message = axiosErr.response.data.detail;
      else if (axiosErr?.code === "ERR_NETWORK") message = "Backend unreachable. Make sure it's running on :8000";
      else if (axiosErr?.message) message = axiosErr.message;
      setError(message);
    }
  }

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

      <div className="min-h-screen bg-[#07080f] flex overflow-hidden">

        {/* ══ LEFT PANEL (55%) ══════════════════════════════════════════════ */}
        <div className="hidden lg:flex flex-col w-[55%] relative border-r border-white/[0.045] overflow-hidden">
          <Particles density={60} />

          {/* Ambient blobs */}
          <div className="absolute top-[20%] left-[20%] w-72 h-72 rounded-full blur-[90px] opacity-[0.07] bg-violet-500 pointer-events-none" />
          <div className="absolute bottom-[15%] right-[15%] w-56 h-56 rounded-full blur-[70px] opacity-[0.05] bg-cyan-400 pointer-events-none" />
          <div className="absolute top-[60%] left-[40%] w-40 h-40 rounded-full blur-[60px] opacity-[0.04] bg-emerald-400 pointer-events-none" />

          <div className="relative flex flex-col h-full px-14 py-12">

            {/* Logo */}
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
                }}
              >
                ✦
              </div>
              <span className="text-[13px] font-semibold text-white/55 tracking-wide">AI Multi-Agent Workspace</span>
            </motion.div>

            {/* Hero headline */}
            <motion.div
              className="mt-12 mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.55 }}
            >
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-violet-400/60 mb-3">
                Your AI engineering team awaits
              </p>
              <h2 className="text-[32px] font-bold text-white/88 leading-[1.2] tracking-tight">
                Build faster with<br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(90deg, #a78bfa, #22d3ee)" }}
                >
                  six agents in sync
                </span>
              </h2>
              <p className="mt-4 text-[13px] text-white/35 leading-relaxed max-w-xs">
                A full-stack AI workspace where specialized agents collaborate, remember context, and ship work — so you can focus on what matters.
              </p>
            </motion.div>

            {/* Stats row */}
            <motion.div
              className="grid grid-cols-3 gap-3 mb-10"
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
            <div className="space-y-3 mb-10">
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
                    <p className="text-[11px] text-white/30 leading-relaxed mt-0.5">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Live agent ticker */}
            <motion.div
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
            <div className="mt-auto pt-6 flex items-center justify-between">
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

        {/* ══ RIGHT PANEL (45%) ════════════════════════════════════════════= */}
        <div className="flex-1 lg:w-[45%] flex items-center justify-center p-6 relative overflow-hidden">

          {/* Right side ambient */}
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
                <h2 className="text-[24px] font-bold text-white/88 mb-2">You're in, {name.split(" ")[0]}!</h2>
                <p className="text-[13px] text-white/35 leading-relaxed mb-8">
                  Your workspace is ready. Six agents are standing by to help you build, research, and ship.
                </p>
                <Link
                  href="/auth/login"
                  className="block w-full py-3 rounded-xl text-[13px] font-semibold text-white text-center"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    boxShadow: "0 4px 20px rgba(109,40,217,0.35)",
                  }}
                >
                  Enter workspace →
                </Link>
              </motion.div>
            ) : (
              /* ── SIGNUP FORM ── */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-full max-w-[360px]"
              >
                {/* Heading */}
                <div className="mb-7">
                  <div
                    className="inline-flex w-10 h-10 rounded-xl items-center justify-center text-lg font-bold text-white mb-5"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                      boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
                    }}
                  >
                    ✦
                  </div>
                  <h1 className="text-[26px] font-bold text-white/88 tracking-tight leading-tight">
                    Create your workspace
                  </h1>
                  <p className="text-[13px] text-white/32 mt-1.5">
                    Join thousands building smarter with AI agents.
                  </p>
                </div>

                {/* Glass card */}
                <div
                  className="rounded-2xl p-6 relative overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(28px)",
                    WebkitBackdropFilter: "blur(28px)",
                    border: "1px solid rgba(255,255,255,0.075)",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Top shimmer line */}
                  <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        key="err"
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-500/8 border border-red-500/20 text-red-400/90 text-[12px] rounded-xl px-4 py-3 mb-4 leading-relaxed overflow-hidden"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit} className="space-y-3.5">

                    {/* Name */}
                    <FloatingInput
                      id="name" label="Full name" value={name} onChange={setName}
                      placeholder="Rutuja" autoComplete="name" required
                    />

                    {/* Email */}
                    <FloatingInput
                      id="email" label="Email address" type="email" value={email}
                      onChange={setEmail} placeholder="you@example.com"
                      autoComplete="email" required
                    />

                    {/* Password with show/hide */}
                    <div className="relative">
                      <FloatingInput
                        id="password" label="Password"
                        type={showPass ? "text" : "password"}
                        value={password} onChange={setPassword}
                        placeholder="Min 8 characters"
                        autoComplete="new-password" required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        tabIndex={-1}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-medium transition-colors select-none"
                        style={{ color: "rgba(255,255,255,0.25)" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "rgba(167,139,250,0.7)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                      >
                        {showPass ? "HIDE" : "SHOW"}
                      </button>
                    </div>

                    {/* Password strength meter */}
                    {password.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="overflow-hidden"
                      >
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map(n => (
                            <div
                              key={n}
                              className="flex-1 h-0.5 rounded-full transition-all duration-300"
                              style={{
                                background: n <= strength.score ? strength.color : "rgba(255,255,255,0.07)",
                                boxShadow: n <= strength.score ? `0 0 4px ${strength.color}80` : "none",
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] font-semibold tracking-wide" style={{ color: strength.color }}>
                          {strength.label}
                          {strength.score < 4 && (
                            <span className="text-white/25 font-normal ml-1.5">
                              — add {strength.score < 2 ? "uppercase, numbers & symbols" : strength.score < 3 ? "numbers & symbols" : "a symbol"}
                            </span>
                          )}
                        </p>
                      </motion.div>
                    )}

                    {/* Terms checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group pt-1">
                      <div
                        onClick={() => setAgree(a => !a)}
                        className="w-4 h-4 mt-0.5 rounded-[5px] flex items-center justify-center flex-shrink-0 transition-all duration-150"
                        style={{
                          background: agree ? "rgba(139,92,246,0.85)" : "rgba(255,255,255,0.04)",
                          border: agree ? "1px solid rgba(139,92,246,0.85)" : "1px solid rgba(255,255,255,0.11)",
                          boxShadow: agree ? "0 0 10px rgba(139,92,246,0.3)" : "none",
                        }}
                      >
                        {agree && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.2 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-[11.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
                        I agree to the{" "}
                        <span className="text-violet-400/80 hover:text-violet-300 transition-colors cursor-pointer">Terms of Service</span>
                        {" "}and{" "}
                        <span className="text-violet-400/80 hover:text-violet-300 transition-colors cursor-pointer">Privacy Policy</span>
                      </span>
                    </label>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={{ scale: isLoading ? 1 : 1.02 }}
                      whileTap={{ scale: isLoading ? 1 : 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                      className="w-full mt-1 py-3 text-white rounded-xl text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                      style={{
                        background: isLoading
                          ? "rgba(124,58,237,0.5)"
                          : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                        boxShadow: isLoading ? "none" : "0 4px 24px rgba(109,40,217,0.42), inset 0 1px 0 rgba(255,255,255,0.13)",
                      }}
                    >
                      {/* shimmer overlay on hover is handled by CSS class on hover */}
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2.5">
                          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                          Setting up your workspace…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          Create workspace
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      )}
                    </motion.button>
                  </form>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/[0.055]" />
                    <span className="text-[10.5px] text-white/18 font-medium">or sign up with</span>
                    <div className="flex-1 h-px bg-white/[0.055]" />
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
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-150"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          color: "rgba(255,255,255,0.45)",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.13)";
                          (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                          (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)";
                        }}
                      >
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Sign in link */}
                  <p className="text-center text-[12px] mt-4" style={{ color: "rgba(255,255,255,0.22)" }}>
                    Already have a workspace?{" "}
                    <Link href="/auth/login" className="font-medium transition-colors" style={{ color: "rgba(167,139,250,0.8)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "rgba(196,181,253,1)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(167,139,250,0.8)")}
                    >
                      Sign in →
                    </Link>
                  </p>
                </div>

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
                        style={{ background: c, borderColor: "#07080f", zIndex: 4 - i }}
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