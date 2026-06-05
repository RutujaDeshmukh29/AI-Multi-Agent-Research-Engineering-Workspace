"use client";
// app/auth/login/page.tsx
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try { await login({ email, password }); }
    catch { setError("Invalid email or password. Check your credentials and try again."); }
  }

  return (
    <div className="min-h-screen bg-[#080910] flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-violet-600/8 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm relative"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 items-center justify-center text-xl font-bold mb-4 shadow-lg shadow-violet-500/20">✦</div>
          <h1 className="text-[22px] font-bold text-white/85 tracking-tight">AI Workspace</h1>
          <p className="text-[13px] text-white/35 mt-1">Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div className="bg-[#0d0e16] border border-white/[0.08] rounded-2xl p-7 shadow-2xl">
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/8 border border-red-500/20 text-red-400 text-[12.5px] rounded-xl px-4 py-3 mb-5">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] text-white/40 font-medium uppercase tracking-wider block mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email"
                className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-2.5 text-[13px] text-white/80 placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-white/40 font-medium uppercase tracking-wider block mb-1.5">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-2.5 text-[13px] text-white/80 placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all" />
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full mt-2 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20">
              {isLoading ? "Signing in..." : "Sign in →"}
            </button>
          </form>

          <p className="text-center text-[12px] text-white/30 mt-5">
            No account?{" "}
            <Link href="/auth/signup" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Create one →
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
