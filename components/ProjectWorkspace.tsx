"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { Project, Task } from "@/lib/types";
import { listTasks } from "@/lib/api-client";
import { QuickCapture } from "@/components/ui";
import { DependencyChart } from "@/components/DependencyChart";
import { useToast } from "@/hooks/useToast";

import { ProjectHeader } from "./Project/ProjectHeader";
import { ProjectProgressBar } from "./Project/ProjectProgressBar";
import { TaskListCategory } from "./Project/TaskListCategory";
import { TaskDetailPanel } from "./Project/TaskDetailPanel";
import { EmptyTaskDetail } from "./Project/EmptyTaskDetail";

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
  const [capturePredecessorId, setCapturePredecessorId] = useState<string | undefined>();
  const [dependencies, setDependencies] = useState<{ taskId: string; predecessorId: string }[]>([]);

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
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  
  const activityData = useMemo(() => {
      const activity = [];
      for (let i = 13; i >= 0; i--) {
          const dayStart = todayStart - i * 86400;
          const dayEnd = dayStart + 86400;
          const completed = tasks.filter(
              (t) => t.status === "done" && t.completedAt && t.completedAt >= dayStart && t.completedAt < dayEnd
          ).length;
          activity.push({ day: i, completed });
      }
      return activity;
  }, [tasks, todayStart]);

  const doneCount = tasks.filter(t => t.status === "done").length;
  const pct = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0;

  const doneTasks = tasks.filter(t => t.status === "done");
  const notDoneTasks = tasks.filter(t => t.status !== "done");

  const lockedTaskIds = new Set<string>();
  for (const dep of dependencies) {
      const pred = tasks.find(t => t.id === dep.predecessorId);
      if (pred && pred.status !== "done") {
          lockedTaskIds.add(dep.taskId);
      }
  }

  const lockedTasks = notDoneTasks.filter(t => lockedTaskIds.has(t.id));
  const readyTasks = notDoneTasks.filter(t => !lockedTaskIds.has(t.id));

  return (
    <div className="flex flex-col flex-1 h-full bg-base overflow-hidden relative">
      <ProjectHeader project={project} onBack={onBack} activityData={activityData} />
      <ProjectProgressBar pct={pct} />

      <div className="flex flex-1 min-h-0">
          {/* Left Tasks Column */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-base relative">
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

          {/* Right Sidebar */}
          <div className="w-full md:w-[420px] flex flex-col shrink-0 border-l border-border-default bg-surface shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
              {/* Dependency Chart */}
              <div className="h-[280px] border-b border-border-default p-4 shrink-0 relative bg-surface-raised/50">
                   <DependencyChart tasks={tasks} dependencies={dependencies} onAddDependency={async (taskId, predecessorId) => {
                       try {
                         const { addDependency } = await import("@/lib/api-client");
                         await addDependency(taskId, predecessorId);
                         loadTasks();
                         showToast("Dependency added", "success");
                       } catch (e) {
                         showToast((e as Error).message, "error");
                       }
                   }} />
              </div>
              
              {/* Task Details */}
              <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-surface">
                   <div className="p-4 border-b border-border-default shrink-0">
                       <h2 className="text-sm font-bold text-primary tracking-wide">Details</h2>
                   </div>
                   {selectedTask ? (
                       <TaskDetailPanel task={selectedTask} allTasks={tasks} dependencies={dependencies} onUpdated={handleTaskUpdated} onDependencyAdded={loadTasks} onDependencyRemoved={loadTasks} />
                   ) : (
                       <EmptyTaskDetail />
                   )}
              </div>
          </div>
      </div>

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

