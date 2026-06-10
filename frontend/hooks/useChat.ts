"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMessages } from "@/hooks/useProjects";

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

export function useChat(projectId: string | null, currentSessionId: string | null) {
  const { data: initialMessages, isLoading, isFetching } = useMessages(projectId, currentSessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [roadmap, setRoadmap] = useState<any>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (isStreaming || isFetching) return;
    if (initialMessages) {
      setMessages(initialMessages);
    } else if (!isLoading) {
      setMessages([]);
    }
  }, [initialMessages, isLoading, isFetching, isStreaming]);

  const sendMessage = useCallback(async (
    content: string,
    inputMode: "text" | "voice" = "text",
    sessionIdOverride: string | null = null,
  ) => {
    const sessionId = sessionIdOverride || currentSessionId;
    if (!projectId || !sessionId || isStreaming) {
      return;
    }

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

    const assistantPlaceholder: Message = {
      id: `streaming-${Date.now()}`,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantPlaceholder]);

    abortRef.current = null;
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

    try {
      const controller = new AbortController();
      abortRef.current = () => controller.abort();

      const res = await fetch(`${API_URL}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: content, session_id: sessionId, project_id: projectId }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Chat stream failed (${res.status})`);
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
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
              if (ev.roadmap) setRoadmap(ev.roadmap);
              setMessages(prev => prev.map(m =>
                m.id === assistantPlaceholder.id
                  ? { ...m, content: ev.content || "", agent_outputs: ev.agent_outputs, id: ev.message_id || m.id }
                  : m
              ));
            } else if (ev.type === "done") {
              if (ev.message_id) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantPlaceholder.id ? { ...m, id: ev.message_id } : m
                ));
              }
              setIsStreaming(false);
              qc.invalidateQueries({ queryKey: ["messages", projectId, sessionId] });
              qc.invalidateQueries({ queryKey: ["sessions", projectId] });
            } else if (ev.type === "error") {
              setIsStreaming(false);
              setMessages(prev => prev.map(m =>
                m.id === assistantPlaceholder.id ? { ...m, content: `⚠️ ${ev.message}` } : m
              ));
            }
          } catch {
            // Ignore malformed SSE fragments; the next chunk may complete the event.
          }
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
  }, [projectId, currentSessionId, isStreaming, qc]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.();
    setIsStreaming(false);
  }, []);

  return {
    messages, agentEvents, isStreaming,
    streamingText, roadmap,
    sendMessage, stopStreaming,
    setMessages,
  };
}
