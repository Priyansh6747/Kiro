"use client";

import { motion } from "motion/react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface MiddleMetricsRowProps {
  data: {
    timeAllocation: { name: string; value: number; percentage: number }[];
    longestChain: { count: number; name: string };
  };
}

const COLORS = {
  Critical: "var(--status-critical)",
  Recurring: "var(--status-warning)",
  Habit: "var(--node-start)",
  Nicetohave: "var(--node-final)"
};

export function MiddleMetricsRow({ data }: MiddleMetricsRowProps) {
  // Safe default colors if type isn't perfectly matched
  const getColor = (name: string) => (COLORS as any)[name] || "var(--border-strong)";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Time Allocation Donut Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl p-6 flex flex-col justify-between bg-surface-raised border border-border-default"
      >
        <div>
          <h3 className="text-sm font-medium text-primary">Time allocation</h3>
          <p className="text-xs text-secondary mt-0.5">By project type, last 30 days</p>
        </div>

        <div className="flex items-center mt-4">
          <div className="w-32 h-32 relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={data.timeAllocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.timeAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex flex-col justify-center ml-6 space-y-2">
            {data.timeAllocation.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: getColor(entry.name) }} />
                <span className="text-secondary w-16">{entry.name}</span>
                <span className="text-secondary font-medium">{entry.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Longest procrastination chain */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-xl p-6 flex flex-col justify-between"
        style={{ backgroundColor: "var(--bg-warning-subtle)" }}
      >
        <div>
          <h3 className="text-sm font-medium" style={{ color: "var(--status-warning)" }}>
            Longest procrastination chain
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--status-warning)", opacity: 0.8 }}>
            Tracing carriedFromId pointers
          </p>
        </div>

        <div className="mt-8">
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-medium tracking-tight" style={{ color: "var(--status-warning)" }}>
              {data.longestChain.count}×
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--status-warning)" }}>
              {data.longestChain.name}
            </span>
          </div>

          <div className="flex gap-1.5 mt-6">
            {/* Render little dashes depending on the count, up to a reasonable max */}
            {Array.from({ length: Math.min(data.longestChain.count, 20) }).map((_, i) => (
              <div
                key={i}
                className="h-2 flex-1 rounded-sm opacity-80"
                style={{ backgroundColor: "var(--status-warning)" }}
              />
            ))}
            {data.longestChain.count === 0 && (
              <div className="h-2 flex-1 rounded-sm opacity-40" style={{ backgroundColor: "var(--status-warning)" }} />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
