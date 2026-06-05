// ========================
// types/index.ts
// All shared TypeScript types
// Single source of truth for data shapes
// ========================

// --- Auth ---
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

// --- Projects & Sessions ---
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  session_count?: number;
}

export interface Session {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  message_count?: number;
}

// --- Messages & Chat ---
export type MessageRole = "user" | "assistant" | "system";

export interface AgentOutput {
  agent: AgentType;
  content: string;
  status: "thinking" | "done" | "error";
}

export interface Message {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  agent_outputs?: AgentOutput[];  // Multi-agent breakdown
  created_at: string;
  is_streaming?: boolean;         // For UI streaming state
}

// --- Agents ---
export type AgentType =
  | "qa"
  | "research"
  | "engineering"
  | "innovation"
  | "critic"
  | "planner";

export interface AgentStatus {
  agent: AgentType;
  status: "idle" | "thinking" | "done" | "error";
  message?: string;
}

// --- API Responses ---
export interface APIResponse<T> {
  data: T;
  message?: string;
  status: "success" | "error";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// --- Chat Request ---
export interface ChatRequest {
  message: string;
  session_id: string;
  project_id: string;
}

export interface ChatResponse {
  message_id: string;
  content: string;
  agent_outputs: AgentOutput[];
  session_id: string;
}

// --- Streaming ---
export interface StreamEvent {
  type: "agent_start" | "agent_output" | "agent_done" | "final" | "error";
  agent?: AgentType;
  content?: string;
  done?: boolean;
}
