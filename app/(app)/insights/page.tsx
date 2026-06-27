"use client";

import { useCallback, useEffect, useState } from "react";
import { InsightsDashboard } from "@/components/insights/InsightsDashboard";
import { InsightsSkeleton } from "@/components/skeletons";
import { ErrorBanner } from "@/components/ui";
import { listDayLogs, listProjects, listTasks, getTodayUsage } from "@/lib/api-client";
import type { DayLog, Project, Task } from "@/lib/types";
import { todayUnixDay } from "@/lib/types";

export default function InsightsPage() {
  const [logs, setLogs] = useState<DayLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [projectTaskCounts, setProjectTaskCounts] = useState<
    Record<string, { total: number; done: number; pending: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [usage, setUsage] = useState<{ dayCost: number; maxCost: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = todayUnixDay();
      const from = today - days + 1;
      const [logData, projs, allTasksData, usageData] = await Promise.all([
        listDayLogs(from, today),
        listProjects(),
        listTasks({}),
        getTodayUsage(),
      ]);
      setLogs(logData);
      setUsage(usageData);
      const filteredProjects = projs.filter((p) => !p.isDefault);
      setProjects(filteredProjects);
      setAllTasks(allTasksData);

      // Load task stats per project
      const stats = await Promise.all(
        filteredProjects.map(async (p) => {
          const projectTasks = allTasksData.filter((t) => t.projectId === p.id);
          return [
            p.id,
            {
              total: projectTasks.length,
              done: projectTasks.filter((t) => t.status === "done").length,
              pending: projectTasks.filter((t) => t.status === "pending")
                .length,
            },
          ] as const;
        }),
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

  if (loading) return <InsightsSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <InsightsDashboard
      logs={logs}
      projects={projects}
      allTasks={allTasks}
      projectTaskCounts={projectTaskCounts}
      days={days}
      setDays={setDays}
      usage={usage}
    />
  );
}
