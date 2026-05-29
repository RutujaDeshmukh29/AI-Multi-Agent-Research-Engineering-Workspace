import { create } from "zustand";

import {
  Agent,
  ChatSession,
  Message,
} from "../types/chat";

import {
  saveChats,
  loadChats,
} from "../utils/localStorage";

interface ChatStore {
  agents: Agent[];
  chats: ChatSession[];
  activeAgentId: string;
  activeChatId: string;
  hydrateChats: () => void;
  createChat: () => void;
  setActiveAgent: (id: string) => void;
  setActiveChat: (id: string) => void;
  addMessage: (
    chatId: string,
    message: Message
  ) => void;
}

const defaultAgents: Agent[] = [
  {
    id: "agent-1",
    title: "General Agent",
    description: "Handles general questions and chat.",
    color: "bg-purple-500",
  },
  {
    id: "agent-2",
    title: "Code Assistant",
    description: "Helps with code, debugging, and developer tasks.",
    color: "bg-sky-500",
  },
  {
    id: "agent-3",
    title: "Research Agent",
    description: "Provides summaries, references, and research help.",
    color: "bg-emerald-500",
  },
];

const defaultChats: ChatSession[] = [
  {
    id: "1",
    title: "New Chat",
    agentId: "agent-1",
    messages: [],
  },
];

export const useChatStore =
  create<ChatStore>((set) => ({
    agents: defaultAgents,
    chats: defaultChats,
    activeAgentId: "agent-1",
    activeChatId: "1",
    hydrateChats: () => {
      const loadedChats = loadChats();
      if (!loadedChats || loadedChats.length === 0) return;

      set({
        chats: loadedChats,
        activeChatId: loadedChats[0].id,
        activeAgentId: loadedChats[0].agentId || "agent-1",
      });
    },
    createChat: () =>
      set((state) => {
        const newChat = {
          id: Date.now().toString(),
          title: "Untitled Chat",
          agentId: state.activeAgentId,
          messages: [],
        };

        const updatedChats = [newChat, ...state.chats];
        saveChats(updatedChats);

        return {
          chats: updatedChats,
          activeChatId: newChat.id,
        };
      }),
    setActiveAgent: (id) =>
      set((state) => {
        const matchedChat = state.chats.find(
          (chat) => chat.agentId === id
        );

        if (matchedChat) {
          return {
            activeAgentId: id,
            activeChatId: matchedChat.id,
          };
        }

        const newChat = {
          id: Date.now().toString(),
          title: "New Chat",
          agentId: id,
          messages: [],
        };

        const updatedChats = [newChat, ...state.chats];
        saveChats(updatedChats);

        return {
          chats: updatedChats,
          activeAgentId: id,
          activeChatId: newChat.id,
        };
      }),
    setActiveChat: (id) =>
      set((state) => {
        const activeChat = state.chats.find((chat) => chat.id === id);

        return {
          activeChatId: id,
          activeAgentId: activeChat?.agentId ?? state.activeAgentId,
        };
      }),
    addMessage: (chatId, message) =>
      set((state) => {
        const updatedChats = state.chats.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, message],
            };
          }
          return chat;
        });

        saveChats(updatedChats);

        return {
          chats: updatedChats,
        };
      }),
  }));