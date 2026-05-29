"use client";
import { useChatStore } from "../store/useChatStore";
import MessageBubble from "./MessageBubble";
export default function ChatList() {
  const { chats, activeChatId } = useChatStore();
  const activeChat = chats.find((chat) => chat.id === activeChatId);
  return (
    <div className="flex-1 w-full p-8 space-y-5 overflow-y-auto">
      {activeChat?.messages.map((message) => (
        <MessageBubble
          key={message.id}
          role={message.role}
          content={message.content}
        />
      ))}
    </div>
  );
}