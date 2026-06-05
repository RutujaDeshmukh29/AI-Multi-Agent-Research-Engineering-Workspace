"use client";
import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { streamChat } from "@/services/chatService";

export type AgentEvent = {
  agent: string;
  status: "thinking" | "done" | "error";
  message: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent_outputs?: Record<string, string>;
  input_mode?: "text" | "voice";
  created_at: string;
};

export function useChat(projectId: string | null, sessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [roadmap, setRoadmap] = useState<any>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const qc = useQueryClient();

  const loadMessages = useCallback((msgs: Message[]) => {
    setMessages(msgs);
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    inputMode: "text" | "voice" = "text"
  ) => {
    if (!projectId || !sessionId || isStreaming) return;

    // Add user message immediately (optimistic)
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      input_mode: inputMode,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setAgentEvents([]);
    setStreamingText("");
    setIsStreaming(true);

    // Placeholder for assistant response
    const assistantPlaceholder: Message = {
      id: `streaming-${Date.now()}`,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantPlaceholder]);

    const abort = streamChat(
      content, sessionId, projectId,
      // onEvent — agent progress updates
      (event) => {
        if (event.type === "agent_update") {
          setAgentEvents(prev => {
            const filtered = prev.filter(e => !(e.agent === event.agent && e.status === "thinking"));
            return [...filtered, { agent: event.agent, status: event.status, message: event.message }];
          });
        }
      },
      // onError
      (err) => {
        setIsStreaming(false);
        setMessages(prev => prev.map(m =>
          m.id === assistantPlaceholder.id
            ? { ...m, content: `Error: ${err.message}` }
            : m
        ));
      },
      // onDone
      (data) => {
        setIsStreaming(false);
        if (data.roadmap) setRoadmap(data.roadmap);
        qc.invalidateQueries({ queryKey: ["messages", sessionId] });
        qc.invalidateQueries({ queryKey: ["sessions", projectId] });
      }
    );

    abortRef.current = abort;

    // Also hook into the raw SSE stream for streaming text display
    // We re-implement a minimal fetch stream listener here for the content
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const controller = new AbortController();
      abortRef.current = () => controller.abort();

      const res = await fetch(`${API_URL}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: content, session_id: sessionId, project_id: projectId }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "agent_update") {
              setAgentEvents(prev => {
                const filtered = prev.filter(e => !(e.agent === ev.agent && e.status === "thinking"));
                return [...filtered, { agent: ev.agent, status: ev.status, message: ev.message }];
              });
            } else if (ev.type === "final") {
              fullContent = ev.content || "";
              if (ev.roadmap) setRoadmap(ev.roadmap);
              setMessages(prev => prev.map(m =>
                m.id === assistantPlaceholder.id
                  ? { ...m, content: fullContent, agent_outputs: ev.agent_outputs }
                  : m
              ));
            } else if (ev.type === "done") {
              setIsStreaming(false);
              qc.invalidateQueries({ queryKey: ["messages", sessionId] });
              qc.invalidateQueries({ queryKey: ["sessions", projectId] });
            } else if (ev.type === "error") {
              setIsStreaming(false);
              setMessages(prev => prev.map(m =>
                m.id === assistantPlaceholder.id
                  ? { ...m, content: `⚠️ ${ev.message}` }
                  : m
              ));
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setIsStreaming(false);
        setMessages(prev => prev.map(m =>
          m.id === assistantPlaceholder.id
            ? { ...m, content: "⚠️ Connection error. Check your backend is running." }
            : m
        ));
      }
    }
  }, [projectId, sessionId, isStreaming, qc]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.();
    setIsStreaming(false);
  }, []);

  return {
    messages, agentEvents, isStreaming,
    streamingText, roadmap,
    sendMessage, loadMessages, stopStreaming,
    setMessages,
  };
}
