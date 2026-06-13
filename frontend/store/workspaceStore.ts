// ========================
// store/workspaceStore.ts
// Global workspace/project state
// ========================

import { create } from "zustand";
import type { Project, Session, Message, Roadmap } from "@/types";

interface WorkspaceState {
  // Active state
  activeProject: Project | null;
  activeSession: Session | null;
  messages: Message[];
  isAgentThinking: boolean;
  streamingContent: string;
  activeRoadmap: Roadmap | null;

  // List state
  projects: Project[];
  sessions: Session[];

  // Actions
  setActiveProject: (project: Project | null) => void;
  setActiveSession: (session: Session | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setProjects: (projects: Project[]) => void;
  setSessions: (sessions: Session[]) => void;
  setAgentThinking: (thinking: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  resetSession: () => void;
  setActiveRoadmap: (roadmap: Roadmap | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  activeProject: null,
  activeSession: null,
  activeRoadmap: null,
  messages: [],
  isAgentThinking: false,
  streamingContent: "",
  projects: [],
  sessions: [],

  setActiveProject: (project) => set({ activeProject: project }),
  setActiveSession: (session) => set({ activeSession: session }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (content) =>
    set((state) => {
      const updated = [...state.messages];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content,
        };
      }
      return { messages: updated };
    }),
  setProjects: (projects) => set({ projects }),
  setSessions: (sessions) => set({ sessions }),
  setAgentThinking: (isAgentThinking) => set({ isAgentThinking }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
  appendStreamingContent: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),
  resetSession: () =>
    set({ messages: [], streamingContent: "", isAgentThinking: false }),
  setActiveRoadmap: (roadmap) => set({ activeRoadmap: roadmap }),
}));
