"use client";
// app/providers.tsx — All client-side providers + session restore on mount
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import * as authService from "@/services/authService";

function SessionRestorer() {
  const { isAuthenticated, setUser, logout } = useAuthStore();

  useEffect(() => {
    // On every app load: if we have a token but no user in store, fetch user
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (token && !isAuthenticated) {
      authService.getMe()
        .then(me => setUser(me))
        .catch(() => {
          // Token expired — clear everything
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          document.cookie = "access_token=; path=/; max-age=0";
          logout();
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60 * 5, retry: 1 },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
        <SessionRestorer />
        {children}
        <Toaster position="top-right" theme="dark" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
