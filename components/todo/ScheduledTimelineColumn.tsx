"use client";

import { RefObject, useState, useRef } from "react";
import type { Task } from "@/lib/types";
import { StatusBadge } from "@/components/ui";
import { formatDateShort, parseDateStr } from "./utils";

function ScheduledTask({
  task,
  onClick,
  isSelected,
}: {
  task: Task;
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`border border-border-default rounded-md p-2 cursor-pointer transition-colors ${isSelected ? "bg-accent-subtle border-accent" : "bg-surface hover:bg-surface-raised"} relative z-10`}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-primary line-clamp-1 mr-2">
          {task.title}
        </span>
      </div>
      <div className="flex justify-between items-center text-xs text-secondary">
        <span>{task.estimateMin}m</span>
        <StatusBadge status={task.status} />
      </div>
    </div>
  );
}

const TimelineTicks = () => (
  <div className="absolute left-0 top-0 bottom-0 w-6 flex flex-col justify-between pointer-events-none">
    <div className="w-full h-[2px] bg-border-strong" />
    {Array.from({ length: 11 }).map((_, i) => (
      <div key={i} className="w-1/2 h-[1px] bg-border-default ml-auto" />
    ))}
  </div>
);

export function ScheduledTimelineColumn({
  tasks,
  selectedTask,
  timelineMode,
  setTimelineMode,
  onSelectTask,
  todayRef,
}: {
  tasks: Task[];
  selectedTask: Task | null;
  timelineMode: "compact" | "continuous";
  setTimelineMode: (m: "compact" | "continuous") => void;
  onSelectTask: (t: Task) => void;
  todayRef: RefObject<HTMLDivElement | null>;
}) {
  const [windowOffsetDays, setWindowOffsetDays] = useState(-7);
  const isSliding = useRef(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (timelineMode !== "continuous" || isSliding.current) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const threshold = 600;

    if (scrollTop < threshold) {
      isSliding.current = true;
      setWindowOffsetDays((prev) => prev - 7);
      setTimeout(() => {
        isSliding.current = false;
      }, 100);
    } else if (scrollHeight - scrollTop - clientHeight < threshold) {
      isSliding.current = true;
      setWindowOffsetDays((prev) => prev + 7);
      setTimeout(() => {
        isSliding.current = false;
      }, 100);
    }
  };

  const scheduledTasks = tasks.filter(
    (t) => t.scheduledDate && t.status !== "deleted",
  );

  const groupedScheduled = scheduledTasks.reduce(
    (acc, t) => {
      const d = t.scheduledDate!;
      if (!acc[d]) acc[d] = [];
      acc[d].push(t);
      return acc;
    },
    {} as Record<number, Task[]>,
  );

  const sortedDates = Object.keys(groupedScheduled)
    .map(Number)
    .sort((a, b) => a - b);

  const renderTimeline = () => {
    const timelineItems = [];

    if (timelineMode === "continuous") {
      const todayObj = new Date();
      todayObj.setHours(0, 0, 0, 0);
      const todayNum = parseInt(
        todayObj.getFullYear().toString() +
          (todayObj.getMonth() + 1).toString().padStart(2, "0") +
          todayObj.getDate().toString().padStart(2, "0"),
        10,
      );

      const minDate = new Date(todayObj.getTime());
      minDate.setDate(minDate.getDate() + windowOffsetDays);

      const maxDate = new Date(minDate.getTime());
      maxDate.setDate(maxDate.getDate() + 21); // 3x ViewHeight (21 days window)

      let curr = minDate;
      while (curr <= maxDate) {
        const dNum = parseInt(
          curr.getFullYear().toString() +
            (curr.getMonth() + 1).toString().padStart(2, "0") +
            curr.getDate().toString().padStart(2, "0"),
          10,
        );
        const dayTasks = groupedScheduled[dNum] || [];
        const isToday = dNum === todayNum;

        timelineItems.push(
          <div
            key={dNum}
            ref={isToday ? todayRef : null}
            className={`flex min-h-[120px] group relative ${isToday ? "bg-accent-subtle/10" : ""}`}
          >
            <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center relative">
              <TimelineTicks />
              <div className="flex flex-col items-center justify-center bg-surface px-1 py-1 relative z-10 mt-[-10px]">
                <span
                  className={`text-sm tracking-wide ${isToday ? "text-accent font-bold" : "text-primary font-medium"}`}
                >
                  {formatDateShort(curr)}
                </span>
                {isToday && (
                  <span className="text-[10px] text-accent uppercase font-bold mt-0.5">
                    Today
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 p-2 space-y-2 border-l border-border-default ml-[-1px]">
              {dayTasks.map((t) => (
                <ScheduledTask
                  key={t.id}
                  task={t}
                  onClick={() => onSelectTask(t)}
                  isSelected={selectedTask?.id === t.id}
                />
              ))}
            </div>
          </div>,
        );
        curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
      }
    } else {
      if (sortedDates.length === 0)
        return (
          <div className="p-4 text-secondary text-sm">No scheduled tasks.</div>
        );
      for (let i = 0; i < sortedDates.length; i++) {
        const dNum = sortedDates[i];
        const dateObj = parseDateStr(dNum);

        const prevObj = new Date(dateObj.getTime() - 24 * 60 * 60 * 1000);
        const nextObj = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000);

        const prevNum = parseInt(
          prevObj.getFullYear().toString() +
            (prevObj.getMonth() + 1).toString().padStart(2, "0") +
            prevObj.getDate().toString().padStart(2, "0"),
          10,
        );
        const nextNum = parseInt(
          nextObj.getFullYear().toString() +
            (nextObj.getMonth() + 1).toString().padStart(2, "0") +
            nextObj.getDate().toString().padStart(2, "0"),
          10,
        );

        const renderDay = (n: number, isMain: boolean) => (
          <div key={`${dNum}-${n}`} className="flex min-h-[80px] relative">
            <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center relative">
              <TimelineTicks />
              <div className="flex flex-col items-center justify-center bg-surface px-1 py-1 relative z-10 mt-[-10px]">
                <span
                  className={`text-sm tracking-wide ${isMain ? "text-primary font-medium" : "text-secondary opacity-50"}`}
                >
                  {formatDateShort(parseDateStr(n))}
                </span>
              </div>
            </div>
            <div className="flex-1 p-2 space-y-2 border-l border-border-default ml-[-1px] bg-surface">
              {(groupedScheduled[n] || []).map((t) => (
                <ScheduledTask
                  key={t.id}
                  task={t}
                  onClick={() => onSelectTask(t)}
                  isSelected={selectedTask?.id === t.id}
                />
              ))}
            </div>
          </div>
        );

        if (
          !groupedScheduled[prevNum] ||
          groupedScheduled[prevNum].length === 0
        )
          timelineItems.push(renderDay(prevNum, false));
        timelineItems.push(renderDay(dNum, true));
        if (
          !groupedScheduled[nextNum] ||
          groupedScheduled[nextNum].length === 0
        )
          timelineItems.push(renderDay(nextNum, false));

        if (i < sortedDates.length - 1 && sortedDates[i + 1] > nextNum + 1) {
          timelineItems.push(
            <div
              key={`break-${dNum}`}
              className="flex h-12 items-center bg-surface-raised relative"
            >
              <div className="w-20 flex-shrink-0 h-full relative border-r border-border-default">
                <svg
                  className="absolute inset-x-0 top-1/2 -mt-2 w-full h-4 text-border-strong opacity-50"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                >
                  <path
                    d="M0,50 Q25,0 50,50 T100,50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="flex-1"></div>
            </div>,
          );
        }
      }
    }

    return <div className="flex flex-col">{timelineItems}</div>;
  };

  return (
    <div className="w-1/3 border-r border-border-default flex flex-col bg-surface">
      <div className="p-4 border-b border-border-default bg-surface flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-primary">Scheduled</h2>
        <div className="flex bg-surface-raised rounded-md p-0.5 border border-border-default">
          <button
            onClick={() => setTimelineMode("compact")}
            className={`px-3 py-1 text-xs rounded-sm transition-colors ${timelineMode === "compact" ? "bg-surface shadow-sm text-primary" : "text-secondary hover:text-primary"}`}
          >
            Compact
          </button>
          <button
            onClick={() => setTimelineMode("continuous")}
            className={`px-3 py-1 text-xs rounded-sm transition-colors ${timelineMode === "continuous" ? "bg-surface shadow-sm text-primary" : "text-secondary hover:text-primary"}`}
          >
            Continuous
          </button>
        </div>
      </div>
      <div 
        className="overflow-y-auto bg-surface relative"
        style={{ height: 'calc(100vh - 120px)' }}
        onScroll={handleScroll}
      >
        <div className="relative z-10">{renderTimeline()}</div>
      </div>
    </div>
  );
}
