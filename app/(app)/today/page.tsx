"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import type { Task, Project, TodayPlannerData, MorningNudgeData } from "@/lib/types";
import { formatMinutes, todayUnixDay } from "@/lib/types";
import {
  getTodayPlan,
  listTasks,
  listProjects,
  confirmDay,
  generateMorningNudge,
  generateEodSummary,
  updateTask,
  placeDayPlanBlock,
} from "@/lib/api-client";
import {
  LoadingScreen,
  ErrorBanner,
  EmptyState,
  SectionHeader,
  TaskRow,
  QuickCapture,
  ProgressBar,
  Spinner,
} from "@/components/ui";
import { Timeline } from "@/components/Timeline";

export default function TodayPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading today's plan…" />}>
      <TodayPageContent />
    </Suspense>
  );
}

function TodayPageContent() {
  const [plan, setPlan] = useState<TodayPlannerData | null>(null);
  const [bucketTasks, setBucketTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [nudge, setNudge] = useState<MorningNudgeData | null>(null);
  const [eodSummary, setEodSummary] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeError, setNudgeError] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [eodLoading, setEodLoading] = useState(false);
  const [eodError, setEodError] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number>(todayUnixDay());
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});

  const toggleProject = (projectId: string) => {
    setCollapsedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planData, bucket, projs] = await Promise.all([
        getTodayPlan(selectedDate),
        listTasks({ bucket: true }),
        listProjects(),
      ]);
      setPlan(planData);
      setBucketTasks(bucket);
      setProjects(projs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selectedDate !== todayUnixDay()) {
      setNudge(null);
      setEodSummary(null);
      return;
    }
    
    try {
      const CACHE_EXPIRY = 3600000; // 1 hour
      
      const cachedNudgeStr = localStorage.getItem(`morning_nudge_${selectedDate}`);
      if (cachedNudgeStr) {
        const { data, timestamp } = JSON.parse(cachedNudgeStr);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          setNudge(data);
        } else {
          localStorage.removeItem(`morning_nudge_${selectedDate}`);
          setNudge(null);
        }
      } else {
        setNudge(null);
      }

      const cachedEodStr = localStorage.getItem(`eod_summary_${selectedDate}`);
      if (cachedEodStr) {
        const { data, timestamp } = JSON.parse(cachedEodStr);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          setEodSummary(data);
        } else {
          localStorage.removeItem(`eod_summary_${selectedDate}`);
          setEodSummary(null);
        }
      } else {
        setEodSummary(null);
      }
    } catch (e) {
      console.error("Cache parsing error", e);
    }
  }, [selectedDate]);

  const handleNudge = async () => {
    setNudgeLoading(true);
    setNudgeError(null);
    try {
      const data = await generateMorningNudge();
      setNudge(data);
      localStorage.setItem(`morning_nudge_${selectedDate}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      setNudgeError((e as Error).message);
    } finally {
      setNudgeLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirmLoading(true);
    try {
      const dayLog = await confirmDay();
      setPlan((prev) => prev ? { ...prev, dayLog } : prev);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleEod = async () => {
    setEodLoading(true);
    setEodError(null);
    try {
      const data = await generateEodSummary();
      setEodSummary(data.summary);
      localStorage.setItem(`eod_summary_${selectedDate}`, JSON.stringify({
        data: data.summary,
        timestamp: Date.now()
      }));
    } catch (e) {
      setEodError((e as Error).message);
    } finally {
      setEodLoading(false);
    }
  };

  const scheduleFromBucket = async (task: Task) => {
    try {
      const updated = await updateTask(task.id, {
        scheduled_date: selectedDate,
      });
      // Move from bucket to scheduled
      setBucketTasks((prev) => prev.filter((t) => t.id !== task.id));
      setPlan((prev) =>
        prev ? { ...prev, tasks: [...prev.tasks, updated] } : prev
      );
      
      // Silently refresh the bucket to load any newly unblocked tasks
      listTasks({ bucket: true }).then((newBucketTasks) => {
        setBucketTasks(newBucketTasks);
      });
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleTaskUpdated = (updated: Task) => {
    const oldTask = plan?.tasks.find(t => t.id === updated.id);
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === updated.id ? updated : t)),
      };
    });

    if (oldTask && oldTask.status !== "done" && updated.status === "done") {
      if (eodSummary && selectedDate === todayUnixDay()) {
        handleEod();
      }
    }
  };

  const handleBucketUpdated = (updated: Task) => {
    if (updated.scheduledDate !== null) {
      // Was scheduled — move out of bucket
      setBucketTasks((prev) => prev.filter((t) => t.id !== updated.id));
      setPlan((prev) =>
        prev ? { ...prev, tasks: [...prev.tasks, updated] } : prev
      );
    } else {
      setBucketTasks((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
    }
  };

  const handlePlaceBlock = async (taskId: string, startTime: number) => {
    if (!plan) return;
    try {
      await placeDayPlanBlock(taskId, plan.date, startTime);
      setPlan((prev) => {
        if (!prev) return prev;
        const newPlans = prev.dayPlans.filter(p => p.taskId !== taskId);
        newPlans.push({
          userId: "", // Placeholder or ignored by UI
          taskId,
          planDate: plan.date,
          startTime,
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        });
        return { ...prev, dayPlans: newPlans };
      });
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (loading) return <LoadingScreen message="Loading today's plan…" />;
  if (error) return (
    <div className="p-4">
      <ErrorBanner message={error} onRetry={load} />
    </div>
  );
  if (!plan) return null;

  const scheduledTasks = plan.tasks;
  const pendingCount = scheduledTasks.filter((t) => t.status === "pending").length;
  const doneCount = scheduledTasks.filter((t) => t.status === "done").length;
  const capacityPct = plan.availableMin > 0
    ? Math.min(plan.totalEstimatedMin / plan.availableMin, 1.5)
    : 0;

  const bucketTasksByProject = bucketTasks.reduce((acc, task) => {
    if (!acc[task.projectId]) acc[task.projectId] = [];
    acc[task.projectId].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [year, month, day] = val.split("-").map(Number);
    const newDate = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
    if (newDate <= todayUnixDay()) {
      setSelectedDate(newDate);
    }
  };

  const isoDate = new Date(selectedDate * 86400000).toISOString().split("T")[0];
  const maxDate = new Date(todayUnixDay() * 86400000).toISOString().split("T")[0];

  return (
    <div className="flex flex-col flex-1">
      {/* Date Header */}
      <div className="border-b border-border-default bg-surface px-4 py-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-primary">
          {selectedDate === todayUnixDay() ? "Today" : "Past Log"}
        </h1>
        <input 
          type="date"
          className="text-sm border border-border-default rounded px-2 py-1 text-secondary"
          value={isoDate}
          max={maxDate}
          onChange={handleDateChange}
        />
      </div>

      {/* Desktop: two-column */}
      <div className="flex flex-col md:flex-row flex-1 gap-0 min-h-0">
        {/* ── Left / Main column ── */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border-default">
          {/* Morning Nudge */}
          <div className="border-b border-border-default bg-surface">
            <SectionHeader
              title="Morning Nudge"
              action={
                <button
                  onClick={handleNudge}
                  disabled={nudgeLoading || selectedDate !== todayUnixDay()}
                  className="text-xs text-accent hover:underline disabled:opacity-50"
                  title={selectedDate !== todayUnixDay() ? "Only available for today" : ""}
                >
                  {nudgeLoading ? "Generating…" : "Generate"}
                </button>
              }
            />
            <div className="px-4 py-3">
              {nudgeLoading && (
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <Spinner size="sm" /> Generating nudge…
                </div>
              )}
              {nudgeError && <p className="text-xs text-red-600">{nudgeError}</p>}
              {nudge && !nudgeLoading && (
                <div>
                  <p className="text-sm text-secondary leading-relaxed">{nudge.nudge}</p>
                  {nudge.projects.length > 0 && (
                    <p className="text-xs text-tertiary mt-2">
                      Focus: {nudge.projects.map((p) => p.name).join(", ")}
                    </p>
                  )}
                </div>
              )}
              {!nudge && !nudgeLoading && !nudgeError && (
                <p className="text-xs text-tertiary">
                  Click Generate to get your morning nudge.
                </p>
              )}
            </div>
          </div>

          {/* Today's Tasks */}
          <div className="flex-1 flex flex-col">
            <SectionHeader
              title={`${selectedDate === todayUnixDay() ? "Today's" : "Past"} Tasks (${doneCount}/${scheduledTasks.length})`}
              action={
                <button
                  onClick={() => setShowCapture(true)}
                  className="text-xs text-accent hover:underline"
                >
                  + Add
                </button>
              }
            />

            {scheduledTasks.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No tasks scheduled"
                description="Add tasks from the inbox or use Quick Capture."
              />
            ) : (
              <div className="flex flex-col">
                {scheduledTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    projects={projects}
                    onUpdated={handleTaskUpdated}
                    onUnscheduled={load}
                  />
                ))}
              </div>
            )}
          </div>

          <Timeline
            tasks={scheduledTasks}
            dayPlans={plan.dayPlans}
            onPlaceBlock={handlePlaceBlock}
          />
        </div>

        {/* ── Right / Supporting column ── */}
        <div className="w-full md:w-72 flex flex-col shrink-0">
          {/* Capacity */}
          <div className="border-b border-border-default bg-surface">
            <SectionHeader title="Capacity" />
            <div className="px-4 py-3 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Available</span>
                <span className="font-medium">{formatMinutes(plan.availableMin)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Planned</span>
                <span className={`font-medium ${plan.overloaded ? "text-red-600" : "text-primary"}`}>
                  {formatMinutes(plan.totalEstimatedMin)}
                </span>
              </div>
              <ProgressBar
                value={plan.totalEstimatedMin}
                max={plan.availableMin}
                color={plan.overloaded ? "red" : capacityPct > 0.8 ? "yellow" : "green"}
              />
              {plan.overloaded && (
                <p className="text-xs text-red-600 font-medium">⚠ Overloaded</p>
              )}
              {plan.dayLog && (
                <p className="text-xs text-green-600 font-medium">✓ Day confirmed</p>
              )}
            </div>
          </div>

          {/* Day Actions */}
          <div className="border-b border-border-default bg-surface">
            <SectionHeader title="Day Actions" />
            <div className="px-4 py-3 space-y-2">
              <button
                onClick={handleConfirm}
                disabled={confirmLoading || selectedDate !== todayUnixDay()}
                className="w-full rounded border border-blue-600 px-3 py-2 text-sm text-accent hover:bg-accent-subtle disabled:opacity-50"
                title={selectedDate !== todayUnixDay() ? "Only available for today" : ""}
              >
                {confirmLoading ? "Confirming…" : plan.dayLog ? "Re-confirm Day" : "Confirm Day"}
              </button>
              <button
                onClick={handleEod}
                disabled={eodLoading || selectedDate !== todayUnixDay()}
                className="w-full rounded border border-border-default px-3 py-2 text-sm text-secondary hover:bg-surface-raised disabled:opacity-50"
                title={selectedDate !== todayUnixDay() ? "Only available for today" : ""}
              >
                {eodLoading ? "Generating…" : "End-of-Day Summary"}
              </button>
            </div>
          </div>

          {/* EOD Summary Result */}
          {(eodLoading || eodSummary !== null || eodError !== null) && (
            <div className="border-b border-border-default p-4 bg-accent-subtle">
              {eodLoading && (
                <div className="flex items-center gap-2 text-sm text-accent">
                  <Spinner size="sm" /> Generating summary…
                </div>
              )}
              {!eodLoading && eodError && <p className="text-xs text-red-600">{eodError}</p>}
              {!eodLoading && typeof eodSummary === "string" && eodSummary.trim() !== "" && (
                <p className="text-sm text-primary leading-relaxed">{eodSummary}</p>
              )}
              {!eodLoading && typeof eodSummary === "string" && eodSummary.trim() === "" && (
                <p className="text-sm text-secondary italic">No summary could be generated.</p>
              )}
            </div>
          )}

          {/* Inbox / Bucket */}
          <div className="flex-1 flex flex-col bg-surface border-b border-border-default">
            <SectionHeader
              title={`Inbox (${bucketTasks.length})`}
              action={
                <button
                  onClick={() => setShowCapture(true)}
                  className="text-xs text-accent hover:underline"
                >
                  + Add
                </button>
              }
            />
            {bucketTasks.length === 0 ? (
              <EmptyState icon="✅" title="Inbox clear" />
            ) : (
              <div className="flex flex-col overflow-y-auto">
                {Object.entries(bucketTasksByProject).map(([projectId, tasks]) => {
                  const project = projects.find(p => p.id === projectId);
                  const projectName = project?.name || "Unknown Project";
                  const isCollapsed = collapsedProjects[projectId];
                  
                  return (
                    <div key={projectId} className="border-b border-border-default last:border-b-0">
                      <div 
                        className="px-4 py-2 bg-surface-raised flex items-center justify-between cursor-pointer hover:bg-surface-raised transition-colors"
                        onClick={() => toggleProject(projectId)}
                      >
                        <span className="text-xs font-semibold text-secondary uppercase tracking-wide">
                          {projectName} <span className="text-tertiary font-normal">({tasks.length})</span>
                        </span>
                        <span className="text-tertiary text-xs">
                          {isCollapsed ? "▼" : "▲"}
                        </span>
                      </div>
                      
                      {!isCollapsed && (
                        <div className="flex flex-col">
                          {tasks.map((task) => (
                            <div key={task.id} className="border-b border-border-default last:border-b-0 border border-border-default-gray-100">
                              <TaskRow
                                task={task}
                                projects={projects}
                                onUpdated={handleBucketUpdated}
                              />
                              <div className="px-4 pb-2">
                                <button
                                  onClick={() => scheduleFromBucket(task)}
                                  className="text-xs text-accent hover:underline"
                                >
                                  → {selectedDate === todayUnixDay() ? "Schedule today" : "Schedule for this day"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCapture(true)}
        className="fixed bottom-20 right-4 md:bottom-6 h-12 w-12 rounded-full bg-accent text-white text-2xl shadow-lg flex items-center justify-center hover:bg-blue-700 z-40"
        aria-label="Quick capture"
      >
        +
      </button>

      {showCapture && (
        <QuickCapture
          projects={projects}
          defaultScheduledDate={selectedDate}
          onCreated={(task) => {
            const tasksList = Array.isArray(task) ? task : [task];
            for (const t of tasksList) {
              if (t.scheduledDate !== null) {
                setPlan((prev) =>
                  prev ? { ...prev, tasks: [...prev.tasks, t] } : prev
                );
              } else {
                setBucketTasks((prev) => [...prev, t]);
              }
            }
            setShowCapture(false);
          }}
          onClose={() => setShowCapture(false)}
        />
      )}
    </div>
  );
}
