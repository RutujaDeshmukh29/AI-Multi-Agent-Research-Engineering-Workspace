import { ChatSession } from "../types/chat";

const STORAGE_KEY = "ai-workspace-chats";

const ensureMessageId = (message: any) => ({
  id:
    typeof message?.id === "string" && message.id
      ? message.id
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role: message.role,
  content: message.content,
});

const ensureChat = (chat: any): ChatSession => ({
  id:
    typeof chat?.id === "string" && chat.id
      ? chat.id
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  title: typeof chat?.title === "string" ? chat.title : "New Chat",
  agentId:
    typeof chat?.agentId === "string" && chat.agentId
      ? chat.agentId
      : "agent-1",
  messages: Array.isArray(chat?.messages)
    ? chat.messages.map(ensureMessageId)
    : [],
});

export const saveChats = (
  chats: ChatSession[]
) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
};

export const loadChats = () => {
  const chats = localStorage.getItem(STORAGE_KEY);

  if (!chats) return null;

  try {
    const parsed = JSON.parse(chats);
    if (!Array.isArray(parsed)) return null;
    return parsed.map(ensureChat);
  } catch {
    return null;
  }
};