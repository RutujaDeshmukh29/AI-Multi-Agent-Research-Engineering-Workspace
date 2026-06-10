"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as projectService from "@/services/projectService";
import { useAuthStore } from "@/store/authStore";

export function useProjects() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ["projects"],
    queryFn: projectService.getProjects,
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  });
}

export function useSessions(projectId: string | null) {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ["sessions", projectId],
    queryFn: () => projectService.getSessions(projectId!),
    enabled: isAuthenticated && !!projectId,
    staleTime: 1000 * 30,
  });
}

export function useMessages(projectId: string | null, sessionId: string | null) {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ["messages", projectId, sessionId],
    queryFn: () => projectService.getMessages(projectId!, sessionId!),
    enabled: isAuthenticated && !!projectId && !!sessionId,
    staleTime: 0,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectService.createProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) =>
      projectService.createSession(projectId, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["sessions", vars.projectId] }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, sessionId }: { projectId: string; sessionId: string }) =>
      projectService.deleteSession(projectId, sessionId),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["sessions", vars.projectId] }),
  });
}

export function useRenameSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, sessionId, title }: { projectId: string; sessionId: string; title: string }) =>
      projectService.updateSession(projectId, sessionId, { title }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["sessions", vars.projectId] }),
  });
}
