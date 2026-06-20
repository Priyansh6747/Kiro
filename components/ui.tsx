"use client";

import { useState, useEffect } from "react";
import type { Project, ProjectType, Task, TaskStatus } from "@/lib/types";
import { formatTimestamp, formatMinutes } from "@/lib/types";
import {
  createTask,
  updateTask,
  deleteTask,
  createProject,
  ingestTasks,
} from "@/lib/api-client";
import { todayUnixDay } from "@/lib/types";
import { useConfirm } from "@/hooks/useConfirm";

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const classes = {
    sm: "h-4 w-4 border border-border-default-2",
    md: "h-6 w-6 border border-border-default-2",
    lg: "h-10 w-10 border border-border-default-4",
  }[size];
  return (
    <div
      className={`animate-spin rounded-full border border-border-default-gray-300 border-t border-border-default-blue-600 ${classes}`}
    />
  );
}

// ── Loading state ─────────────────────────────────────────────────────────────

export function LoadingScreen({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-secondary">
      <Spinner size="lg" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>⚠️</span>
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-2 rounded border border border-border-default-red-300 px-2 py-1 text-xs hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({
  icon = "📭",
  title,
  description,
}: {
  icon?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-tertiary">
      <span className="text-3xl">{icon}</span>
      <p className="text-sm font-medium text-secondary">{title}</p>
      {description && <p className="text-xs text-center max-w-xs">{description}</p>}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-surface sticky top-0 z-10">
      <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide">
        {title}
      </h2>
      {action}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "bg-surface-raised text-secondary",
  done: "bg-green-100 text-green-700",
  missed: "bg-red-100 text-red-700",
  carried: "bg-yellow-100 text-yellow-700",
  adjusted: "bg-blue-100 text-accent",
  deleted: "bg-surface-raised text-tertiary",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {status}
    </span>
  );
}

const TYPE_LABELS: Record<ProjectType, string> = {
  critical: "Critical",
  recurring: "Recurring",
  habit: "Habit",
  nicetohave: "Nice To Have",
};

export function TypeBadge({ type }: { type: ProjectType }) {
  const colors: Record<ProjectType, string> = {
    critical: "bg-red-50 text-red-700",
    recurring: "bg-accent-subtle text-accent",
    habit: "bg-purple-50 text-purple-700",
    nicetohave: "bg-surface-raised text-secondary",
  };
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${colors[type]}`}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

export function ProgressBar({
  value,
  max = 1,
  color = "blue",
}: {
  value: number;
  max?: number;
  color?: "blue" | "green" | "red" | "yellow";
}) {
  const pct = Math.min((value / max) * 100, 100);
  const bar = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-yellow-400",
  }[color];
  return (
    <div className="h-1.5 rounded-full bg-gray-200 w-full overflow-hidden">
      <div
        className={`h-full rounded-full ${bar} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────────

export function TaskRow({
  task,
  onUpdated,
  onDeleted,
  onUnscheduled,
  showProject,
  projects,
  animatingState,
  onDeleteRequested,
}: {
  task: Task;
  onUpdated: (t: Task) => void;
  onDeleted?: (id: string) => void;
  onUnscheduled?: (t: Task) => void;
  showProject?: boolean;
  projects?: Project[];
  animatingState?: 'loading' | 'success' | 'error';
  onDeleteRequested?: (t: Task) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(task.title);
  const [estimate, setEstimate] = useState(String(task.estimateMin));
  const { confirm, ConfirmModal } = useConfirm();

  const isDone = task.status === "done";

  const toggleDone = async () => {
    setSaving(true);
    setError(null);
    try {
      const newStatus: TaskStatus = isDone ? "pending" : "done";
      const updated = await updateTask(task.id, { status: newStatus });
      onUpdated(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTask(task.id, {
        title: title.trim(),
        estimate_min: Number(estimate) || 30,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (onDeleteRequested) {
      onDeleteRequested(task);
      return;
    }
    if (!(await confirm("Delete Task", `Are you sure you want to delete "${task.title}"?`))) return;
    setSaving(true);
    try {
      await deleteTask(task.id);
      onDeleted?.(task.id);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const handleUnschedule = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTask(task.id, { scheduled_date: null });
      if (onUnscheduled) {
        onUnscheduled(updated);
      } else {
        onUpdated(updated);
      }
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="border border-border-default rounded p-3 bg-surface space-y-2">
        <input
          autoFocus
          className="w-full border border-border-default rounded px-2 py-1 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-secondary">Est. (min)</label>
          <input
            type="number"
            min={1}
            className="border border-border-default rounded px-2 py-1 text-sm w-20"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={saving}
            onClick={saveEdit}
            className="rounded bg-accent px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded border border-border-default px-3 py-1 text-xs hover:bg-surface-raised"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-border-default last:border-b-0 bg-surface hover:bg-surface-raised transition-colors ${
        isDone ? "opacity-60" : ""
      } ${
        animatingState === 'success' ? '!bg-done-subtle text-done' :
        animatingState === 'error' ? '!bg-missed-subtle text-missed' :
        animatingState === 'loading' ? '!bg-accent-subtle/50 animate-pulse text-secondary' :
        ''
      }`}
    >
      {/* Checkbox */}
      <button
        disabled={saving || task.scheduledDate === null}
        onClick={toggleDone}
        className={`mt-0.5 h-4 w-4 shrink-0 rounded border border-border-default-2 flex items-center justify-center ${
          isDone
            ? "border border-border-default-green-500 bg-green-500 text-white"
            : "border border-border-default-gray-300"
        } ${task.scheduledDate === null ? "opacity-50 cursor-not-allowed" : ""}`}
        title={task.scheduledDate === null ? "Schedule task to complete it" : ""}
      >
        {isDone && <span className="text-[10px] leading-none">✓</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate ${isDone ? "line-through text-tertiary" : "text-primary"}`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-tertiary">{formatMinutes(task.estimateMin)}</span>
          {task.status !== "pending" && task.status !== "done" && (
            <StatusBadge status={task.status} />
          )}
          {task.deadlineAt && (
            <span className="text-xs text-orange-500">
              Due {formatTimestamp(task.deadlineAt)}
            </span>
          )}
          {task.carriedFromId && (
            <span className="text-xs text-yellow-600">↩ carried</span>
          )}
        </div>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="rounded px-2 py-1 text-xs text-tertiary hover:bg-surface-raised"
        >
          Edit
        </button>
        {onUnscheduled && (
          <button
            onClick={handleUnschedule}
            disabled={saving}
            className="rounded px-2 py-1 text-xs text-tertiary hover:bg-surface-raised"
          >
            To Inbox
          </button>
        )}
        {(onDeleted || onDeleteRequested) && (
          <button
            onClick={handleDelete}
            disabled={saving}
            className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50"
          >
            Del
          </button>
        )}
      </div>
      <ConfirmModal />
    </div>
  );
}

// ── Quick Capture Modal ───────────────────────────────────────────────────────

export function QuickCapture({
  projects,
  onCreated,
  onClose,
  defaultProjectId,
  defaultScheduledDate,
  defaultPredecessorId,
  tasks,
}: {
  projects: Project[];
  onCreated: (task: Task | Task[]) => void;
  onClose: () => void;
  defaultProjectId?: string;
  defaultScheduledDate?: number | null;
  defaultPredecessorId?: string;
  tasks?: Task[];
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(
    defaultProjectId ?? projects[0]?.id ?? "",
  );
  const [estimate, setEstimate] = useState("30");
  const [scheduleToday, setScheduleToday] = useState(
    defaultScheduledDate !== undefined ? defaultScheduledDate !== null : false,
  );
  
  const getAutoPredecessor = (pId: string) => {
    const proj = projects.find(p => p.id === pId);
    if (!proj || proj.isDefault) return "";
    const pTasks = (tasks || []).filter(t => t.projectId === pId);
    return pTasks.length > 0 ? pTasks[pTasks.length - 1].id : "";
  };

  const [predecessorId, setPredecessorId] = useState<string>(
    defaultPredecessorId !== undefined ? defaultPredecessorId : getAutoPredecessor(defaultProjectId ?? projects[0]?.id ?? "")
  );

  useEffect(() => {
    if (defaultPredecessorId !== undefined) return;
    setPredecessorId(getAutoPredecessor(projectId));
  }, [projectId]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importJson, setImportJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [showExample, setShowExample] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJson && !title.trim()) return;
    if (importJson && !jsonText.trim()) return;
    if (!projectId) return;
    setSaving(true);
    setError(null);
    try {
      let tasksData: any[] = [];
      if (importJson) {
        try {
          tasksData = JSON.parse(jsonText);
          if (!Array.isArray(tasksData)) {
            throw new Error("JSON must be an array of task objects");
          }
          validateTasksData(tasksData);
        } catch (err) {
          throw new Error(`JSON validation error: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (importJson) {
        const schedDate = scheduleToday ? (defaultScheduledDate ?? todayUnixDay()) : null;
        const res = await ingestTasks({
          project_id: projectId,
          tasks: tasksData,
          scheduled_date: schedDate,
        });
        onCreated(res);
      } else {
        const task = await createTask({
          project_id: projectId,
          title: title.trim(),
          estimate_min: Number(estimate) || 30,
          scheduled_date: scheduleToday ? (defaultScheduledDate ?? todayUnixDay()) : null,
          predecessor_id: predecessorId || undefined,
        });
        onCreated(task);
      }
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-surface rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-primary">Quick Capture</h3>
          <button
            onClick={onClose}
            className="text-tertiary hover:text-secondary text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {!importJson && (
            <div>
              <input
                autoFocus
                required={!importJson}
                className="w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task title…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-2">
            <select
              required
              className="flex-1 border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {!importJson && (
              <input
                type="number"
                min={1}
                max={480}
                className="w-20 border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="min"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-secondary">
            <input
              type="checkbox"
              className="rounded"
              checked={scheduleToday}
              onChange={(e) => setScheduleToday(e.target.checked)}
            />
            Schedule for today
          </label>

          {!importJson && tasks && tasks.length > 0 && (
            <div>
              <label className="block text-xs text-secondary mb-1">
                Depends On (optional)
              </label>
              <select
                className="w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={predecessorId}
                onChange={(e) => setPredecessorId(e.target.value)}
              >
                <option value="">None</option>
                {tasks.filter(t => t.projectId === projectId).map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="border-t border-border-default pt-3 mt-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={importJson}
                onChange={(e) => {
                  setImportJson(e.target.checked);
                  setError(null);
                }}
                className="rounded border border-border-default-gray-300 text-accent focus:ring-blue-500"
              />
              Import Tasks from JSON
            </label>
          </div>

          {importJson && (
            <div className="space-y-2 pt-2 border-t border-border-default border border-border-default-dashed border border-border-default-gray-200">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-medium text-secondary">
                  Tasks JSON
                </label>
                <button
                  type="button"
                  onClick={() => setShowExample(!showExample)}
                  className="text-xs text-accent hover:underline"
                >
                  {showExample ? "Hide Structure Example" : "Show Structure Example"}
                </button>
              </div>

              {showExample && (
                <div className="bg-surface-raised border border-border-default rounded-lg p-2.5 text-[10px] font-mono text-secondary overflow-x-auto max-h-40 leading-relaxed whitespace-pre">
{`[
  {
    "id": "task1",
    "title": "Design Database Schema",
    "estimate_min": 60,
    "deadline": "2026-06-25",
    "subtasks": [
      { "title": "Define User Table", "estimate_min": 20 },
      { "title": "Define Task Table", "estimate_min": 30 }
    ]
  },
  {
    "title": "Implement Webhook Handler",
    "estimate_min": 90,
    "depends_on": ["task1"]
  }
]`}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result;
                      if (typeof text === "string") {
                        setJsonText(text);
                      }
                    };
                    reader.readAsText(file);
                  }}
                  className="w-full text-xs text-secondary file:mr-2 file:py-1 file:px-2 file:rounded-md file:border border-border-default-0 file:text-xs file:font-semibold file:bg-accent-subtle file:text-accent hover:file:bg-blue-100"
                />
                <textarea
                  className="w-full border border-border-default rounded-lg px-3 py-2 text-xs font-mono h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder='Paste JSON here (e.g. [{"title": "Task 1", "estimate_min": 30}])'
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving || (!importJson && !title.trim()) || (importJson && !jsonText.trim())}
            className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add Task"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Create Project Form ───────────────────────────────────────────────────────

function validateTasksData(list: any[]): void {
  for (const item of list) {
    if (!item || typeof item !== "object") {
      throw new Error("Each task in the array must be an object");
    }
    if (!item.title || typeof item.title !== "string" || item.title.trim() === "") {
      throw new Error("Each task must have a non-empty string title");
    }
    if (item.estimate_min !== undefined && (typeof item.estimate_min !== "number" || item.estimate_min <= 0)) {
      throw new Error(`Task "${item.title}" estimate_min must be a positive number`);
    }
    if (item.deadline && Number.isNaN(new Date(item.deadline).getTime())) {
      throw new Error(`Task "${item.title}" has an invalid deadline format (use YYYY-MM-DD)`);
    }
    if (item.subtasks) {
      if (!Array.isArray(item.subtasks)) {
        throw new Error(`Task "${item.title}" subtasks must be an array`);
      }
      validateTasksData(item.subtasks);
    }
    if (item.depends_on && !Array.isArray(item.depends_on)) {
      throw new Error(`Task "${item.title}" depends_on must be an array`);
    }
  }
}

export function CreateProjectForm({
  onCreated,
  onClose,
}: {
  onCreated: (p: Project) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("critical");
  const [importance, setImportance] = useState(3);
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For recurring projects
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);

  const toggleDay = (day: string) => {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let cadence: "daily" | "weekly" | "custom" | undefined;
      if (type === "habit") cadence = "daily";
      else if (type === "recurring") {
        cadence = "custom"; // Or weekly if it's every day, but custom works for selected days
      }

      const deadline_at = (type !== "habit" && type !== "recurring" && deadline)
        ? Math.floor(new Date(deadline).getTime() / 1000)
        : null;

      const project = await createProject({
        name: name.trim(),
        type,
        importance,
        deadline_at,
        cadence,
      });

      // If recurring/habit, create a default template task
      if (type === "habit" || type === "recurring") {
        let recurrenceRule: string | null = null;
        if (type === "habit") recurrenceRule = "daily";
        else if (type === "recurring" && recurrenceDays.length > 0) {
          recurrenceRule = recurrenceDays.join(",");
        }

        if (recurrenceRule) {
          await createTask({
            project_id: project.id,
            title: project.name,
            estimate_min: 30,
            recurrence_rule: recurrenceRule,
          });
        }
      }

      onCreated(project);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-surface rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-primary">New Project</h3>
          <button
            onClick={onClose}
            className="text-tertiary hover:text-secondary text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            autoFocus
            required
            className="w-full border border-border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex gap-2">
            <select
              className="flex-1 border border-border-default rounded-lg px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as ProjectType)}
            >
              <option value="critical">Critical</option>
              <option value="recurring">Recurring</option>
              <option value="habit">Habit</option>
              <option value="nicetohave">Nice To Have</option>
            </select>

            <select
              className="w-24 border border-border-default rounded-lg px-3 py-2 text-sm"
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <option key={i} value={i}>
                  P{i}
                </option>
              ))}
            </select>
          </div>

          {(type === "critical" || type === "nicetohave") && (
            <div>
              <label className="block text-xs text-secondary mb-1">
                Deadline (optional)
              </label>
              <input
                type="date"
                className="w-full border border-border-default rounded-lg px-3 py-2 text-sm"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          )}

          {type === "recurring" && (
            <div>
              <label className="block text-xs text-secondary mb-1">
                Repeat on days:
              </label>
              <div className="flex gap-1">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`flex-1 py-1 text-xs rounded border border-border-default ${
                      recurrenceDays.includes(day)
                        ? "bg-accent text-white border border-border-default-blue-600"
                        : "bg-surface text-secondary border border-border-default-gray-300"
                    }`}
                  >
                    {day.substring(0, 1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Project"}
          </button>
        </form>
      </div>
    </div>
  );
}
