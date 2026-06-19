"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project, Task } from "@/lib/types";
import { formatTimestamp } from "@/lib/types";
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

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  taskCount,
  doneCount,
  onClick,
}: {
  project: Project;
  taskCount: number;
  doneCount: number;
  onClick: () => void;
}) {
  const pct = taskCount > 0 ? doneCount / taskCount : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded border border-border-default bg-surface p-4 hover:shadow-sm transition-shadow space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-primary text-sm">{project.name}</p>
          {project.deadlineAt && (
            <p className="text-xs text-orange-500 mt-0.5">
              Due {formatTimestamp(project.deadlineAt)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <TypeBadge type={project.type} />
          <span className="text-xs text-tertiary">P{project.importance}</span>
        </div>
      </div>

      {taskCount > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-secondary">
            <span>{doneCount}/{taskCount} tasks</span>
            <span>{Math.round(pct * 100)}%</span>
          </div>
          <ProgressBar value={doneCount} max={taskCount} color="blue" />
        </div>
      )}

      {taskCount === 0 && (
        <p className="text-xs text-tertiary">No tasks yet</p>
      )}
    </button>
  );
}

// ── Project Workspace ─────────────────────────────────────────────────────────

function ProjectWorkspace({
  project,
  allProjects,
  onBack,
  onProjectUpdated,
  onProjectArchived,
}: {
  project: Project;
  allProjects: Project[];
  onBack: () => void;
  onProjectUpdated: (p: Project) => void;
  onProjectArchived: (id: string) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [capturePredecessorId, setCapturePredecessorId] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const { showToast } = useToast();

  const [editName, setEditName] = useState(project.name);
  const [editImportance, setEditImportance] = useState(project.importance);
  const [editType, setEditType] = useState(project.type);
  const [editDeadline, setEditDeadline] = useState(
    project.deadlineAt
      ? new Date(project.deadlineAt * 1000).toISOString().split("T")[0]
      : ""
  );

  // Dependency management state
  const [depTaskId, setDepTaskId] = useState("");
  const [depPredId, setDepPredId] = useState("");
  const [dependencies, setDependencies] = useState<{ taskId: string; predecessorId: string }[]>([]);
  const [showChart, setShowChart] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { getProjectDependencies } = await import("@/lib/api-client");
      const [data, deps] = await Promise.all([
        listTasks({ project_id: project.id }),
        getProjectDependencies(project.id)
      ]);
      setTasks(data);
      setDependencies(deps);
    } catch (e) {
      setError((e as Error).message);
      showToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [project.id, showToast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleArchive = async () => {
    if (!confirm(`Archive project "${project.name}"?`)) return;
    try {
      await archiveProject(project.id);
      onProjectArchived(project.id);
      onBack();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const exportTasksToJson = () => {
    const taskMap = new Map<string, any>();
    tasks.forEach(t => {
      taskMap.set(t.id, {
        id: t.id,
        title: t.title,
        estimate_min: t.estimateMin,
        deadline: t.deadlineAt ? new Date(t.deadlineAt * 1000).toISOString().split('T')[0] : undefined,
        subtasks: [],
        depends_on: dependencies.filter(d => d.taskId === t.id).map(d => d.predecessorId)
      });
    });

    const roots: any[] = [];
    tasks.forEach(t => {
      if (t.parentId && taskMap.has(t.parentId)) {
        taskMap.get(t.parentId).subtasks.push(taskMap.get(t.id));
      } else {
        roots.push(taskMap.get(t.id));
      }
    });

    const clean = (item: any) => {
      if (item.subtasks.length === 0) delete item.subtasks;
      if (item.depends_on.length === 0) delete item.depends_on;
      if (item.subtasks) item.subtasks.forEach(clean);
    };
    roots.forEach(clean);

    const jsonStr = JSON.stringify(roots, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_${project.name.replace(/\s+/g, '_')}_tasks.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveProjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      let cadence: "daily" | "weekly" | "custom" | undefined;
      if (editType === "habit") cadence = "daily";
      else if (editType === "recurring") {
        cadence = "custom";
      }

      const updated = await updateProject(project.id, {
        name: editName.trim(),
        importance: editImportance,
        type: editType,
        cadence,
        deadline_at: (editType !== "habit" && editType !== "recurring" && editDeadline)
          ? Math.floor(new Date(editDeadline).getTime() / 1000)
          : null,
      });
      onProjectUpdated(updated);
      setEditing(false);
      showToast("Project updated", 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleTaskUpdated = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (selectedTask?.id === updated.id) setSelectedTask(updated);
  };

  const handleTaskCreated = (task: Task | Task[]) => {
    if (Array.isArray(task)) {
      setTasks((prev) => [...prev, ...task]);
    } else {
      setTasks((prev) => [...prev, task]);
    }
  };

  const tasksByDeadline = [...tasks]
    .filter((t) => t.deadlineAt)
    .sort((a, b) => (a.deadlineAt ?? 0) - (b.deadlineAt ?? 0));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b border-border-default bg-surface px-4 py-3">
        <button
          onClick={onBack}
          className="text-xs text-accent hover:underline mb-2 block"
        >
          ← Back to Projects
        </button>

        {editing ? (
          <form onSubmit={saveProjectEdit} className="space-y-2">
            <input
              autoFocus
              required
              className="w-full border border-border-default rounded px-2 py-1 text-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
              <select
                className="border border-border-default rounded px-2 py-1 text-sm"
                value={editType}
                onChange={(e) => setEditType(e.target.value as typeof editType)}
              >
                <option value="critical">Critical</option>
                <option value="recurring">Recurring</option>
                <option value="habit">Habit</option>
                <option value="nicetohave">Nice To Have</option>
              </select>
              <select
                className="border border-border-default rounded px-2 py-1 text-sm"
                value={editImportance}
                onChange={(e) => setEditImportance(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <option key={i} value={i}>
                    P{i}
                  </option>
                ))}
              </select>
              {(editType === "critical" || editType === "nicetohave") && (
                <input
                  type="date"
                  className="border border-border-default rounded px-2 py-1 text-sm"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                />
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingEdit}
                className="rounded bg-accent px-3 py-1 text-xs text-white hover:bg-blue-700"
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded border border-border-default px-3 py-1 text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-primary">{project.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <TypeBadge type={project.type} />
                <span className="text-xs text-tertiary">P{project.importance}</span>
                {project.deadlineAt && (
                  <span className="text-xs text-orange-500">
                    Due {formatTimestamp(project.deadlineAt)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={exportTasksToJson}
                className="text-xs text-secondary hover:underline"
              >
                Export
              </button>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-secondary hover:underline"
              >
                Edit
              </button>
              {!project.isDefault && (
                <button
                  onClick={handleArchive}
                  className="text-xs text-red-500 hover:underline"
                >
                  Archive
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {tasksByDeadline.length > 0 && (
        <div className="border-b border-border-default bg-surface-raised px-4 py-3">
          <p className="text-xs font-semibold text-secondary uppercase mb-2">Timeline</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {tasksByDeadline.map((t) => (
              <div
                key={t.id}
                className="shrink-0 bg-surface border border-border-default rounded px-3 py-2 text-xs"
              >
                <p className="font-medium text-secondary max-w-[120px] truncate">{t.title}</p>
                <p className="text-tertiary">{formatTimestamp(t.deadlineAt)}</p>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-2 bg-surface-raised border-b border-border-default flex items-center justify-between">
        <p className="text-xs font-semibold text-secondary uppercase">Dependency Chart</p>
        <button onClick={() => setShowChart(!showChart)} className="text-xs text-accent hover:underline">
          {showChart ? "Hide Chart" : "Show Chart"}
        </button>
      </div>
      {showChart && (
         <div className="p-4 border-b border-border-default bg-surface relative">
           <DependencyChart 
             tasks={tasks} 
             dependencies={dependencies} 
             onAddSubtask={(predId) => {
               setCapturePredecessorId(predId);
               setShowCapture(true);
             }}
           />
         </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-border-default">
          <SectionHeader
            title={`Tasks (${tasks.length})`}
            action={
              <button
                onClick={() => {
                  setCapturePredecessorId(undefined);
                  setShowCapture(true);
                }}
                className="text-xs text-accent hover:underline"
              >
                + Add
              </button>
            }
          />

          {loading ? (
            <LoadingScreen />
          ) : error ? (
            <div className="p-4"><ErrorBanner message={error} onRetry={loadTasks} /></div>
          ) : tasks.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No tasks yet"
              description="Add tasks to get started."
            />
          ) : (
            <div className="flex flex-col overflow-y-auto">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`cursor-pointer ${selectedTask?.id === task.id ? "bg-accent-subtle" : ""}`}
                  onClick={() => setSelectedTask(task)}
                >
                  <TaskRow
                    task={task}
                    projects={allProjects}
                    onUpdated={handleTaskUpdated}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-full md:w-72 shrink-0 bg-surface border-t border-border-default md:border-t-0">
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
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-tertiary text-sm">
              Select a task to view details
            </div>
          )}
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

// ── Task Detail Panel ─────────────────────────────────────────────────────────

function TaskDetailPanel({
  task,
  allTasks,
  dependencies,
  onUpdated,
  onDependencyAdded,
  onDependencyRemoved,
}: {
  task: Task;
  allTasks: Task[];
  dependencies: { taskId: string; predecessorId: string }[];
  onUpdated: (t: Task) => void;
  onDependencyAdded?: () => void;
  onDependencyRemoved?: () => void;
}) {
  const [depPredId, setDepPredId] = useState("");
  const [addingDep, setAddingDep] = useState(false);
  const [depError, setDepError] = useState<string | null>(null);

  const { showToast } = useToast();

  const otherTasks = allTasks.filter((t) => t.id !== task.id);
  const currentDeps = dependencies.filter((d) => d.taskId === task.id);
  
  const removeDep = async (predId: string) => {
    try {
      const { deleteDependency } = await import("@/lib/api-client");
      await deleteDependency(task.id, predId);
      onDependencyRemoved?.();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const addDep = async () => {
    if (!depPredId) return;
    setAddingDep(true);
    setDepError(null);
    try {
      const { addDependency } = await import("@/lib/api-client");
      await addDependency(task.id, depPredId);
      setDepPredId("");
      onDependencyAdded?.();
    } catch (e) {
      setDepError((e as Error).message);
    } finally {
      setAddingDep(false);
    }
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <div>
        <p className="text-xs font-semibold text-secondary uppercase mb-1">Task</p>
        <p className="text-sm font-medium text-primary">{task.title}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-tertiary mb-0.5">Status</p>
          <StatusBadge status={task.status} />
        </div>
        <div>
          <p className="text-tertiary mb-0.5">Estimate</p>
          <p className="font-medium">{task.estimateMin}m</p>
        </div>
        <div>
          <p className="text-tertiary mb-0.5">Deadline</p>
          <p className="font-medium">{formatTimestamp(task.deadlineAt)}</p>
        </div>
        <div>
          <p className="text-tertiary mb-0.5">Created</p>
          <p className="font-medium">{formatTimestamp(task.createdAt)}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-secondary uppercase mb-1">Change Status</p>
        <div className="flex flex-wrap gap-1">
          {(["pending", "done", "missed"] as const).map((s) => (
            <button
              key={s}
              disabled={task.status === s}
              onClick={async () => {
                try {
                  const updated = await updateTask(task.id, { status: s });
                  onUpdated(updated);
                } catch (e) {
                  showToast((e as Error).message, 'error');
                }
              }}
              className={`rounded px-2 py-1 text-xs border border-border-default ${
                task.status === s
                  ? "bg-surface-raised text-tertiary"
                  : "hover:bg-surface-raised"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-secondary uppercase mb-1">Dependencies</p>
        
        {currentDeps.length > 0 && (
          <div className="space-y-1 mb-3">
            {currentDeps.map((dep) => {
              const predTask = allTasks.find(t => t.id === dep.predecessorId);
              return (
                <div key={dep.predecessorId} className="flex items-center justify-between bg-surface-raised border border-border-default rounded px-2 py-1 text-xs">
                  <span className="truncate flex-1 mr-2">{predTask?.title || "Unknown task"}</span>
                  <button
                    onClick={() => removeDep(dep.predecessorId)}
                    className="text-red-400 hover:text-red-600 font-bold px-1"
                    title="Remove dependency"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-1">
          <select
            className="flex-1 border border-border-default rounded px-2 py-1 text-xs"
            value={depPredId}
            onChange={(e) => setDepPredId(e.target.value)}
          >
            <option value="">Select predecessor…</option>
            {otherTasks
              .filter(t => !currentDeps.some(d => d.predecessorId === t.id))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
            ))}
          </select>
          <button
            disabled={!depPredId || addingDep}
            onClick={addDep}
            className="rounded bg-accent px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {addingDep ? "…" : "Add"}
          </button>
        </div>
        {depError && <p className="text-xs text-red-600 mt-1">{depError}</p>}
      </div>
    </div>
  );
}

// ── Main Projects Page ────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskStats, setTaskStats] = useState<
    Record<string, { total: number; done: number }>
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
          return [
            p.id,
            {
              total: tasks.length,
              done: tasks.filter((t) => t.status === "done").length,
            },
          ] as const;
        })
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

  const defaultProject = projects.find((p) => p.isDefault);

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
        {/* Default / Todo project */}
        {defaultProject && (
          <section>
            <p className="text-xs font-semibold text-tertiary uppercase mb-2">Inbox / Todo</p>
            <ProjectCard
              project={defaultProject}
              taskCount={taskStats[defaultProject.id]?.total ?? 0}
              doneCount={taskStats[defaultProject.id]?.done ?? 0}
              onClick={() => setSelectedProject(defaultProject)}
            />
          </section>
        )}

        {(["critical", "recurring", "habit", "nicetohave"] as const).map((type) => {
          const items = groups[type];
          if (!items || items.length === 0) return null;
          return (
            <section key={type}>
              <p className="text-xs font-semibold text-tertiary uppercase mb-2">
                {type === "nicetohave" ? "Nice To Have" : type.charAt(0).toUpperCase() + type.slice(1)}
              </p>
              <div className="space-y-3">
                {items.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    taskCount={taskStats[p.id]?.total ?? 0}
                    doneCount={taskStats[p.id]?.done ?? 0}
                    onClick={() => setSelectedProject(p)}
                  />
                ))}
              </div>
            </section>
          );
        })}

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
            setTaskStats((prev) => ({ ...prev, [p.id]: { total: 0, done: 0 } }));
            setShowCreate(false);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
