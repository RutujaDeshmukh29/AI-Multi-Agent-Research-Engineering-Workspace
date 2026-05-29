import { create } from "zustand";

import {
  ChatSession,
  Message,
} from "../types/chat";

import {
  saveChats,
  loadChats,
} from "../utils/localStorage";

interface ChatStore {

  chats: ChatSession[];

  activeChatId: string;

  createChat: () => void;

  setActiveChat: (id: string) => void;

  addMessage: (
    chatId: string,
    message: Message
  ) => void;
}

const initialChats =
  typeof window !== "undefined"
    ? loadChats()
    : null;

export const useChatStore =
  create<ChatStore>((set) => ({

    chats:
      initialChats || [
        {
          id: "1",
          title: "New Chat",
          messages: [],
        },
      ],

    activeChatId: "1",

    createChat: () =>

      set((state) => {

        const newChat = {
          id: Date.now().toString(),
          title: "Untitled Chat",
          messages: [],
        };

        const updatedChats = [
          newChat,
          ...state.chats,
        ];

        saveChats(updatedChats);

        return {
          chats: updatedChats,
          activeChatId: newChat.id,
        };
      }),

    setActiveChat: (id) =>
      set({
        activeChatId: id,
      }),

    addMessage: (chatId, message) =>

      set((state) => {

        const updatedChats =
          state.chats.map((chat) => {

            if (chat.id === chatId) {

              return {
                ...chat,
                messages: [
                  ...chat.messages,
                  message,
                ],
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