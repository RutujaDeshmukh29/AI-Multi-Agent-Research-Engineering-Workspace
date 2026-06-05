// ========================
// lib/utils.ts
// Shared utility functions
// ========================

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ShadCN standard utility — merges Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date for display
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Format relative time (e.g. "2 hours ago")
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

// Truncate text with ellipsis
export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "..." : str;
}

// Generate a random ID (for temp IDs before server response)
export function generateTempId(): string {
  return `temp_${Math.random().toString(36).slice(2, 9)}`;
}

// Agent display config — centralized here
export const AGENT_CONFIG = {
  qa: {
    label: "QA Controller",
    color: "hsl(var(--agent-qa))",
    icon: "🧠",
    description: "Central coordinator",
  },
  research: {
    label: "Research Agent",
    color: "hsl(var(--agent-research))",
    icon: "🔍",
    description: "Gathers concepts & resources",
  },
  engineering: {
    label: "Engineering Agent",
    color: "hsl(var(--agent-engineering))",
    icon: "⚙️",
    description: "Architecture & implementation",
  },
  innovation: {
    label: "Innovation Agent",
    color: "hsl(var(--agent-innovation))",
    icon: "💡",
    description: "Creative improvements",
  },
  critic: {
    label: "Critic Agent",
    color: "hsl(var(--agent-critic))",
    icon: "🎯",
    description: "Identifies weaknesses",
  },
  planner: {
    label: "Planner Agent",
    color: "hsl(var(--agent-planner))",
    icon: "🗺️",
    description: "Roadmaps & milestones",
  },
} as const;

export type AgentType = keyof typeof AGENT_CONFIG;
