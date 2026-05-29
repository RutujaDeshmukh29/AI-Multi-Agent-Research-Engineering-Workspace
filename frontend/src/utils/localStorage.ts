import { ChatSession } from "../types/chat";

const STORAGE_KEY = "ai-workspace-chats";

export const saveChats = (
  chats: ChatSession[]
) => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(chats)
  );
};

export const loadChats = () => {
  const chats =
    localStorage.getItem(STORAGE_KEY);

  return chats
    ? JSON.parse(chats)
    : null;
};