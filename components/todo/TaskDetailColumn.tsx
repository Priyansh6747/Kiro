"use client";

import type { Task } from "@/lib/types";
import {
  dateStringToTimestamp,
  dateStringToYyyymmdd,
  formatTimestamp,
  timestampToDateString,
  yyyymmddToDateString,
} from "./utils";

export function TaskDetailColumn({
  selectedTask,
  tasks,
  dependencies,
  onUpdateTask,
  onAddDep,
  onRemoveDep,
}: {
  selectedTask: Task | null;
  tasks: Task[];
  dependencies: { taskId: string; predecessorId: string }[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onAddDep: (taskId: string, predecessorId: string) => void;
  onRemoveDep: (taskId: string, predecessorId: string) => void;
}) {
  return (
    <div className="w-1/3 flex flex-col bg-surface-raised overflow-hidden">
      <div className="p-4 border-b border-border-default bg-surface shrink-0">
        <h2 className="font-semibold text-primary">Details</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedTask ? (
          <div className="h-full flex items-center justify-center text-secondary text-sm">
            Select a task to see details
          </div>
        ) : (
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-secondary uppercase mb-1 block">
                Title
              </label>
              <input
                type="text"
                value={selectedTask.title}
                onChange={(e) =>
                  onUpdateTask(selectedTask.id, { title: e.target.value })
                }
                className="w-full bg-surface border border-border-default rounded px-3 py-2 text-sm text-primary"
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-secondary uppercase mb-1 block">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {(["pending", "done", "missed"] as const).map((s) => (
                  <button
                    key={s}
                    disabled={selectedTask.status === s}
                    onClick={() => onUpdateTask(selectedTask.id, { status: s })}
                    className={`px-3 py-1.5 rounded text-xs border border-border-default capitalize transition-colors ${selectedTask.status === s ? "bg-accent text-white border-accent" : "bg-surface text-primary hover:bg-surface-raised"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Estimate */}
              <div>
                <label className="text-xs font-semibold text-secondary uppercase mb-1 block">
                  Estimate (min)
                </label>
                <input
                  type="number"
                  value={selectedTask.estimateMin || 0}
                  onChange={(e) =>
                    onUpdateTask(selectedTask.id, {
                      estimateMin: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-surface border border-border-default rounded px-3 py-2 text-sm text-primary"
                />
              </div>
              {/* Scheduled Date */}
              <div>
                <label className="text-xs font-semibold text-secondary uppercase mb-1 block">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={yyyymmddToDateString(selectedTask.scheduledDate)}
                  onChange={(e) =>
                    onUpdateTask(selectedTask.id, {
                      scheduledDate: dateStringToYyyymmdd(e.target.value),
                    })
                  }
                  className="w-full bg-surface border border-border-default rounded px-3 py-2 text-sm text-primary"
                />
              </div>
              {/* Deadline */}
              <div>
                <label className="text-xs font-semibold text-secondary uppercase mb-1 block">
                  Deadline
                </label>
                <input
                  type="date"
                  value={timestampToDateString(selectedTask.deadlineAt)}
                  onChange={(e) =>
                    onUpdateTask(selectedTask.id, {
                      deadlineAt: dateStringToTimestamp(e.target.value),
                    })
                  }
                  className="w-full bg-surface border border-border-default rounded px-3 py-2 text-sm text-primary"
                />
              </div>
            </div>

            {/* Dependencies */}
            <div>
              <label className="text-xs font-semibold text-secondary uppercase mb-1 block">
                Dependencies
              </label>
              <div className="space-y-2 mb-2">
                {dependencies
                  .filter((d) => d.taskId === selectedTask.id)
                  .map((dep) => {
                    const pred = tasks.find((t) => t.id === dep.predecessorId);
                    return (
                      <div
                        key={dep.predecessorId}
                        className="flex justify-between items-center bg-surface border border-border-default p-2 rounded text-sm"
                      >
                        <span className="truncate mr-2">
                          {pred?.title || "Unknown"}
                        </span>
                        <button
                          onClick={() =>
                            onRemoveDep(selectedTask.id, dep.predecessorId)
                          }
                          className="text-red-500 hover:text-red-700 font-bold px-1"
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}
              </div>
              <select
                onChange={(e) => {
                  onAddDep(selectedTask.id, e.target.value);
                  e.target.value = "";
                }}
                className="w-full bg-surface border border-border-default rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                defaultValue=""
              >
                <option value="" disabled>
                  Add predecessor...
                </option>
                {tasks
                  .filter(
                    (t) =>
                      t.id !== selectedTask.id &&
                      !dependencies.some(
                        (d) =>
                          d.taskId === selectedTask.id &&
                          d.predecessorId === t.id,
                      ),
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </div>

            {/* Metadata */}
            <div className="pt-4 border-t border-border-default grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-tertiary mb-0.5">Created At</p>
                <p className="text-primary">
                  {formatTimestamp(selectedTask.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-tertiary mb-0.5">Updated At</p>
                <p className="text-primary">
                  {formatTimestamp(selectedTask.updatedAt)}
                </p>
              </div>
              {selectedTask.completedAt && (
                <div>
                  <p className="text-tertiary mb-0.5">Completed At</p>
                  <p className="text-primary">
                    {formatTimestamp(selectedTask.completedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
