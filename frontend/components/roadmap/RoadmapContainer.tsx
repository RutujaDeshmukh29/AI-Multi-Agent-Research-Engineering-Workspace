"use client";
import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { getRoadmap, generateRoadmap, updateRoadmapTask } from "@/services/projectService";
import { RoadmapPanel } from "./RoadmapPanel";
import { Button } from "@/components/ui/Button";

export function RoadmapContainer() {
  const { activeProject, activeRoadmap, setActiveRoadmap } = useWorkspaceStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeProject) {
      setIsLoading(true);
      getRoadmap(activeProject.id)
        .then((data) => {
          setActiveRoadmap(data);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [activeProject, setActiveRoadmap]);

  const handleGenerate = async () => {
    if (!activeProject) return;
    setIsGenerating(true);
    try {
      const newRoadmap = await generateRoadmap(activeProject.id);
      setActiveRoadmap(newRoadmap);
    } catch (error) {
      console.error("Failed to generate roadmap", error);
      setError("Failed to generate roadmap.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    if (!activeProject || !activeRoadmap) return;

    const originalRoadmap = activeRoadmap;
    
    // Optimistic update
    const updatedTasks = activeRoadmap.tasks.map(t =>
      t.id === taskId ? { ...t, completed } : t
    );
    const optimisticRoadmap = { ...activeRoadmap, tasks: updatedTasks };
    setActiveRoadmap(optimisticRoadmap);

    try {
      const updatedRoadmapFromServer = await updateRoadmapTask(activeProject.id, taskId, completed);
      setActiveRoadmap(updatedRoadmapFromServer);
    } catch (err) {
      console.error("Failed to update task", err);
      // Revert on failure
      setActiveRoadmap(originalRoadmap);
      setError("Failed to update task. Please try again.");
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const ErrorDisplay = () => error ? (
    <div className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg p-3 text-sm mb-4">
      {error}
    </div>
  ) : null;

  if (isLoading) {
    return <div>Loading Roadmap...</div>;
  }

  if (!activeRoadmap) {
    return (
      <div>
        <h2>No Roadmap Found</h2>
        <ErrorDisplay />
        <p>Generate a roadmap for this project.</p>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate Roadmap"}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <ErrorDisplay />
      <RoadmapPanel roadmap={activeRoadmap} onTaskToggle={handleTaskToggle} />
    </div>
  );
}
