"use client";

import {
  useState,
  useRef,
  useEffect,
} from "react";

import api from "../services/api";

import { Message } from "../types/chat";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import MessageBubble from "./MessageBubble";
import TypingLoader from "./TypingLoader";
import EmptyState from "./EmptyState";

export default function ChatBox() {

  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [messages]);

  const sendMessage = async () => {

    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInput("");

    setLoading(true);

    try {

      const res = await api.post("/chat", {
        message: input,
      });

      const aiMessage: Message = {
        role: "assistant",
        content: res.data.response,
      };

      setMessages((prev) => [
        ...prev,
        aiMessage,
      ]);

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-black via-zinc-950 to-purple-950 text-white flex overflow-hidden">

      <Sidebar />

      <div className="flex-1 flex flex-col">

        <Navbar />

        <div className="flex-1 overflow-y-auto p-8 space-y-8">

          {messages.length === 0 ? (

            <EmptyState />

          ) : (

            <>
              {messages.map((msg, index) => (

                <MessageBubble
                  key={index}
                  role={msg.role}
                  content={msg.content}
                />

              ))}

              {loading && <TypingLoader />}

              <div ref={bottomRef} />
            </>

          )}

        </div>

        <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-xl">

          <div className="flex gap-4">

            <input
              type="text"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              className="flex-1 p-5 rounded-3xl bg-white/5 border border-white/10 outline-none backdrop-blur-xl focus:border-purple-500 transition-all"
            />

            <button
              onClick={sendMessage}
              className="px-8 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-[1.03] active:scale-95 transition-all duration-300 shadow-xl shadow-purple-500/20"
            >
              Send
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}