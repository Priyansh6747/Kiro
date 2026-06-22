import { useState } from "react";
import { StatusBadge } from "@/components/ui";
import { useToast } from "@/hooks/useToast";
import { updateTask } from "@/lib/api-client";
import { formatTimestamp, type Task } from "@/lib/types";

export function TaskDetailPanel({
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
      showToast((e as Error).message, "error");
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
        <p className="text-xs font-semibold text-secondary uppercase mb-1">
          Task
        </p>
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
        <p className="text-xs font-semibold text-secondary uppercase mb-1">
          Change Status
        </p>
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
                  showToast((e as Error).message, "error");
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
        <p className="text-xs font-semibold text-secondary uppercase mb-1">
          Dependencies
        </p>

        {currentDeps.length > 0 && (
          <div className="space-y-1 mb-3">
            {currentDeps.map((dep) => {
              const predTask = allTasks.find((t) => t.id === dep.predecessorId);
              return (
                <div
                  key={dep.predecessorId}
                  className="flex items-center justify-between bg-surface-raised border border-border-default rounded px-2 py-1 text-xs"
                >
                  <span className="truncate flex-1 mr-2">
                    {predTask?.title || "Unknown task"}
                  </span>
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
              .filter((t) => !currentDeps.some((d) => d.predecessorId === t.id))
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
