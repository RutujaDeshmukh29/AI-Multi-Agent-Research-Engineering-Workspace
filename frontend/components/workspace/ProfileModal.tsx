"use client";
// ========================
// components/workspace/ProfileModal.tsx
// User profile panel — avatar upload, GitHub/Gmail connect, stats
// ========================

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user } = useAuthStore();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = (user?.name || "U")
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800)); // Simulate API call
    setSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="w-full max-w-md bg-[#0d0e14] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
              style={{ pointerEvents: "auto" }}
            >
              {/* Header */}
              <div className="relative h-20 bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border-b border-white/6">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white/80 transition-all text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Avatar */}
              <div className="px-6 -mt-10 mb-4 flex items-end justify-between">
                <div className="relative group">
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="w-20 h-20 rounded-2xl border-4 border-[#0d0e14] cursor-pointer overflow-hidden relative"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xl font-semibold">
                        {initials}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs">📷</span>
                    </div>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                {/* Stats */}
                <div className="flex gap-4 pb-1">
                  {[
                    { label: "Projects", value: "5" },
                    { label: "Sessions", value: "23" },
                    { label: "Memories", value: "41" },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <div className="text-base font-bold text-white/80">{s.value}</div>
                      <div className="text-[9px] text-white/30 uppercase tracking-wide">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form */}
              <div className="px-6 pb-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-white/40 uppercase tracking-wide">Display Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:border-violet-500/50 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-white/40 uppercase tracking-wide">Email</label>
                  <div className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/40">
                    {user?.email}
                  </div>
                </div>

                {/* Connected accounts */}
                <div className="space-y-2">
                  <label className="text-[11px] text-white/40 uppercase tracking-wide">Connected Accounts</label>

                  {[
                    { icon: "🐙", name: "GitHub", color: "border-white/10 hover:border-white/25", status: "Connect" },
                    { icon: "📧", name: "Gmail", color: "border-white/10 hover:border-white/25", status: "Connect" },
                  ].map(acc => (
                    <div
                      key={acc.name}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer",
                        acc.color
                      )}
                    >
                      <span className="text-base">{acc.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm text-white/60">{acc.name}</div>
                      </div>
                      <span className="text-[11px] text-violet-400 font-medium">{acc.status} →</span>
                    </div>
                  ))}
                </div>

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-2.5 bg-violet-600/30 hover:bg-violet-600/45 border border-violet-500/30 text-violet-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
