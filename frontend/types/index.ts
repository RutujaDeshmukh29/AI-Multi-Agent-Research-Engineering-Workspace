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
  first_name?: string;
  last_name?: string;
  username?: string;
  bio?: string;
  location?: string;
  github?: string;
  linkedin?: string;
  is_verified?: boolean;
  github_username?: string;
  github_connected?: boolean;
  github_repos?: string[];
  preferences?: {
    theme?: "dark" | "light" | "system";
    default_agent?: string;
    notifications_enabled?: boolean;
    voice_enabled?: boolean;
    first_name?: string;
    last_name?: string;
    username?: string;
    bio?: string;
    location?: string;
    github?: string;
    linkedin?: string;
    avatar_url?: string;
    github_connected?: boolean;
    github_username?: string;
    github_repos?: string[];
    [key: string]: any;
  };
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
