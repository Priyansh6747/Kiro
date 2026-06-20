"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project, Task } from "@/lib/types";
import { formatTimestamp } from "@/lib/types";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import {
  listProjects,
  listTasks,
  updateTask,
  archiveProject,
  updateProject,
  createTask,
} from "@/lib/api-client";
import {
  LoadingScreen,
  ErrorBanner,
  EmptyState,
  SectionHeader,
  TypeBadge,
  StatusBadge,
  ProgressBar,
  TaskRow,
  QuickCapture,
  CreateProjectForm,
} from "@/components/ui";
import { DependencyChart } from "@/components/DependencyChart";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  taskCount,
  doneCount,
  activity,
  onClick,
}: {
  project: Project;
  taskCount: number;
  doneCount: number;
  activity: { day: number; completed: number }[];
  onClick: () => void;
}) {
  const pct = taskCount > 0 ? doneCount / taskCount : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded border border-border-default bg-surface p-4 hover:shadow-sm transition-shadow flex flex-col gap-3"
    >
      {/* Top Row: Title and Badges */}
      <div className="w-full flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-semibold text-primary text-base truncate">{project.name}</p>
          <TypeBadge type={project.type} />
        </div>
        <div className="shrink-0 flex items-center gap-2 text-xs font-medium text-tertiary px-2 py-1 bg-surface-hover rounded">
          <span>P{project.importance}</span>
        </div>
      </div>

      {/* Bottom Row: Details and Sparkline */}
      <div className="w-full flex items-end justify-between gap-4 mt-1">
        <div className="flex flex-col gap-2 w-full max-w-[200px]">
          {project.deadlineAt && (
            <p className="text-xs text-orange-500">
              Due {formatTimestamp(project.deadlineAt)}
            </p>
          )}
          {taskCount > 0 ? (
            <div className="space-y-1.5 w-full">
              <div className="flex justify-between text-[10px] text-secondary">
                <span>{doneCount}/{taskCount} tasks</span>
                <span>{Math.round(pct * 100)}%</span>
              </div>
              <ProgressBar value={doneCount} max={taskCount} color="blue" />
            </div>
          ) : (
            <p className="text-xs text-tertiary">No tasks yet</p>
          )}
        </div>

        {/* Sparkline on the far right */}
        {activity && activity.length > 0 && activity.some((a) => a.completed > 0) && (
          <div className="h-8 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activity}>
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#10b981" 
                  strokeWidth={1.5} 
                  dot={false} 
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </button>
  );
}

import { ProjectWorkspace } from "@/components/ProjectWorkspace";
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskStats, setTaskStats] = useState<
    Record<string, { total: number; done: number; activity: { day: number; completed: number }[] }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projs = await listProjects();
      setProjects(projs);

      // Load task stats per project concurrently
      const statsEntries = await Promise.all(
        projs.map(async (p) => {
          const tasks = await listTasks({ project_id: p.id });
          
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
          const activity = [];
          for (let i = 13; i >= 0; i--) {
            const dayStart = todayStart - i * 86400;
            const dayEnd = dayStart + 86400;
            const completed = tasks.filter(
              (t) => t.status === "done" && t.completedAt && t.completedAt >= dayStart && t.completedAt < dayEnd
            ).length;
            activity.push({ day: i, completed });
          }

          return [
            p.id,
            {
              total: tasks.length,
              done: tasks.filter((t) => t.status === "done").length,
              activity,
            },
          ] as const;
        }),
      );
      setTaskStats(Object.fromEntries(statsEntries));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingScreen message="Loading projects…" />;
  if (error)
    return (
      <div className="p-4">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );

  if (selectedProject) {
    return (
      <ProjectWorkspace
        project={selectedProject}
        allProjects={projects}
        onBack={() => setSelectedProject(null)}
        onProjectUpdated={(p) => {
          setProjects((prev) => prev.map((x) => (x.id === p.id ? p : x)));
          setSelectedProject(p);
        }}
        onProjectArchived={(id) => {
          setProjects((prev) => prev.filter((x) => x.id !== id));
          setSelectedProject(null);
        }}
      />
    );
  }

  // Group projects by type
  const groups: Record<string, Project[]> = {
    critical: [],
    recurring: [],
    habit: [],
    nicetohave: [],
  };
  for (const p of projects) {
    if (!p.isDefault) groups[p.type]?.push(p);
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface">
        <h1 className="font-semibold text-primary">Projects</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          + New Project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {(["critical", "recurring", "habit", "nicetohave"] as const).map(
          (type) => {
            const items = groups[type];
            if (!items || items.length === 0) return null;
            return (
              <section key={type}>
                <p className="text-xs font-semibold text-tertiary uppercase mb-2">
                  {type === "nicetohave"
                    ? "Nice To Have"
                    : type.charAt(0).toUpperCase() + type.slice(1)}
                </p>
                <div className="space-y-3">
                  {items.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      taskCount={taskStats[p.id]?.total ?? 0}
                      doneCount={taskStats[p.id]?.done ?? 0}
                      activity={taskStats[p.id]?.activity ?? []}
                      onClick={() => setSelectedProject(p)}
                    />
                  ))}
                </div>
              </section>
            );
          },
        )}

        {projects.filter((p) => !p.isDefault).length === 0 && (
          <EmptyState
            icon="📁"
            title="No projects yet"
            description='Create your first project using "+ New Project".'
          />
        )}
      </div>

      {showCreate && (
        <CreateProjectForm
          onCreated={(p) => {
            setProjects((prev) => [p, ...prev]);
            setTaskStats((prev) => ({
              ...prev,
              [p.id]: { total: 0, done: 0, activity: [] },
            }));
            setShowCreate(false);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
