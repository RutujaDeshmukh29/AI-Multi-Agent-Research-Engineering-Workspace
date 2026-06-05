"use client";
// ========================
// hooks/useAuth.ts
// Auth hook — components use this, not the store directly
//
// CONCEPT: Custom Hook Pattern
// Wraps Zustand store + service calls into one clean interface.
// Component just calls: const { user, login, logout } = useAuth()
// ========================

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import * as authService from "@/services/authService";
import type { LoginRequest, SignupRequest } from "@/types";

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, setUser, setTokens, logout: clearAuth, setLoading } = useAuthStore();

  // Helper: set cookie so Next.js middleware can read token server-side
  const setCookieToken = (token: string) => {
    if (typeof document !== "undefined") {
      // Secure, SameSite=Lax, 1 day expiry
      document.cookie = `access_token=${token}; path=/; max-age=86400; SameSite=Lax`;
    }
  };

  const clearCookieToken = () => {
    if (typeof document !== "undefined") {
      document.cookie = "access_token=; path=/; max-age=0";
    }
  };

  // ── LOGIN ──────────────────────────────
  const login = useCallback(async (data: LoginRequest) => {
    setLoading(true);
    try {
      const tokens = await authService.login(data);
      setTokens(tokens.access_token, tokens.refresh_token);
      setCookieToken(tokens.access_token); // ← cookie for middleware

      const me = await authService.getMe();
      setUser(me);

      toast.success(`Welcome back, ${me.name}!`);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Login failed";
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router, setLoading, setTokens, setUser]);

  // ── SIGNUP ─────────────────────────────
  const signup = useCallback(async (data: SignupRequest) => {
    setLoading(true);
    try {
      const tokens = await authService.signup(data);
      setTokens(tokens.access_token, tokens.refresh_token);
      setCookieToken(tokens.access_token); // ← cookie for middleware

      const me = await authService.getMe();
      setUser(me);

      toast.success(`Account created! Welcome, ${me.name}!`);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Signup failed";
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router, setLoading, setTokens, setUser]);

  // ── LOGOUT ─────────────────────────────
  const logout = useCallback(() => {
    authService.logout();
    clearCookieToken();
    clearAuth();
    router.push("/auth/login");
    toast.info("Logged out successfully");
  }, [router, clearAuth]);

  // ── RESTORE SESSION ────────────────────
  // Called on app load if token exists in localStorage
  const restoreSession = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token || isAuthenticated) return;

    setLoading(true);
    try {
      const me = await authService.getMe();
      setUser(me);
    } catch {
      clearAuth(); // Token expired or invalid — clear everything
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setUser, clearAuth, setLoading]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    restoreSession,
  };
}
