"use client";

import { Plus } from "lucide-react";

import { useChatStore } from "../store/useChatStore";

export default function Sidebar() {

  const {
    chats,
    activeChatId,
    createChat,
    setActiveChat,
  } = useChatStore();

  return (
    <div className="w-[300px] bg-black/40 border-r border-white/10 backdrop-blur-xl p-5 flex flex-col">

      <button
        onClick={createChat}
        className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-2xl hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-purple-500/20"
      >
        <Plus size={18} />

        New Chat
      </button>

      <div className="mt-10 flex flex-col gap-3 overflow-y-auto">

        {chats.map((chat) => (

          <button
            key={chat.id}
            onClick={() =>
              setActiveChat(chat.id)
            }
            className={`text-left p-4 rounded-2xl transition-all ${
              activeChatId === chat.id
                ? "bg-white/10 border border-white/10"
                : "hover:bg-white/5"
            }`}
          >
            {chat.title}
          </button>

        ))}

      </div>

    </div>
  );
}