import type React from "react";
import { useRef, useState } from "react";
import type { DayPlan, Project, Task } from "@/lib/types";
import type { Habit, RecurringTask } from "@/lib/db/models";

// ── Public plan shapes for habit / recurring placements ───────────────────────
export interface HabitPlan {
  habitId: string;
  startTime: number; // unix timestamp
}

export interface RecurringPlan {
  recurringTaskId: string;
  startTime: number; // unix timestamp
}

// ── Internal dragging discriminated union ─────────────────────────────────────
type DraggableItem =
  | { kind: "task"; item: Task }
  | { kind: "habit"; item: Habit }
  | { kind: "recurring"; item: RecurringTask };

function getEstimateMin(d: DraggableItem): number {
  return d.item.estimateMin;
}

function encodeItem(d: DraggableItem): string {
  return `${d.kind}:${d.item.id}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface TimelineProps {
  // Tasks (DB-backed placements)
  tasks: Task[];
  projects: Project[];
  dayPlans: DayPlan[];
  onPlaceBlock: (taskId: string, startTime: number) => Promise<void>;
  onUnplaceBlock: (taskId: string) => Promise<void>;

  // Habits (client-side placements)
  habits: Habit[];
  habitDayPlans: HabitPlan[];
  onPlaceHabit: (habitId: string, startTime: number) => void;
  onUnplaceHabit: (habitId: string) => void;

  // Recurring tasks (client-side placements)
  recurringTasks: RecurringTask[];
  recurringDayPlans: RecurringPlan[];
  onPlaceRecurring: (recurringTaskId: string, startTime: number) => void;
  onUnplaceRecurring: (recurringTaskId: string) => void;

  onClose: () => void;
  onMarkDone: (task: Task) => void;
  onMarkHabit?: (habitId: string, currentStatus: string) => void;
  onMarkRecurring?: (rtId: string, currentStatus: string) => void;
  habitsData?: any;
  selectedDate?: number;
  animatingPlacements?: Record<string, "loading" | "success" | "error">;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DayPlanner({
  tasks,
  projects,
  dayPlans,
  onPlaceBlock,
  onUnplaceBlock,
  habits,
  habitDayPlans,
  onPlaceHabit,
  onUnplaceHabit,
  recurringTasks,
  recurringDayPlans,
  onPlaceRecurring,
  onUnplaceRecurring,
  onClose,
  onMarkDone,
  onMarkHabit,
  onMarkRecurring,
  habitsData,
  selectedDate,
  animatingPlacements = {},
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingItem, setDraggingItem] = useState<DraggableItem | null>(null);
  const [previewTop, setPreviewTop] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const HOUR_HEIGHT = 60;

  // ── Drag data encoding / decoding ────────────────────────────────────────────
  const decodeItem = (data: string): DraggableItem | null => {
    const idx = data.indexOf(":");
    if (idx === -1) return null;
    const kind = data.slice(0, idx);
    const id = data.slice(idx + 1);
    if (kind === "task") {
      const item = tasks.find((t) => t.id === id);
      return item ? { kind: "task", item } : null;
    }
    if (kind === "habit") {
      const item = habits.find((h) => h.id === id);
      return item ? { kind: "habit", item } : null;
    }
    if (kind === "recurring") {
      const item = recurringTasks.find((r) => r.id === id);
      return item ? { kind: "recurring", item } : null;
    }
    return null;
  };

  // ── Overlap checking (across all three item types) ────────────────────────────
  const checkOverlap = (
    itemId: string,
    startTime: number,
    estimateMin: number,
  ): boolean => {
    const newEnd = startTime + estimateMin * 60;

    for (const plan of dayPlans) {
      if (plan.taskId === itemId) continue;
      const planTask = tasks.find((t) => t.id === plan.taskId);
      if (!planTask) continue;
      const blockEnd = plan.startTime + planTask.estimateMin * 60;
      if (startTime < blockEnd && newEnd > plan.startTime) return true;
    }

    for (const plan of habitDayPlans) {
      if (plan.habitId === itemId) continue;
      const habit = habits.find((h) => h.id === plan.habitId);
      if (!habit) continue;
      const blockEnd = plan.startTime + habit.estimateMin * 60;
      if (startTime < blockEnd && newEnd > plan.startTime) return true;
    }

    for (const plan of recurringDayPlans) {
      if (plan.recurringTaskId === itemId) continue;
      const rt = recurringTasks.find((r) => r.id === plan.recurringTaskId);
      if (!rt) continue;
      const blockEnd = plan.startTime + rt.estimateMin * 60;
      if (startTime < blockEnd && newEnd > plan.startTime) return true;
    }

    return false;
  };

  // ── Commit placement ──────────────────────────────────────────────────────────
  const commitPlacement = async (d: DraggableItem, topOffset: number) => {
    const startMinutes = (topOffset / HOUR_HEIGHT) * 60;
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    const midnightSec = Math.floor(day.getTime() / 1000);
    const startTime = midnightSec + startMinutes * 60;

    if (checkOverlap(d.item.id, startTime, getEstimateMin(d))) {
      setError("Cannot place block: overlaps with an existing block.");
      setTimeout(() => setError(null), 3000);
      setDraggingItem(null);
      setPreviewTop(null);
      return;
    }

    if (d.kind === "task") {
      await onPlaceBlock(d.item.id, startTime);
    } else if (d.kind === "habit") {
      onPlaceHabit(d.item.id, startTime);
    } else {
      onPlaceRecurring(d.item.id, startTime);
    }

    setDraggingItem(null);
    setPreviewTop(null);
  };

  // ── Drag event handlers (desktop) ─────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, d: DraggableItem) => {
    setDraggingItem(d);
    e.dataTransfer.setData("text/plain", encodeItem(d));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingItem(null);
    setPreviewTop(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current || !draggingItem) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    const snappedMinutes = Math.round(((y / HOUR_HEIGHT) * 60) / 15) * 15;
    setPreviewTop((snappedMinutes / 60) * HOUR_HEIGHT);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const decoded = decodeItem(e.dataTransfer.getData("text/plain"));
    if (!decoded || previewTop === null) {
      setDraggingItem(null);
      setPreviewTop(null);
      return;
    }
    await commitPlacement(decoded, previewTop);
  };

  // Dropping back on the sidebar unplaces
  const handleSidebarDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSidebarDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const decoded = decodeItem(e.dataTransfer.getData("text/plain"));
    if (decoded) {
      if (decoded.kind === "task" && dayPlans.some((p) => p.taskId === decoded.item.id)) {
        await onUnplaceBlock(decoded.item.id);
      } else if (decoded.kind === "habit" && habitDayPlans.some((p) => p.habitId === decoded.item.id)) {
        onUnplaceHabit(decoded.item.id);
      } else if (decoded.kind === "recurring" && recurringDayPlans.some((p) => p.recurringTaskId === decoded.item.id)) {
        onUnplaceRecurring(decoded.item.id);
      }
    }
    setDraggingItem(null);
    setPreviewTop(null);
  };

  // ── Touch event handlers (mobile) ─────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent, d: DraggableItem) => {
    setDraggingItem(d);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || !draggingItem) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const y = Math.max(
      0,
      Math.min(
        touch.clientY - rect.top + containerRef.current.scrollTop,
        hours.length * HOUR_HEIGHT,
      ),
    );
    const snappedMinutes = Math.round(((y / HOUR_HEIGHT) * 60) / 15) * 15;
    setPreviewTop((snappedMinutes / 60) * HOUR_HEIGHT);
  };

  const handleTouchEnd = async () => {
    if (draggingItem && previewTop !== null) {
      await commitPlacement(draggingItem, previewTop);
    } else {
      setDraggingItem(null);
      setPreviewTop(null);
    }
  };

  // ── Derived lists ─────────────────────────────────────────────────────────────
  const unplacedTasks = tasks.filter((t) => !dayPlans.some((p) => p.taskId === t.id));
  const unplacedHabits = habits.filter((h) => !habitDayPlans.some((p) => p.habitId === h.id));
  const unplacedRecurring = recurringTasks.filter(
    (r) => !recurringDayPlans.some((p) => p.recurringTaskId === r.id),
  );

  // ── Shared drag handlers object (to keep JSX DRY) ────────────────────────────
  const dragHandlers = (d: DraggableItem) => ({
    draggable: true as const,
    onDragStart: (e: React.DragEvent) => handleDragStart(e, d),
    onDragEnd: handleDragEnd,
    onTouchStart: (e: React.TouchEvent) => handleTouchStart(e, d),
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  });

  // ── Render sidebar card ───────────────────────────────────────────────────────
  const renderSidebarCard = (d: DraggableItem) => {
    const animState = animatingPlacements[d.item.id];

    let label: string;
    let sublabel: string;
    let borderColorClass: string;

    if (d.kind === "task") {
      label = d.item.title;
      sublabel = projects.find((p) => p.id === d.item.projectId)?.name ?? "";
      borderColorClass = "border-border-default hover:border-accent";
    } else if (d.kind === "habit") {
      label = (d.item as Habit).name;
      sublabel = "Habit";
      borderColorClass = "border-purple-400/50 hover:border-purple-400";
    } else {
      label = (d.item as RecurringTask).title;
      sublabel = "Routine";
      borderColorClass = "border-done/40 hover:border-done";
    }

    return (
      <div
        key={`${d.kind}-${d.item.id}`}
        {...dragHandlers(d)}
        className={`shrink-0 w-48 md:w-auto border p-3 md:p-4 rounded-xl md:rounded-2xl cursor-move hover:shadow-md transition-all touch-none ${
          animState === "success"
            ? "bg-done-subtle border-done text-done"
            : animState === "error"
              ? "bg-missed-subtle border-missed text-missed"
              : animState === "loading"
                ? "bg-surface-raised border-border-default animate-pulse text-secondary"
                : `bg-surface ${borderColorClass} text-primary`
        }`}
      >
        <div
          className={`font-medium text-[11px] md:text-sm line-clamp-2 ${animState === "loading" ? "text-secondary" : "text-inherit"}`}
        >
          {label}
        </div>
        {sublabel && (
          <div
            className={`text-[9px] uppercase tracking-wider opacity-60 truncate mt-1 ${
              d.kind === "habit"
                ? "text-purple-400"
                : d.kind === "recurring"
                  ? "text-done"
                  : ""
            }`}
          >
            {sublabel}
          </div>
        )}
        <div
          className={`text-[10px] md:text-xs mt-1 md:mt-2 font-mono ${
            animState === "success"
              ? "text-done"
              : animState === "error"
                ? "text-missed"
                : "text-secondary"
          }`}
        >
          {d.item.estimateMin}m
        </div>
      </div>
    );
  };

  // ── Render placed timeline block ──────────────────────────────────────────────
  const renderPlacedBlock = (
    d: DraggableItem,
    startTime: number,
    onUnplace: () => void,
  ) => {
    const parsed = new Date(startTime * 1000);
    const startMinutes = parsed.getHours() * 60 + parsed.getMinutes();
    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max(20, (getEstimateMin(d) / 60) * HOUR_HEIGHT);
    const animState = animatingPlacements[d.item.id];

    let label: string;
    let sublabel: string;
    let baseClass: string;
    let isDone = false;

    if (d.kind === "task") {
      const task = d.item as Task;
      label = task.title;
      sublabel = projects.find((p) => p.id === task.projectId)?.name ?? "";
      isDone = task.status === "done";
      baseClass = isDone
          ? "bg-done-subtle border-done/30 text-secondary"
          : "bg-accent-subtle border-accent/30 hover:border-accent text-primary";
    } else if (d.kind === "habit") {
      label = (d.item as Habit).name;
      sublabel = "Habit";
      isDone = habitsData?.markers?.[(d.item as Habit).id]?.[selectedDate || 0] === "done";
      baseClass = isDone
          ? "bg-purple-500/5 border-purple-400/20 text-secondary"
          : "bg-purple-500/10 border-purple-400/30 hover:border-purple-400/70 text-primary";
    } else {
      label = (d.item as RecurringTask).title;
      sublabel = "Routine";
      isDone = habitsData?.recurringMarkers?.[(d.item as RecurringTask).id]?.[selectedDate || 0] === "done";
      baseClass = isDone
          ? "bg-done-subtle/50 border-done/20 text-secondary"
          : "bg-done-subtle border-done/30 hover:border-done/70 text-primary";
    }

    return (
      <div
        key={`${d.kind}-${d.item.id}`}
        {...dragHandlers(d)}
        className={`absolute left-14 md:left-20 right-2 md:right-8 border rounded-xl shadow-sm px-2 md:px-4 py-1 md:py-2 overflow-hidden cursor-move hover:shadow-md transition-all group backdrop-blur-md touch-none ${
          animState === "success"
            ? "bg-done-subtle border-done text-done"
            : animState === "error"
              ? "bg-missed-subtle border-missed text-missed"
              : animState === "loading"
                ? "bg-accent-subtle border-accent/50 animate-pulse"
                : baseClass
        }`}
        style={{ top, height }}
      >
        <div className="flex justify-between items-start h-full">
          <div className="flex items-start gap-2 flex-1 min-w-0 pr-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (d.kind === "task") {
                  onMarkDone(d.item as Task);
                } else if (d.kind === "habit" && onMarkHabit) {
                  onMarkHabit(d.item.id, isDone ? "done" : "pending");
                } else if (d.kind === "recurring" && onMarkRecurring) {
                  onMarkRecurring(d.item.id, isDone ? "done" : "pending");
                }
              }}
              className={`shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                isDone
                  ? "border-done bg-done text-surface"
                  : "border-border-strong hover:border-done"
              }`}
            >
              {isDone && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="relative flex max-w-full self-start min-w-0">
                <span
                  style={
                    isDone ? { color: "rgba(0,0,0,0.5)" } : undefined
                  }
                  className={`text-xs md:text-sm font-medium truncate leading-tight select-none ${
                    animState === "loading" ? "text-secondary" : "text-inherit"
                  }`}
                >
                  {label}
                </span>
                {isDone && (
                  <div className="doodle-strikethrough block absolute left-0 right-0 top-0 bottom-0 pointer-events-none" />
                )}
              </div>
              {sublabel && (
                <span
                  className={`text-[9px] uppercase tracking-wider truncate mt-0.5 ${
                    d.kind === "habit"
                      ? "text-purple-400 opacity-80"
                      : d.kind === "recurring"
                        ? "text-done opacity-80"
                        : "opacity-60"
                  }`}
                >
                  {sublabel}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnplace();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 p-1 -m-1 text-tertiary hover:text-missed transition-colors rounded-full hover:bg-surface shrink-0"
            title="Remove from timeline"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          className={`text-[10px] md:text-xs mt-0.5 font-mono select-none ${
            animState === "success"
              ? "text-done"
              : animState === "error"
                ? "text-missed"
                : d.kind === "habit"
                  ? "text-purple-400/70"
                  : d.kind === "recurring"
                    ? "text-done/70"
                    : "text-accent"
          }`}
        >
          {getEstimateMin(d)}m
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="flex flex-col h-full w-full max-w-6xl bg-surface rounded-2xl md:rounded-3xl border border-border-default shadow-2xl relative overflow-hidden">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-missed-subtle border border-missed text-missed px-4 py-2 text-sm rounded-lg shadow-lg animate-in slide-in-from-top-4">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 bg-surface-raised border-b border-border-default shrink-0 flex justify-between items-center z-10">
          <h2 className="text-base md:text-lg font-medium text-primary tracking-wide">
            Drag &amp; Drop Day Planner
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-tertiary hover:text-primary hover:bg-surface rounded-lg transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* ── Sidebar ────────────────────────────────────────────────────────── */}
          <div
            className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border-default flex flex-col p-4 md:p-6 bg-surface-raised shrink-0"
            onDragOver={handleSidebarDragOver}
            onDrop={handleSidebarDrop}
          >
            <div className="flex items-baseline justify-between mb-2 md:mb-3">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Unplaced Items
              </p>
              <span className="text-xs text-tertiary md:hidden">
                Drag to schedule
              </span>
            </div>

            {/* Legend (desktop only) */}
            <div className="hidden md:flex gap-3 mb-3 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-tertiary">
                <span className="w-2 h-2 rounded-sm bg-accent/40 border border-accent/60" />
                Task
              </span>
              <span className="flex items-center gap-1 text-[10px] text-tertiary">
                <span className="w-2 h-2 rounded-sm bg-purple-400/20 border border-purple-400/50" />
                Habit
              </span>
              <span className="flex items-center gap-1 text-[10px] text-tertiary">
                <span className="w-2 h-2 rounded-sm bg-done/20 border border-done/40" />
                Routine
              </span>
            </div>

            <div className="flex overflow-x-auto md:flex-col md:overflow-y-auto gap-3 md:gap-3 flex-1 pb-2 md:pb-0 scrollbar-hide">
              {unplacedTasks.map((task) =>
                renderSidebarCard({ kind: "task", item: task }),
              )}
              {unplacedHabits.map((habit) =>
                renderSidebarCard({ kind: "habit", item: habit }),
              )}
              {unplacedRecurring.map((rt) =>
                renderSidebarCard({ kind: "recurring", item: rt }),
              )}
              {unplacedTasks.length === 0 &&
                unplacedHabits.length === 0 &&
                unplacedRecurring.length === 0 && (
                  <p className="text-xs text-tertiary italic">
                    All items placed on the timeline!
                  </p>
                )}
            </div>
          </div>

          {/* ── Timeline ───────────────────────────────────────────────────────── */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto relative bg-surface"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div
              className="relative min-h-full"
              style={{ height: Math.max(1200, hours.length * HOUR_HEIGHT) }}
            >
              {/* Hour grid lines */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full border-b border-border-subtle flex items-start"
                  style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                >
                  <span className="text-[10px] md:text-[11px] text-tertiary font-medium w-12 md:w-16 text-right pr-2 md:pr-4 pt-1 font-mono select-none">
                    {hour === 0
                      ? "12 AM"
                      : hour < 12
                        ? `${hour} AM`
                        : hour === 12
                          ? "12 PM"
                          : `${hour - 12} PM`}
                  </span>
                </div>
              ))}

              {/* Placed task blocks (DB-backed) */}
              {dayPlans.map((plan) => {
                const task = tasks.find((t) => t.id === plan.taskId);
                if (!task) return null;
                return renderPlacedBlock(
                  { kind: "task", item: task },
                  plan.startTime,
                  () => onUnplaceBlock(task.id),
                );
              })}

              {/* Placed habit blocks (client-side) */}
              {habitDayPlans.map((plan) => {
                const habit = habits.find((h) => h.id === plan.habitId);
                if (!habit) return null;
                return renderPlacedBlock(
                  { kind: "habit", item: habit },
                  plan.startTime,
                  () => onUnplaceHabit(habit.id),
                );
              })}

              {/* Placed recurring blocks (client-side) */}
              {recurringDayPlans.map((plan) => {
                const rt = recurringTasks.find(
                  (r) => r.id === plan.recurringTaskId,
                );
                if (!rt) return null;
                return renderPlacedBlock(
                  { kind: "recurring", item: rt },
                  plan.startTime,
                  () => onUnplaceRecurring(rt.id),
                );
              })}

              {/* Drag preview ghost */}
              {draggingItem && previewTop !== null && (
                <div
                  className={`absolute left-14 md:left-20 right-2 md:right-8 border-2 border-dashed rounded-xl pointer-events-none backdrop-blur-sm z-20 ${
                    draggingItem.kind === "habit"
                      ? "bg-purple-400/10 border-purple-400"
                      : draggingItem.kind === "recurring"
                        ? "bg-done/10 border-done"
                        : "bg-accent/10 border-accent"
                  }`}
                  style={{
                    top: previewTop,
                    height: Math.max(
                      20,
                      (getEstimateMin(draggingItem) / 60) * HOUR_HEIGHT,
                    ),
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
