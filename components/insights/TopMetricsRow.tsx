"use client";

import { motion } from "motion/react";

interface TopMetricsRowProps {
  data: {
    carryOverRate: number;
    completionRate: number;
    timeOverCommit: number;
    baselineRatio: number;
    usage: { dayCost: number; maxCost: number } | null;
  };
}

export function TopMetricsRow({ data }: TopMetricsRowProps) {
  const formatPct = (val: number) => `${Math.round(val * 100)}%`;

  return (
    <div className="flex flex-col gap-4">
      {/* AI Usage Full Width Bar */}
      {data.usage && data.usage.maxCost > 0 && (() => {
        const pct = Math.min(
          100,
          Math.round((data.usage.dayCost / data.usage.maxCost) * 100)
        );
        let colorVar = "var(--status-done)";
        if (pct > 30 && pct <= 80) colorVar = "var(--status-warning)";
        if (pct > 80) colorVar = "var(--status-missed)";

        const now = new Date();
        const endOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        );
        const msLeft = endOfDay.getTime() - now.getTime();
        const hrs = Math.floor(msLeft / 3600000);
        const mins = Math.floor((msLeft % 3600000) / 60000);

        return (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col gap-3 rounded-xl p-6 bg-surface border border-border-default shadow-sm"
          >
            <div className="flex justify-between items-end">
              <span className="text-lg font-bold text-primary tracking-tight">AI usage</span>
              <span className="text-lg font-bold text-primary tracking-tight">{pct}% used</span>
            </div>
            <div className="w-full h-4 bg-surface-raised border border-border-strong rounded-md overflow-hidden relative shadow-inner">
              <div
                className="h-full transition-all duration-1000 ease-out"
                style={{ width: `${pct}%`, backgroundColor: colorVar }}
              />
            </div>
            <div className="flex justify-end">
              <span className="text-sm text-secondary font-medium tracking-wide">
                Refresh in {hrs}h {mins}m
              </span>
            </div>
          </motion.div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Carry-over rate */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 flex flex-col justify-center"
          style={{ backgroundColor: "var(--bg-done-subtle)" }}
        >
          <span
            className="text-3xl font-medium tracking-tight"
            style={{ color: "var(--status-done)" }}
          >
            {formatPct(data.carryOverRate)}
          </span>
          <span
            className="text-sm mt-1 opacity-80"
            style={{ color: "var(--status-done)" }}
          >
            Carry-over rate
          </span>
        </motion.div>

        {/* Completion rate */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl p-5 flex flex-col justify-center"
          style={{ backgroundColor: "var(--bg-done-subtle)" }}
        >
          <span
            className="text-3xl font-medium tracking-tight"
            style={{ color: "var(--status-done)" }}
          >
            {formatPct(data.completionRate)}
          </span>
          <span
            className="text-sm mt-1 opacity-80"
            style={{ color: "var(--status-done)" }}
          >
            Completion rate
          </span>
        </motion.div>

        {/* Time over-commit */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl p-5 flex flex-col justify-center"
          style={{ backgroundColor: "var(--bg-warning-subtle)" }}
        >
          <span
            className="text-3xl font-medium tracking-tight"
            style={{ color: "var(--status-warning)" }}
          >
            {formatPct(data.timeOverCommit)}
          </span>
          <span
            className="text-sm mt-1 opacity-80"
            style={{ color: "var(--status-warning)" }}
          >
            Time over-commit
          </span>
        </motion.div>

        {/* Baseline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl p-5 flex flex-col justify-center bg-surface-raised border border-border-default"
        >
          <span className="text-3xl font-medium tracking-tight text-primary">
            {data.baselineRatio.toFixed(2)}×
          </span>
          <span className="text-sm mt-1 text-secondary">Vs 14d baseline</span>
        </motion.div>
      </div>
    </div>
  );
}
