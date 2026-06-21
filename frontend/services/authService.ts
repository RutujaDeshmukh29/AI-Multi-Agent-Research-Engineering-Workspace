// ========================
// services/authService.ts
// Auth API calls — signup, login, refresh, me
//
// CONCEPT: Service Layer Pattern
// Components never call axios directly.
// They call these service functions instead.
// This means if the API changes, you only update one file.
// ========================

import api from "./api";
import type { AuthTokens, User, LoginRequest, SignupRequest } from "@/types";

// ─────────────────────────────────────────
// SIGNUP
// ─────────────────────────────────────────
export async function signup(data: SignupRequest): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>("/api/auth/signup", data);
  return response.data;
}

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────
export async function login(data: LoginRequest): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>("/api/auth/login", data);
  return response.data;
}

// ─────────────────────────────────────────
// SOCIAL LOGIN (Google & GitHub)
// ─────────────────────────────────────────
export async function socialLogin(data: {
  email: string;
  name: string;
  avatar_url?: string;
  provider: string;
}): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>("/api/auth/social-login", data);
  return response.data;
}

// ─────────────────────────────────────────
// GET CURRENT USER
// Frontend calls this on load to restore session
// ─────────────────────────────────────────
export async function getMe(): Promise<User> {
  const response = await api.get<User>("/api/auth/me");
  return response.data;
}

// ─────────────────────────────────────────
// LOGOUT (client-side only — clear tokens)
// ─────────────────────────────────────────
export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
}

// ─────────────────────────────────────────
// HEALTH CHECK — test if backend is reachable
// ─────────────────────────────────────────
export async function checkHealth(): Promise<{
  status: string;
  database: string;
}> {
  const response = await api.get("/health");
  return response.data;
}
