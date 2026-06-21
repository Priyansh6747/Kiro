"use client";

import { motion } from "motion/react";
import type { Task } from "@/lib/types";

interface BottomMetricsRowProps {
  data: {
    peakHour: number;
    completedTasks: Task[];
    dayTypes: { normal: number; adjusted: number; break: number };
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
  // 0=Sun..6=Sat. Block 0: 0-11, Block 1: 12-17, Block 2: 18-23.
  const activity = Array.from({ length: 7 }, () => [0, 0, 0]);
  let maxActivity = 0;

  // Let's populate the activity map (we want Sat to Fri as per the image, but we'll adapt to JS standard Sun-Sat or shift to match image)
  // Image days order: Sat, Sun, Mon, Tue, Wed, Thu, Fri.
  // We'll use: 6 (Sat), 0 (Sun), 1 (Mon), 2 (Tue), 3 (Wed), 4 (Thu), 5 (Fri)
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
    if (count === 0) return 0.2;
    return Math.max(0.4, count / (maxActivity || 1));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {/* Productivity by hour */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl p-6 flex flex-col justify-between bg-surface-raised border border-border-default md:col-span-3"
      >
        <div>
          <h3 className="text-sm font-medium text-primary">Productivity by hour</h3>
          <p className="text-xs text-secondary mt-0.5">Completions across the week</p>
        </div>

        <div className="mt-6 flex flex-col gap-1.5">
          {/* Rows (Blocks 0, 1, 2) */}
          {[0, 1, 2].map((block) => (
            <div key={block} className="flex gap-1.5">
              {orderedDays.map((dayIdx) => {
                const count = activity[dayIdx][block];
                return (
                  <div
                    key={`${dayIdx}-${block}`}
                    className="h-6 flex-1 rounded-sm transition-opacity"
                    style={{
                      backgroundColor: "var(--status-done)",
                      opacity: getActivityOpacity(count),
                    }}
                  />
                );
              })}
            </div>
          ))}

          {/* X Axis Labels */}
          <div className="flex gap-1.5 mt-2">
            {orderedDays.map((dayIdx) => (
              <div key={`lbl-${dayIdx}`} className="flex-1 text-center text-[10px] text-secondary font-medium">
                {getDayName(dayIdx)}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-xs text-secondary">
          Peak: {getDayName(orderedDays[2])} {formatHour(data.peakHour)}
        </div>
      </motion.div>

      {/* Day-type balance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-xl p-6 flex flex-col bg-surface-raised border border-border-default md:col-span-2"
      >
        <div>
          <h3 className="text-sm font-medium text-primary">Day-type balance</h3>
          <p className="text-xs text-secondary mt-0.5">Last 7 days</p>
        </div>

        <div className="mt-auto space-y-4 pt-6">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#5A9BFC" }} />
              <span className="text-secondary">Normal</span>
            </div>
            <span className="text-primary font-medium">{data.dayTypes.normal}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#F5B258" }} />
              <span className="text-secondary">Adjusted</span>
            </div>
            <span className="text-primary font-medium">{data.dayTypes.adjusted}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#5EE0A8" }} />
              <span className="text-secondary">Break</span>
            </div>
            <span className="text-primary font-medium">{data.dayTypes.break}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
