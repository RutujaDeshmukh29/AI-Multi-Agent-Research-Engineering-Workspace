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
      // TODO: Show an error toast
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    if (!activeProject || !activeRoadmap) return;
    try {
      const updatedRoadmap = await updateRoadmapTask(activeProject.id, taskId, completed);
      setActiveRoadmap(updatedRoadmap);
    } catch (error) {
      console.error("Failed to update task", error);
      // TODO: Show an error toast
    }
  };

  if (isLoading) {
    return <div>Loading Roadmap...</div>;
  }

  if (!activeRoadmap) {
    return (
      <div>
        <h2>No Roadmap Found</h2>
        <p>Generate a roadmap for this project.</p>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate Roadmap"}
        </Button>
      </div>
    );
  }

  return <RoadmapPanel roadmap={activeRoadmap} onTaskToggle={handleTaskToggle} />;
}
