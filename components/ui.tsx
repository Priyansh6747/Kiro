"use client";

import { useState } from "react";
import type { Project, ProjectType, Task, TaskStatus } from "@/lib/types";
import { formatTimestamp, formatMinutes } from "@/lib/types";
import {
  createTask,
  updateTask,
  deleteTask,
  createProject,
} from "@/lib/api-client";
import { todayUnixDay } from "@/lib/types";

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const classes = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-10 w-10 border-4",
  }[size];
  return (
    <div
      className={`animate-spin rounded-full border-gray-300 border-t-blue-600 ${classes}`}
    />
  );
}

// ── Loading state ─────────────────────────────────────────────────────────────

export function LoadingScreen({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-gray-500">
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
          className="ml-2 rounded border border-red-300 px-2 py-1 text-xs hover:bg-red-100"
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
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400">
      <span className="text-3xl">{icon}</span>
      <p className="text-sm font-medium text-gray-600">{title}</p>
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
    <div className="flex items-center justify-between px-4 py-2 border-b bg-white sticky top-0 z-10">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        {title}
      </h2>
      {action}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  done: "bg-green-100 text-green-700",
  missed: "bg-red-100 text-red-700",
  carried: "bg-yellow-100 text-yellow-700",
  adjusted: "bg-blue-100 text-blue-700",
  deleted: "bg-gray-100 text-gray-400",
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
    recurring: "bg-blue-50 text-blue-700",
    habit: "bg-purple-50 text-purple-700",
    nicetohave: "bg-gray-50 text-gray-600",
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
  showProject,
  projects,
}: {
  task: Task;
  onUpdated: (t: Task) => void;
  onDeleted?: (id: string) => void;
  showProject?: boolean;
  projects?: Project[];
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(task.title);
  const [estimate, setEstimate] = useState(String(task.estimateMin));

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
    if (!confirm(`Delete "${task.title}"?`)) return;
    setSaving(true);
    try {
      await deleteTask(task.id);
      onDeleted?.(task.id);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="border rounded p-3 bg-white space-y-2">
        <input
          autoFocus
          className="w-full border rounded px-2 py-1 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Est. (min)</label>
          <input
            type="number"
            min={1}
            className="border rounded px-2 py-1 text-sm w-20"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={saving}
            onClick={saveEdit}
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded border px-3 py-1 text-xs hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 bg-white hover:bg-gray-50 ${
        isDone ? "opacity-60" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        disabled={saving}
        onClick={toggleDone}
        className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center ${
          isDone
            ? "border-green-500 bg-green-500 text-white"
            : "border-gray-300"
        }`}
      >
        {isDone && <span className="text-[10px] leading-none">✓</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-gray-400">{formatMinutes(task.estimateMin)}</span>
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
          className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100"
        >
          Edit
        </button>
        {onDeleted && (
          <button
            onClick={handleDelete}
            disabled={saving}
            className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50"
          >
            Del
          </button>
        )}
      </div>
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
}: {
  projects: Project[];
  onCreated: (task: Task) => void;
  onClose: () => void;
  defaultProjectId?: string;
  defaultScheduledDate?: number | null;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(
    defaultProjectId ?? projects[0]?.id ?? "",
  );
  const [estimate, setEstimate] = useState("30");
  const [scheduleToday, setScheduleToday] = useState(
    defaultScheduledDate !== undefined ? defaultScheduledDate !== null : false,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;
    setSaving(true);
    setError(null);
    try {
      const task = await createTask({
        project_id: projectId,
        title: title.trim(),
        estimate_min: Number(estimate) || 30,
        scheduled_date: scheduleToday ? (defaultScheduledDate ?? todayUnixDay()) : null,
      });
      onCreated(task);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Quick Capture</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <input
              autoFocus
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Task title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <select
              required
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              max={480}
              className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="min"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              className="rounded"
              checked={scheduleToday}
              onChange={(e) => setScheduleToday(e.target.checked)}
            />
            Schedule for today
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add Task"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Create Project Form ───────────────────────────────────────────────────────

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const deadline_at = deadline
        ? Math.floor(new Date(deadline).getTime() / 1000)
        : null;
      const project = await createProject({
        name: name.trim(),
        type,
        importance,
        deadline_at,
      });
      onCreated(project);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-t-2xl md:rounded-xl w-full max-w-md shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">New Project</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            autoFocus
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex gap-2">
            <select
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as ProjectType)}
            >
              <option value="critical">Critical</option>
              <option value="recurring">Recurring</option>
              <option value="habit">Habit</option>
              <option value="nicetohave">Nice To Have</option>
            </select>

            <select
              className="w-24 border rounded-lg px-3 py-2 text-sm"
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

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Deadline (optional)
            </label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Project"}
          </button>
        </form>
      </div>
    </div>
  );
}
