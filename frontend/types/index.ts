export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  project_id: string;
  title: string;
  mode: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent_outputs?: Record<string, string>;
  created_at: string;
}

export interface RoadmapTask {
    id: string;
    roadmap_id: string;
    phase_id: string;
    task_id: string;
    title: string;
    description?: string;
    estimated_hours?: number;
    priority?: string;
    tags?: string[];
    completed: boolean;
    completed_at?: string;
    phase_index: number;
    task_index: number;
}

export interface Roadmap {
    id: string;
    project_id: string;
    project_title: string;
    total_phases: number;
    estimated_weeks: number;
    progress_percent: number;
    phases_json: any; // The raw JSON for rendering
    tasks: RoadmapTask[];
    created_at: string;
    updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}
