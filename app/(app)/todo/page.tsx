"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Project, Task } from "@/lib/types";
import {
  listProjects,
  listTasks,
  updateTask,
  deleteTask,
  getProjectDependencies,
  addDependency,
  deleteDependency,
} from "@/lib/api-client";
import { LoadingScreen, ErrorBanner } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

import { UnscheduledColumn } from "@/components/todo/UnscheduledColumn";
import { ScheduledTimelineColumn } from "@/components/todo/ScheduledTimelineColumn";
import { TaskDetailColumn } from "@/components/todo/TaskDetailColumn";

export default function TodoPage() {
  const [todoProject, setTodoProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<
    { taskId: string; predecessorId: string }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [timelineMode, setTimelineMode] = useState<"compact" | "continuous">(
    "continuous",
  );

  const todayRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to today
  useEffect(() => {
    if (timelineMode === "continuous" && todayRef.current && !loading) {
      todayRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [timelineMode, loading, tasks.length]);

  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projs = await listProjects();
      const defaultProject = projs.find((p) => p.isDefault);
      if (!defaultProject) throw new Error("Todo project not found");

      setTodoProject(defaultProject);

      const [fetchedTasks, deps] = await Promise.all([
        listTasks({ project_id: defaultProject.id }),
        getProjectDependencies(defaultProject.id),
      ]);
      setTasks(fetchedTasks);
      setDependencies(deps);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const prevTasks = [...tasks];
    setTasks((t) => t.map((x) => (x.id === taskId ? { ...x, ...updates } : x)));

    // We update selectedTask locally too
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, ...updates } : null));
    }

    try {
      await updateTask(taskId, updates);
    } catch (e) {
      showToast((e as Error).message, "error");
      setTasks(prevTasks);
      if (selectedTask?.id === taskId) {
        setSelectedTask(prevTasks.find((x) => x.id === taskId) || null);
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const prevTasks = [...tasks];
    setTasks((t) => t.filter((x) => x.id !== taskId));
    if (selectedTask?.id === taskId) setSelectedTask(null);
    try {
      await deleteTask(taskId);
    } catch (e) {
      showToast((e as Error).message, "error");
      setTasks(prevTasks);
    }
  };

  const handleAddTask = async () => {
    if (!todoProject) return;
    try {
      const { createTask } = await import("@/lib/api-client");
      const t = await createTask({
        project_id: todoProject.id,
        title: "New Task",
        estimate_min: 30,
      });
      setTasks((prev) => [...prev, t]);
      setSelectedTask(t);
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  };

  const addDep = async (taskId: string, predecessorId: string) => {
    if (!predecessorId) return;
    try {
      await addDependency(taskId, predecessorId);
      setDependencies((prev) => [...prev, { taskId, predecessorId }]);
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  };

  const removeDep = async (taskId: string, predecessorId: string) => {
    try {
      await deleteDependency(taskId, predecessorId);
      setDependencies((prev) =>
        prev.filter(
          (d) => !(d.taskId === taskId && d.predecessorId === predecessorId),
        ),
      );
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  };

  if (loading) return <LoadingScreen message="Loading Todo…" />;
  if (error)
    return (
      <div className="p-4">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );
  if (!todoProject) return null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface text-primary">
      <UnscheduledColumn
        tasks={tasks}
        selectedTask={selectedTask}
        todoProject={todoProject}
        onSelectTask={setSelectedTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onAddTask={handleAddTask}
      />

      <ScheduledTimelineColumn
        tasks={tasks}
        selectedTask={selectedTask}
        timelineMode={timelineMode}
        setTimelineMode={setTimelineMode}
        onSelectTask={setSelectedTask}
        todayRef={todayRef}
      />

      <TaskDetailColumn
        selectedTask={selectedTask}
        tasks={tasks}
        dependencies={dependencies}
        onUpdateTask={handleUpdateTask}
        onAddDep={addDep}
        onRemoveDep={removeDep}
      />
    </div>
  );
}
