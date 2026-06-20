"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project } from "@/lib/types";
import { listProjects } from "@/lib/api-client";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";
import { LoadingScreen, ErrorBanner } from "@/components/ui";

export default function TodoPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [todoProject, setTodoProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projs = await listProjects();
      setProjects(projs);
      
      const defaultProject = projs.find(p => p.isDefault);
      if (!defaultProject) {
        throw new Error("Todo project not found");
      }
      setTodoProject(defaultProject);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingScreen message="Loading Todo…" />;
  if (error)
    return (
      <div className="p-4">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );

  if (todoProject) {
    return (
      <ProjectWorkspace
        project={todoProject}
        allProjects={projects}
        onProjectUpdated={(p) => setTodoProject(p)}
        onProjectArchived={() => {}} // Cannot archive default
      />
    );
  }

  return null;
}
