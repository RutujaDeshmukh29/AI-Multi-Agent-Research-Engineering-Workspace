// services/chatService.ts
// Chat API — SSE streaming connection + roadmap CRUD

import api from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── SSE Streaming Chat ─────────────────
export function streamChat(
  message: string,
  sessionId: string,
  projectId: string,
  onEvent: (event: any) => void,
  onError: (err: Error) => void,
  onDone: (data: any) => void,
): () => void {
  // We use fetch + ReadableStream instead of EventSource
  // because EventSource doesn't support POST requests
  const controller = new AbortController();
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  fetch(`${API_URL}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, session_id: sessionId, project_id: projectId }),
    signal: controller.signal,
  }).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "done") {
              onDone(data);
            } else if (data.type === "error") {
              onError(new Error(data.message));
            } else {
              onEvent(data);
            }
          } catch {}
        }
      }
    }
  }).catch((err) => {
    if (err.name !== "AbortError") onError(err);
  });

  return () => controller.abort();
}

// ─── Roadmap ─────────────────────────────
export async function getRoadmap(projectId: string) {
  const r = await api.get(`/api/chat/roadmap/${projectId}`);
  return r.data;
}

export async function updateTask(taskId: string, completed: boolean) {
  const r = await api.patch(`/api/chat/roadmap/task/${taskId}`, { completed });
  return r.data;
}

// ─── Message history ─────────────────────
export async function getMessages(projectId: string, sessionId: string) {
  const r = await api.get(`/api/projects/${projectId}/sessions/${sessionId}/messages`);
  return r.data;
}
