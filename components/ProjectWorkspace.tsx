"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DependencyChart } from "@/components/DependencyChart";
import { QuickCapture } from "@/components/ui";
import { useToast } from "@/hooks/useToast";
import { listTasks } from "@/lib/api-client";
import type { Project, Task } from "@/lib/types";
import { EmptyTaskDetail } from "./Project/EmptyTaskDetail";
import { ProjectHeader } from "./Project/ProjectHeader";
import { ProjectProgressBar } from "./Project/ProjectProgressBar";
import { TaskDetailPanel } from "./Project/TaskDetailPanel";
import { TaskListCategory } from "./Project/TaskListCategory";

export function ProjectWorkspace({
  project,
  allProjects,
  onBack,
  onProjectUpdated,
  onProjectArchived,
}: {
  project: Project;
  allProjects: Project[];
  onBack?: () => void;
  onProjectUpdated: (p: Project) => void;
  onProjectArchived: (id: string) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [capturePredecessorId, setCapturePredecessorId] = useState<
    string | undefined
  >();
  const [dependencies, setDependencies] = useState<
    { taskId: string; predecessorId: string }[]
  >([]);

  const { showToast } = useToast();

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { getProjectDependencies } = await import("@/lib/api-client");
      const [data, deps] = await Promise.all([
        listTasks({ project_id: project.id }),
        getProjectDependencies(project.id),
      ]);
      setTasks(data);
      setDependencies(deps);
    } catch (e) {
      setError((e as Error).message);
      showToast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [project.id, showToast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleTaskUpdated = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask((prev) => (prev?.id === updated.id ? updated : prev));
  };

  const handleTaskCreated = (task: Task | Task[]) => {
    if (Array.isArray(task)) {
      setTasks((prev) => [...prev, ...task]);
    } else {
      setTasks((prev) => [...prev, task]);
    }
  };

  const now = new Date();
  const todayStart =
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;

  const activityData = useMemo(() => {
    const activity = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = todayStart - i * 86400;
      const dayEnd = dayStart + 86400;
      const completed = tasks.filter(
        (t) =>
          t.status === "done" &&
          t.completedAt &&
          t.completedAt >= dayStart &&
          t.completedAt < dayEnd,
      ).length;
      activity.push({ day: i, completed });
    }
    return activity;
  }, [tasks, todayStart]);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done");
  const notDoneTasks = tasks.filter((t) => t.status !== "done");

  const lockedTaskIds = new Set<string>();
  for (const dep of dependencies) {
    const pred = tasks.find((t) => t.id === dep.predecessorId);
    if (pred && pred.status !== "done") {
      lockedTaskIds.add(dep.taskId);
    }
  }

  const lockedTasks = notDoneTasks.filter((t) => lockedTaskIds.has(t.id));
  const readyTasks = notDoneTasks.filter((t) => !lockedTaskIds.has(t.id));

  const donePct = totalTasks > 0 ? (doneTasks.length / totalTasks) * 100 : 0;
  const readyPct = totalTasks > 0 ? (readyTasks.length / totalTasks) * 100 : 0;
  const lockedPct =
    totalTasks > 0 ? (lockedTasks.length / totalTasks) * 100 : 0;

  return (
    <div className="flex flex-col flex-1 h-full bg-base overflow-hidden relative">
      <ProjectHeader
        project={project}
        onBack={onBack}
        activityData={activityData}
        onProjectUpdated={onProjectUpdated}
      />
      <ProjectProgressBar
        donePct={donePct}
        readyPct={readyPct}
        lockedPct={lockedPct}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left Tasks Column */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-base relative">
          {/* Mobile Graph Preview */}
          <div className="md:hidden h-[240px] -mx-6 -mt-6 mb-2 border-b border-border-default p-4 relative bg-surface-raised/50 group">
            <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-base/40 backdrop-blur-[2px]">
              <button
                onClick={() => setShowGraphModal(true)}
                className="px-4 py-2 bg-accent text-white font-semibold text-sm rounded-lg shadow hover:bg-blue-700 transition-colors"
              >
                Expand Graph
              </button>
            </div>
            <DependencyChart
              tasks={tasks}
              dependencies={dependencies}
              preview
            />
          </div>

          <button
            onClick={() => {
              setCapturePredecessorId(undefined);
              setShowCapture(true);
            }}
            className="absolute top-6 right-6 text-sm font-semibold text-accent hover:underline"
          >
            + Add Task
          </button>

          <TaskListCategory
            title="Ready"
            tasks={readyTasks}
            state="ready"
            selectedTaskId={selectedTask?.id}
            onSelectTask={setSelectedTask}
            emptyMessage="No tasks ready to start."
          />
          <TaskListCategory
            title="Locked"
            tasks={lockedTasks}
            state="locked"
            selectedTaskId={selectedTask?.id}
            onSelectTask={setSelectedTask}
          />
          <TaskListCategory
            title="Done"
            tasks={doneTasks}
            state="done"
            selectedTaskId={selectedTask?.id}
            onSelectTask={setSelectedTask}
          />
        </div>

        {/* Mobile Task Details Overlay */}
        <div 
          className={`
            md:hidden fixed inset-0 z-50 flex flex-col bg-surface shadow-2xl transition-transform duration-300
            ${selectedTask ? "translate-x-0" : "translate-x-full"}
          `}
        >
          <div className="flex px-4 py-4 border-b border-border-default bg-surface items-center justify-between shrink-0">
            <h2 className="text-sm font-bold text-tertiary uppercase tracking-widest">
              Task Details
            </h2>
            <button
              onClick={() => setSelectedTask(null)}
              className="p-2 -mr-2 rounded-full hover:bg-surface-raised text-secondary hover:text-primary transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-surface">
            {selectedTask ? (
              <TaskDetailPanel
                task={selectedTask}
                allTasks={tasks}
                dependencies={dependencies}
                onUpdated={handleTaskUpdated}
                onDependencyAdded={loadTasks}
                onDependencyRemoved={loadTasks}
              />
            ) : (
              <EmptyTaskDetail />
            )}
          </div>
        </div>

        {/* Right Sidebar (Desktop Only) */}
        <div className="hidden md:flex w-[420px] flex-col shrink-0 border-l border-border-default bg-surface shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
          {/* Dependency Chart Preview */}
          <div className="h-[280px] border-b border-border-default p-4 shrink-0 relative bg-surface-raised/50 group">
            <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-base/40 backdrop-blur-[2px]">
              <button
                onClick={() => setShowGraphModal(true)}
                className="px-4 py-2 bg-accent text-white font-semibold text-sm rounded-lg shadow hover:bg-blue-700 transition-colors"
              >
                Expand Graph
              </button>
            </div>
            <DependencyChart
              tasks={tasks}
              dependencies={dependencies}
              preview
            />
          </div>

          {/* Task Details */}
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-surface">
            <div className="p-4 border-b border-border-default shrink-0">
              <h2 className="text-sm font-bold text-primary tracking-wide">
                Details
              </h2>
            </div>
            {selectedTask ? (
              <TaskDetailPanel
                task={selectedTask}
                allTasks={tasks}
                dependencies={dependencies}
                onUpdated={handleTaskUpdated}
                onDependencyAdded={loadTasks}
                onDependencyRemoved={loadTasks}
              />
            ) : (
              <EmptyTaskDetail />
            )}
          </div>
        </div>
      </div>

      {showGraphModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm p-8">
          <div className="w-full h-full max-w-7xl max-h-[90vh] flex flex-col bg-surface border border-border-default rounded-xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border-default bg-surface-raised shrink-0">
              <h2 className="text-xl font-bold text-primary">
                Dependency Graph
              </h2>
              <button
                onClick={() => setShowGraphModal(false)}
                className="text-secondary hover:text-primary transition-colors text-sm font-semibold"
              >
                Close ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-6 bg-base">
              <DependencyChart
                tasks={tasks}
                dependencies={dependencies}
                onAddDependency={async (taskId, predecessorId) => {
                  try {
                    const { addDependency } = await import("@/lib/api-client");
                    await addDependency(taskId, predecessorId);
                    loadTasks();
                    showToast("Dependency added", "success");
                  } catch (e) {
                    showToast((e as Error).message, "error");
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showCapture && (
        <QuickCapture
          projects={allProjects.filter((p) => p.id === project.id)}
          defaultProjectId={project.id}
          defaultPredecessorId={capturePredecessorId}
          tasks={tasks}
          onCreated={(task) => {
            handleTaskCreated(task);
            setShowCapture(false);
            setCapturePredecessorId(undefined);
            loadTasks();
          }}
          onClose={() => {
            setShowCapture(false);
            setCapturePredecessorId(undefined);
          }}
        />
      )}
    </div>
  );
}
