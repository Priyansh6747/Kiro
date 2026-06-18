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
      className="w-full text-left rounded border bg-white p-4 hover:shadow-sm transition-shadow space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-800 text-sm">{project.name}</p>
          {project.deadlineAt && (
            <p className="text-xs text-orange-500 mt-0.5">
              Due {formatTimestamp(project.deadlineAt)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <TypeBadge type={project.type} />
          <span className="text-xs text-gray-400">P{project.importance}</span>
        </div>
      </div>

      {taskCount > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{doneCount}/{taskCount} tasks</span>
            <span>{Math.round(pct * 100)}%</span>
          </div>
          <ProgressBar value={doneCount} max={taskCount} color="blue" />
        </div>
      )}

      {taskCount === 0 && (
        <p className="text-xs text-gray-400">No tasks yet</p>
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
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editImportance, setEditImportance] = useState(project.importance);
  const [editType, setEditType] = useState(project.type);
  const [editDeadline, setEditDeadline] = useState(
    project.deadlineAt
      ? new Date(project.deadlineAt * 1000).toISOString().split("T")[0]
      : ""
  );
  const [savingEdit, setSavingEdit] = useState(false);

  // Dependency management state
  const [depTaskId, setDepTaskId] = useState("");
  const [depPredId, setDepPredId] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTasks({ project_id: project.id });
      setTasks(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

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
      alert((e as Error).message);
    }
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
    } catch (e) {
      alert((e as Error).message);
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

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const doneTasks = tasks.filter((t) => t.status === "done");

  // Compute a simple timeline from task deadlines
  const tasksByDeadline = [...tasks]
    .filter((t) => t.deadlineAt)
    .sort((a, b) => (a.deadlineAt ?? 0) - (b.deadlineAt ?? 0));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3">
        <button
          onClick={onBack}
          className="text-xs text-blue-600 hover:underline mb-2 block"
        >
          ← Back to Projects
        </button>

        {editing ? (
          <form onSubmit={saveProjectEdit} className="space-y-2">
            <input
              autoFocus
              required
              className="w-full border rounded px-2 py-1 text-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
              <select
                className="border rounded px-2 py-1 text-sm"
                value={editType}
                onChange={(e) => setEditType(e.target.value as typeof editType)}
              >
                <option value="critical">Critical</option>
                <option value="recurring">Recurring</option>
                <option value="habit">Habit</option>
                <option value="nicetohave">Nice To Have</option>
              </select>
              <select
                className="border rounded px-2 py-1 text-sm"
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
                  className="border rounded px-2 py-1 text-sm"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                />
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingEdit}
                className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded border px-3 py-1 text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-800">{project.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <TypeBadge type={project.type} />
                <span className="text-xs text-gray-400">P{project.importance}</span>
                {project.deadlineAt && (
                  <span className="text-xs text-orange-500">
                    Due {formatTimestamp(project.deadlineAt)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-gray-500 hover:underline"
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

      {/* Timeline */}
      {tasksByDeadline.length > 0 && (
        <div className="border-b bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Timeline</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {tasksByDeadline.map((t) => (
              <div
                key={t.id}
                className="shrink-0 bg-white border rounded px-3 py-2 text-xs"
              >
                <p className="font-medium text-gray-700 max-w-[120px] truncate">{t.title}</p>
                <p className="text-gray-400">{formatTimestamp(t.deadlineAt)}</p>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content: task list + detail */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* Task List */}
        <div className="flex-1 flex flex-col min-w-0 border-r">
          <SectionHeader
            title={`Tasks (${tasks.length})`}
            action={
              <button
                onClick={() => setShowCapture(true)}
                className="text-xs text-blue-600 hover:underline"
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
                  className={`cursor-pointer ${selectedTask?.id === task.id ? "bg-blue-50" : ""}`}
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

        {/* Task Detail Panel */}
        <div className="w-full md:w-72 shrink-0 bg-white border-t md:border-t-0">
          {selectedTask ? (
            <TaskDetailPanel
              task={selectedTask}
              allTasks={tasks}
              onUpdated={handleTaskUpdated}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-gray-400 text-sm">
              Select a task to view details
            </div>
          )}
        </div>
      </div>

      {showCapture && (
        <QuickCapture
          projects={allProjects.filter((p) => p.id === project.id)}
          defaultProjectId={project.id}
          onCreated={(task) => {
            handleTaskCreated(task);
            setShowCapture(false);
          }}
          onClose={() => setShowCapture(false)}
        />
      )}
    </div>
  );
}

// ── Task Detail Panel ─────────────────────────────────────────────────────────

function TaskDetailPanel({
  task,
  allTasks,
  onUpdated,
}: {
  task: Task;
  allTasks: Task[];
  onUpdated: (t: Task) => void;
}) {
  const [notes, setNotes] = useState("");
  const [depPredId, setDepPredId] = useState("");
  const [addingDep, setAddingDep] = useState(false);
  const [depError, setDepError] = useState<string | null>(null);

  const otherTasks = allTasks.filter((t) => t.id !== task.id);

  const addDep = async () => {
    if (!depPredId) return;
    setAddingDep(true);
    setDepError(null);
    try {
      const { addDependency } = await import("@/lib/api-client");
      await addDependency(task.id, depPredId);
      setDepPredId("");
    } catch (e) {
      setDepError((e as Error).message);
    } finally {
      setAddingDep(false);
    }
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Task</p>
        <p className="text-sm font-medium text-gray-800">{task.title}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-gray-400 mb-0.5">Status</p>
          <StatusBadge status={task.status} />
        </div>
        <div>
          <p className="text-gray-400 mb-0.5">Estimate</p>
          <p className="font-medium">{task.estimateMin}m</p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5">Deadline</p>
          <p className="font-medium">{formatTimestamp(task.deadlineAt)}</p>
        </div>
        <div>
          <p className="text-gray-400 mb-0.5">Created</p>
          <p className="font-medium">{formatTimestamp(task.createdAt)}</p>
        </div>
      </div>

      {/* Status quick-change */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Change Status</p>
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
                  alert((e as Error).message);
                }
              }}
              className={`rounded px-2 py-1 text-xs border ${
                task.status === s
                  ? "bg-gray-100 text-gray-400"
                  : "hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Dependencies */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Dependencies</p>
        <div className="flex gap-1">
          <select
            className="flex-1 border rounded px-2 py-1 text-xs"
            value={depPredId}
            onChange={(e) => setDepPredId(e.target.value)}
          >
            <option value="">Select predecessor…</option>
            {otherTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <button
            disabled={!depPredId || addingDep}
            onClick={addDep}
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {addingDep ? "…" : "Add"}
          </button>
        </div>
        {depError && <p className="text-xs text-red-600 mt-1">{depError}</p>}
        <p className="text-xs text-gray-400 mt-1">
          This task depends on the selected task.
        </p>
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
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <h1 className="font-semibold text-gray-800">Projects</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          + New Project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Default / Todo project */}
        {defaultProject && (
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Inbox / Todo</p>
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
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
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
