// services/projectService.ts
import api from "./api";

export async function getProjects() {
  const r = await api.get("/api/projects/");
  return r.data;
}

export async function createProject(data: { name: string; description?: string; icon?: string; color?: string }) {
  const r = await api.post("/api/projects/", data);
  return r.data;
}

export async function updateProject(id: string, data: { name?: string; description?: string; icon?: string }) {
  const r = await api.patch(`/api/projects/${id}`, data);
  return r.data;
}

export async function deleteProject(id: string) {
  await api.delete(`/api/projects/${id}`);
}

export async function getSessions(projectId: string) {
  const r = await api.get(`/api/projects/${projectId}/sessions`);
  return r.data;
}

export async function createSession(projectId: string, data: { title?: string; mode?: string }) {
  const r = await api.post(`/api/projects/${projectId}/sessions`, data);
  return r.data;
}

export async function updateSession(projectId: string, sessionId: string, data: { title?: string; is_pinned?: boolean }) {
  const r = await api.patch(`/api/projects/${projectId}/sessions/${sessionId}`, data);
  return r.data;
}

export async function deleteSession(projectId: string, sessionId: string) {
  await api.delete(`/api/projects/${projectId}/sessions/${sessionId}`);
}

export async function getMessages(projectId: string, sessionId: string) {
  const r = await api.get(`/api/projects/${projectId}/sessions/${sessionId}/messages`);
  return r.data;
}

export async function getRoadmap(projectId: string) {
  const r = await api.get(`/api/projects/${projectId}/roadmap`);
  return r.data;
}

export async function generateRoadmap(projectId: string) {
  const r = await api.post(`/api/projects/${projectId}/roadmap/generate`);
  return r.data;
}

export async function updateRoadmapTask(projectId: string, taskId: string, completed: boolean) {
  const r = await api.put(`/api/projects/${projectId}/roadmap/tasks/${taskId}`, { completed });
  return r.data;
}
