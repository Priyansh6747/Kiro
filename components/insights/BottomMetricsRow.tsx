"use client";

import { motion } from "motion/react";
import type { Task } from "@/lib/types";

interface BottomMetricsRowProps {
  data: {
    peakHour: number;
    completedTasks: Task[];
  };
}

const formatHour = (h: number) => {
  const ampm = h >= 12 ? "pm" : "am";
  const hr = h % 12 || 12;
  const nextHr = (h + 1) % 12 || 12;
  const nextAmpm = h + 1 >= 12 && h + 1 < 24 ? "pm" : "am";
  return `${hr}${ampm === nextAmpm ? "" : ampm}–${nextHr}${nextAmpm}`;
};

const getDayName = (dayIndex: number) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[dayIndex];
};

export function BottomMetricsRow({ data }: BottomMetricsRowProps) {
  // Activity map: 7 days x 3 blocks (Morning, Afternoon, Evening)
  const activity = Array.from({ length: 7 }, () => [0, 0, 0]);
  let maxActivity = 0;

  const orderedDays = [6, 0, 1, 2, 3, 4, 5];

  data.completedTasks.forEach((t) => {
    if (t.completedAt) {
      const d = new Date(t.completedAt * 1000);
      const day = d.getDay();
      const hr = d.getHours();
      let block = 0;
      if (hr >= 12 && hr < 17) block = 1;
      else if (hr >= 17) block = 2;

      activity[day][block]++;
      if (activity[day][block] > maxActivity) {
        maxActivity = activity[day][block];
      }
    }
  });

  const getActivityOpacity = (count: number) => {
    if (count === 0) return 0.15; // Increased minimum opacity to ensure empty cells still look like part of a grid
    return Math.max(0.35, count / (maxActivity || 1));
  };

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl p-6 md:p-8 flex flex-col bg-surface-raised border border-border-default overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-border-subtle pb-6">
          <div>
            <h3 className="text-base font-extrabold text-primary tracking-tight">Productivity Heatmap</h3>
            <p className="text-sm text-secondary mt-1">Task completions grouped by time of day</p>
          </div>
          <div className="flex items-center gap-2 bg-surface px-4 py-2.5 rounded-lg border border-border-default shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--status-done)" }}></span>
            <span className="text-sm font-semibold text-primary">
              Peak Focus: <span className="text-secondary ml-1.5">{getDayName(orderedDays[2])} {formatHour(data.peakHour)}</span>
            </span>
          </div>
        </div>

        <div className="flex justify-center w-full">
          <div className="flex flex-col gap-2.5 w-full max-w-4xl">
            {/* Rows (Blocks 0, 1, 2) */}
            {[0, 1, 2].map((block, i) => (
              <div key={block} className="flex gap-2.5 relative group/row">
                {/* Y Axis Label */}
                <div className="w-20 flex items-center justify-end pr-4 text-[10px] font-bold text-tertiary uppercase tracking-wider">
                  {i === 0 ? "Morning" : i === 1 ? "Afternoon" : "Evening"}
                </div>
                {orderedDays.map((dayIdx) => {
                  const count = activity[dayIdx][block];
                  return (
                    <motion.div
                      key={`${dayIdx}-${block}`}
                      whileHover={{ scale: 1.05 }}
                      className="h-12 md:h-14 flex-1 rounded-lg transition-all cursor-pointer relative group/cell"
                      style={{
                        backgroundColor: "var(--status-done)",
                        opacity: getActivityOpacity(count),
                      }}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-surface border border-border-default rounded-md shadow-lg text-xs font-bold text-primary opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                        {count} task{count !== 1 && "s"}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}

            {/* X Axis Labels */}
            <div className="flex gap-2.5 mt-3">
              <div className="w-20"></div> {/* Offset for Y labels */}
              {orderedDays.map((dayIdx) => (
                <div key={`lbl-${dayIdx}`} className="flex-1 text-center text-[11px] font-bold text-secondary uppercase tracking-wider">
                  {getDayName(dayIdx)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
