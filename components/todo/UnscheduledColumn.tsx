"use client";

import { motion } from "motion/react";
import { MoveHorizontal } from "lucide-react";
import type { Project, Task } from "@/lib/types";

function SwipeableUnscheduledTask({
  task,
  onDone,
  onDelete,
  onClick,
  isSelected,
}: {
  task: Task;
  onDone: (t: Task) => void;
  onDelete: (t: Task) => void;
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <div className="relative overflow-hidden border-b border-border-default last:border-0 bg-surface">
      <div className="absolute inset-y-0 left-0 w-1/2 bg-done text-white flex items-center px-4 font-semibold text-sm">
        Done
      </div>
      <div className="absolute inset-y-0 right-0 w-1/2 bg-missed text-white flex items-center justify-end px-4 font-semibold text-sm">
        Delete
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        onDragEnd={(e, info) => {
          if (info.offset.x > 80) onDone(task);
          else if (info.offset.x < -80) onDelete(task);
        }}
        onClick={onClick}
        style={{ touchAction: "pan-y" }}
        className={`relative z-10 flex flex-col p-3 cursor-pointer select-none transition-colors ${isSelected ? "!bg-accent-subtle" : "bg-surface hover:bg-surface-raised"}`}
      >
        <span className="text-sm font-medium text-primary">{task.title}</span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-secondary">
            {task.estimateMin}m • {task.status}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-tertiary opacity-50 font-medium">
            <MoveHorizontal className="w-3 h-3" />
            <span>Swipe</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function UnscheduledColumn({
  tasks,
  selectedTask,
  todoProject,
  onSelectTask,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  className,
}: {
  tasks: Task[];
  selectedTask: Task | null;
  todoProject: Project;
  onSelectTask: (t: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: () => void;
  className?: string;
}) {
  const unscheduledTasks = tasks.filter(
    (t) => !t.scheduledDate && t.status !== "deleted",
  );

  return (
    <div className={`border-r border-border-default flex flex-col bg-surface ${className || "w-1/3"}`}>
      <div className="p-4 border-b border-border-default bg-surface flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-primary">UnScheduled</h2>
        <span className="bg-accent-subtle text-accent text-xs font-bold px-2 py-1 rounded-full">
          {unscheduledTasks.length}
        </span>
      </div>
      {unscheduledTasks.length > 0 && (
        <div className="px-4 py-1.5 bg-surface-raised border-b border-border-default flex items-center justify-center gap-4 text-[10px] text-tertiary uppercase tracking-wider shrink-0 select-none">
          <span className="flex items-center gap-1"><span className="opacity-50">←</span> Delete</span>
          <span className="opacity-20">|</span>
          <span className="flex items-center gap-1">Done <span className="opacity-50">→</span></span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {unscheduledTasks.length === 0 ? (
          <div className="p-4 text-secondary text-sm text-center mt-10">
            No unscheduled tasks.
          </div>
        ) : (
          unscheduledTasks.map((task) => (
            <SwipeableUnscheduledTask
              key={task.id}
              task={task}
              isSelected={selectedTask?.id === task.id}
              onClick={() => onSelectTask(task)}
              onDone={(t) => onUpdateTask(t.id, { status: "done" })}
              onDelete={(t) => onDeleteTask(t.id)}
            />
          ))
        )}
      </div>
      <div className="p-4 border-t border-border-default bg-surface flex justify-center shrink-0">
        <button
          className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:bg-accent/90 transition-transform active:scale-95"
          onClick={onAddTask}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
