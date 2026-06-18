"use client";

import { useState, useEffect, useCallback } from "react";
import type { DayLog, Project } from "@/lib/types";
import { formatUnixDay, todayUnixDay } from "@/lib/types";
import { listDayLogs, listProjects, listTasks } from "@/lib/api-client";
import {
  LoadingScreen,
  ErrorBanner,
  EmptyState,
  SectionHeader,
  ProgressBar,
  TypeBadge,
} from "@/components/ui";

function RatioBar({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100);
  const color =
    pct >= 80 ? "green" : pct >= 50 ? "yellow" : "red";
  return (
    <div className="space-y-0.5">
      <ProgressBar value={ratio} max={1} color={color} />
      <p className="text-xs text-gray-500 text-right">{pct}%</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded border bg-white p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function InsightsPage() {
  const [logs, setLogs] = useState<DayLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTaskCounts, setProjectTaskCounts] = useState<
    Record<string, { total: number; done: number; pending: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = todayUnixDay();
      const from = today - days + 1;
      const [logData, projs] = await Promise.all([
        listDayLogs(from, today),
        listProjects(),
      ]);
      setLogs(logData);
      setProjects(projs.filter((p) => !p.isDefault));

      // Load task stats per project
      const stats = await Promise.all(
        projs
          .filter((p) => !p.isDefault)
          .map(async (p) => {
            const tasks = await listTasks({ project_id: p.id });
            return [
              p.id,
              {
                total: tasks.length,
                done: tasks.filter((t) => t.status === "done").length,
                pending: tasks.filter((t) => t.status === "pending").length,
              },
            ] as const;
          })
      );
      setProjectTaskCounts(Object.fromEntries(stats));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingScreen message="Loading insights…" />;
  if (error)
    return (
      <div className="p-4">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );

  // ── Computed stats ─────────────────────────────────────────────────────────
  const totalLogs = logs.length;
  const totalCompleted = logs.reduce((s, l) => s + l.tasksCompleted, 0);
  const totalMissed = logs.reduce((s, l) => s + l.tasksMissed, 0);
  const totalAssigned = logs.reduce((s, l) => s + l.tasksAssigned, 0);
  const avgRatio =
    totalLogs > 0
      ? logs.reduce((s, l) => s + l.ratio, 0) / totalLogs
      : 0;

  // Streak (consecutive days with ratio >= 0.5)
  const sortedLogs = [...logs].sort((a, b) => b.date - a.date);
  let streak = 0;
  for (const log of sortedLogs) {
    if (log.ratio >= 0.5) streak++;
    else break;
  }

  // Rolling 7d average
  const today = todayUnixDay();
  const last7 = logs.filter((l) => l.date >= today - 6);
  const rolling7 =
    last7.length > 0
      ? last7.reduce((s, l) => s + l.ratio, 0) / last7.length
      : 0;

  // Project health: neglected = no done tasks + has pending
  const now = Math.floor(Date.now() / 1000);
  const neglected = projects.filter((p) => {
    const stats = projectTaskCounts[p.id];
    return stats && stats.done === 0 && stats.pending > 0;
  });
  const approaching = projects.filter((p) => {
    if (!p.deadlineAt) return false;
    const daysLeft = (p.deadlineAt - now) / 86400;
    return daysLeft >= 0 && daysLeft <= 14;
  });

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <h1 className="font-semibold text-gray-800">Insights</h1>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded px-2 py-1 text-xs ${
                days === d
                  ? "bg-blue-600 text-white"
                  : "border text-gray-600 hover:bg-gray-50"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Overview */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
            Overview — last {days} days
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Avg Completion"
              value={`${Math.round(avgRatio * 100)}%`}
              sub={`${totalLogs} days tracked`}
            />
            <StatCard
              label="Tasks Completed"
              value={totalCompleted}
              sub={`of ${totalAssigned} assigned`}
            />
            <StatCard label="Tasks Missed" value={totalMissed} />
            <StatCard
              label="Current Streak"
              value={`${streak}d`}
              sub="≥50% completion"
            />
          </div>
        </section>

        {/* Consistency */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
            Consistency
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border bg-white p-4 space-y-1">
              <p className="text-xs text-gray-500">7-day rolling avg</p>
              <p className="text-lg font-bold">{Math.round(rolling7 * 100)}%</p>
              <RatioBar ratio={rolling7} />
            </div>
            <div className="rounded border bg-white p-4 space-y-1">
              <p className="text-xs text-gray-500">{days}-day avg</p>
              <p className="text-lg font-bold">{Math.round(avgRatio * 100)}%</p>
              <RatioBar ratio={avgRatio} />
            </div>
          </div>
        </section>

        {/* Recent Days */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
            Recent Days
          </p>
          {logs.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No day logs yet"
              description="Confirm your day to start tracking."
            />
          ) : (
            <div className="rounded border bg-white overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-500 font-medium">Date</th>
                    <th className="text-center px-3 py-2 text-gray-500 font-medium">Done</th>
                    <th className="text-center px-3 py-2 text-gray-500 font-medium">Missed</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium">Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLogs.slice(0, 30).map((log) => (
                    <tr key={log.id} className="border-t">
                      <td className="px-3 py-2 text-gray-700">
                        {formatUnixDay(log.date)}
                      </td>
                      <td className="px-3 py-2 text-center text-green-600 font-medium">
                        {log.tasksCompleted}
                      </td>
                      <td className="px-3 py-2 text-center text-red-500">
                        {log.tasksMissed}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`font-medium ${
                              log.ratio >= 0.8
                                ? "text-green-600"
                                : log.ratio >= 0.5
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {Math.round(log.ratio * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Project Health */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
            Project Health
          </p>

          {neglected.length === 0 && approaching.length === 0 ? (
            <div className="rounded border bg-white p-4 text-sm text-gray-500 text-center">
              All projects look healthy 👍
            </div>
          ) : (
            <div className="space-y-3">
              {neglected.map((p) => (
                <div
                  key={p.id}
                  className="rounded border border-orange-200 bg-orange-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-800">{p.name}</p>
                      <p className="text-xs text-orange-600">
                        Neglected — {projectTaskCounts[p.id]?.pending ?? 0} pending tasks, 0 done
                      </p>
                    </div>
                    <TypeBadge type={p.type} />
                  </div>
                </div>
              ))}

              {approaching.map((p) => {
                const daysLeft = Math.ceil(
                  ((p.deadlineAt ?? 0) - now) / 86400
                );
                return (
                  <div
                    key={p.id}
                    className="rounded border border-red-200 bg-red-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-800">{p.name}</p>
                        <p className="text-xs text-red-600">
                          Deadline in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <TypeBadge type={p.type} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
