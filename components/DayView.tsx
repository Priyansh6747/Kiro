import React from "react";
import type { DayPlan, Project, Task } from "@/lib/types";
import type { Habit, RecurringTask } from "@/lib/db/models";
import type { HabitPlan, RecurringPlan } from "@/components/DayPlanner";

interface DayViewProps {
  tasks: Task[];
  projects: Project[];
  dayPlans: DayPlan[];
  habits: Habit[];
  habitDayPlans: HabitPlan[];
  recurringTasks: RecurringTask[];
  recurringDayPlans: RecurringPlan[];
  onOpenPlanner: () => void;
  onMarkDone: (task: Task) => void;
  onMarkHabit?: (habitId: string, currentStatus: string) => void;
  onMarkRecurring?: (rtId: string, currentStatus: string) => void;
  habitsData?: any;
  selectedDate?: number;
  animatingPlacements?: Record<string, "loading" | "success" | "error">;
}

export function DayView({
  tasks,
  projects,
  dayPlans,
  habits,
  habitDayPlans,
  recurringTasks,
  recurringDayPlans,
  onOpenPlanner,
  onMarkDone,
  onMarkHabit,
  onMarkRecurring,
  habitsData,
  selectedDate,
  animatingPlacements = {},
}: DayViewProps) {
  // Combine all types of plans into a single sorted list
  type UnifiedPlan =
    | { type: "task"; plan: DayPlan; item: Task }
    | { type: "habit"; plan: HabitPlan; item: Habit }
    | { type: "recurring"; plan: RecurringPlan; item: RecurringTask };

  const unifiedPlans: UnifiedPlan[] = [
    ...dayPlans.map(p => ({ type: "task" as const, plan: p, item: tasks.find(t => t.id === p.taskId)! })),
    ...habitDayPlans.map(p => ({ type: "habit" as const, plan: p, item: habits.find(h => h.id === p.habitId)! })),
    ...recurringDayPlans.map(p => ({ type: "recurring" as const, plan: p, item: recurringTasks.find(r => r.id === p.recurringTaskId)! })),
  ].filter(u => u.item).sort((a, b) => a.plan.startTime - b.plan.startTime);

  const formatTime = (unix: number) => {
    const d = new Date(unix * 1000);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  };

  return (
    <div className="flex flex-col h-full bg-surface relative overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center border-b border-border-default bg-surface z-10 shrink-0">
        <h2 className="text-lg font-medium text-primary tracking-wide">
          Day View
        </h2>
        <button
          onClick={onOpenPlanner}
          className="px-4 py-2 bg-accent-subtle text-accent rounded-lg text-sm font-medium hover:bg-surface-raised transition-colors border border-border-default"
        >
          Open Day Planner
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {unifiedPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-tertiary">
            <p className="mb-4 text-sm">Your day is empty.</p>
            <button
              onClick={onOpenPlanner}
              className="px-4 py-2 border border-border-default rounded-lg text-secondary hover:text-primary transition-colors"
            >
              Plan your day
            </button>
          </div>
        ) : (
          <div className="relative w-full pr-4 md:pr-12 lg:pr-24 pl-4 md:pl-8">
            {/* Continuous vertical timeline line */}
            <div className="absolute top-0 bottom-0 left-[16px] md:left-[32px] w-px bg-border-default z-0"></div>

            <div className="space-y-6 relative z-10 py-2">
              {unifiedPlans.map((u, index) => {
                const startStr = formatTime(u.plan.startTime);
                const estimateMin = u.type === "task" ? (u.item as Task).estimateMin : u.item.estimateMin;
                const endUnix = u.plan.startTime + estimateMin * 60;
                const endStr = formatTime(endUnix);
                
                const key = u.type === "task" ? u.plan.taskId : u.type === "habit" ? u.plan.habitId : u.plan.recurringTaskId;
                const animState = animatingPlacements[key];

                let title: string;
                let subtitle: string;
                let baseClass: string;
                let isDone = false;

                if (u.type === "task") {
                  const task = u.item as Task;
                  title = task.title;
                  subtitle = projects.find((p) => p.id === task.projectId)?.name || "PROJECT";
                  isDone = task.status === "done";
                  baseClass = isDone
                    ? "bg-transparent backdrop-blur-xl border-done/30 text-secondary"
                    : "bg-transparent backdrop-blur-xl border-border-default hover:border-accent text-primary shadow-sm";
                } else if (u.type === "habit") {
                  title = (u.item as Habit).name;
                  subtitle = "HABIT";
                  isDone = habitsData?.markers?.[(u.item as Habit).id]?.[selectedDate || 0] === "done";
                  baseClass = isDone
                    ? "bg-transparent backdrop-blur-xl border-cyan-500/30 text-secondary"
                    : "bg-transparent backdrop-blur-xl border-cyan-500/50 hover:border-cyan-400 shadow-sm";
                } else {
                  title = (u.item as RecurringTask).title;
                  subtitle = "ROUTINE";
                  isDone = habitsData?.recurringMarkers?.[(u.item as RecurringTask).id]?.[selectedDate || 0] === "done";
                  baseClass = isDone
                    ? "bg-transparent backdrop-blur-xl border-done/20 text-secondary"
                    : "bg-transparent backdrop-blur-xl border-done/30 hover:border-done/70 shadow-sm";
                }

                return (
                  <div
                    key={`${u.type}-${key}`}
                    className="relative flex items-stretch group"
                  >
                    {/* Timeline Left Axis */}
                    <div className="w-20 md:w-32 shrink-0 flex flex-col justify-between py-2 -ml-[1px]">
                      {/* Top tick (Start Time) */}
                      <div className="flex items-center">
                        <div className="h-px w-4 md:w-6 bg-border-strong"></div>
                        <span className="text-[11px] text-tertiary font-medium pl-2 md:pl-3 whitespace-nowrap">
                          {startStr}
                        </span>
                      </div>

                      {/* Minor ticks */}
                      <div className="flex flex-col justify-evenly flex-1 py-1">
                        <div className="h-px w-2 md:w-3 bg-border-default"></div>
                        <div className="h-px w-2 md:w-3 bg-border-default"></div>
                        <div className="h-px w-2 md:w-3 bg-border-default"></div>
                      </div>

                      {/* Bottom tick (End Time) */}
                      <div className="flex items-center">
                        <div className="h-px w-4 md:w-6 bg-border-strong"></div>
                        <span className="text-[11px] text-tertiary font-medium pl-2 md:pl-3 whitespace-nowrap">
                          {endStr}
                        </span>
                      </div>
                    </div>

                    {/* Task Card */}
                    <div className="flex-1 flex justify-between items-center ml-2">
                      {/* Task Content */}
                      <div
                        className={`w-full border rounded-xl p-4 md:p-6 shadow-sm flex justify-between items-center transition-colors ${
                          animState === "success"
                            ? "bg-done-subtle border-done text-done"
                            : animState === "error"
                              ? "bg-missed-subtle border-missed text-missed"
                              : animState === "loading"
                                ? "bg-accent-subtle border-accent/50 animate-pulse text-secondary"
                                : baseClass
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => {
                              if (u.type === "task") {
                                onMarkDone(u.item as Task);
                              } else if (u.type === "habit" && onMarkHabit) {
                                onMarkHabit(u.item.id, isDone ? "done" : "pending");
                              } else if (u.type === "recurring" && onMarkRecurring) {
                                onMarkRecurring(u.item.id, isDone ? "done" : "pending");
                              }
                            }}
                            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isDone
                                ? "border-done bg-done text-surface"
                                : "border-border-strong hover:border-done"
                            }`}
                          >
                            {isDone && (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </button>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="relative flex max-w-full self-start min-w-0">
                              <span
                                style={{
                                  color: isDone ? "rgba(0,0,0,0.5)" : "var(--text-primary)",
                                  opacity: animState === "loading" ? 0.7 : 1
                                }}
                                className={`text-sm md:text-base font-medium truncate`}
                              >
                                {title}
                              </span>
                              {isDone && (
                                <div className="doodle-strikethrough block absolute left-0 right-0 top-0 bottom-0 pointer-events-none" />
                              )}
                            </div>
                            <span
                              style={{
                                color: isDone ? "var(--text-secondary)" : u.type === "habit" ? "var(--text-accent)" : u.type === "recurring" ? "var(--status-done)" : "var(--text-tertiary)"
                              }}
                              className={`text-[10px] uppercase tracking-wider truncate`}
                            >
                              {subtitle}
                            </span>
                          </div>
                        </div>
                        {/* Duration */}
                        <div className="ml-4 shrink-0 text-xs font-mono text-tertiary">
                          {formatDuration(estimateMin)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
