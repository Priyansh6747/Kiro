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
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

      {/* AI Usage */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl p-5 flex flex-col justify-center bg-surface-raised border border-border-default"
      >
        <span className="text-3xl font-medium tracking-tight text-primary">
          {data.usage && data.usage.maxCost > 0
            ? `${Math.round((data.usage.dayCost / data.usage.maxCost) * 100)}%`
            : "0%"}
        </span>
        <span className="text-sm mt-1 text-secondary">Daily Quota Usage</span>
      </motion.div>
    </div>
  );
}
