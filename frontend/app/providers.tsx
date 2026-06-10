"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

function SessionRestorer() {
  const { isAuthenticated, setUser, logout } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token || isAuthenticated) return;

    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error("expired"); return r.json(); })
      .then((user) => setUser(user))
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        document.cookie = "access_token=; path=/; max-age=0";
        logout();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60 * 5, retry: 1 },
      mutations: { retry: 0 },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SessionRestorer />
      {children}
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: "#0d0e16",
            border: "0.5px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.85)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
