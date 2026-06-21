import { Task } from "@/lib/types";
import { TaskItem } from "./TaskItem";

export function TaskListCategory({
  title,
  tasks,
  state,
  selectedTaskId,
  onSelectTask,
  emptyMessage,
}: {
  title: string;
  tasks: Task[];
  state: "ready" | "locked" | "done";
  selectedTaskId?: string;
  onSelectTask: (t: Task) => void;
  emptyMessage?: string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-medium text-primary flex items-center">
        {title}{" "}
        <span className="text-secondary ml-3 font-mono bg-surface-raised px-2 py-0.5 rounded text-sm">
          {tasks.length}
        </span>
      </h3>
      {tasks.map((t) => (
        <TaskItem
          key={t.id}
          task={t}
          state={state}
          isSelected={selectedTaskId === t.id}
          onClick={() => onSelectTask(t)}
        />
      ))}
      {tasks.length === 0 && emptyMessage && (
        <p className="text-sm text-tertiary italic">{emptyMessage}</p>
      )}
    </div>
  );
}
