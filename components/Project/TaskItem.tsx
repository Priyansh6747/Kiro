import type { Task } from "@/lib/types";

export function TaskItem({
  task,
  state,
  isSelected,
  onClick,
}: {
  task: Task;
  state: "ready" | "locked" | "done";
  isSelected: boolean;
  onClick: () => void;
}) {
  let bg =
    "bg-surface border-border-strong text-secondary hover:bg-surface-raised";
  let dot = "bg-tertiary";

  if (state === "ready") {
    bg = "bg-warning-subtle border-warning text-primary hover:opacity-90";
    dot = "bg-warning";
  } else if (state === "done") {
    bg = "bg-done-subtle border-done text-primary hover:opacity-90";
    dot = "bg-done";
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${bg} ${
        isSelected
          ? "ring-2 ring-accent ring-offset-2 ring-offset-base shadow-md"
          : "shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0 shadow-sm`} />
        <span className="font-semibold text-sm">{task.title}</span>
      </div>
      <span className="text-xs font-mono font-bold opacity-80 shrink-0">
        {task.estimateMin || 0}m
      </span>
    </div>
  );
}
