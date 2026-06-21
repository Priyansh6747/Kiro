"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import type { Task, Project, TodayPlannerData } from "@/lib/types";
import { todayUnixDay } from "@/lib/types";
import {
  getTodayPlan,
  listTasks,
  listProjects,
  updateTask,
  placeDayPlanBlock,
  removeDayPlanBlock,
  createTask,
} from "@/lib/api-client";
import { LoadingScreen, ErrorBanner, QuickCapture } from "@/components/ui";
import { DayPlanner } from "@/components/DayPlanner";
import { DayView } from "@/components/DayView";
import { ArcDial } from "@/components/ArcDial";
import { BucketDrawer } from "@/components/BucketDrawer";
import { TodaySkeleton } from "@/components/TodaySkeleton";
import { useToast } from "@/hooks/useToast";

export default function TodayPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading today's plan…" />}>
      <TodayPageContent />
    </Suspense>
  );
}

function TodayPageContent() {
  const { showToast } = useToast();
  const [plan, setPlan] = useState<TodayPlannerData | null>(null);
  const [bucketTasks, setBucketTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number>(0);
  const [displayedDate, setDisplayedDate] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "left",
  );
  const [isExiting, setIsExiting] = useState(false);

  const [activeTab, setActiveTab] = useState<"anytime" | "dayview">("anytime");

  const [isBucketOpen, setIsBucketOpen] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);

  const [animatingTasksStatus, setAnimatingTasksStatus] = useState<
    Record<string, "loading" | "success" | "error">
  >({});

  const [dependencyModal, setDependencyModal] = useState<{
    task: Task;
    successors: Task[];
    onConfirm: () => void;
  } | null>(null);

  const handleDateChange = (newDate: number) => {
    if (newDate === selectedDate) return;
    if (newDate < selectedDate) setSlideDirection("right");
    else setSlideDirection("left");

    setIsExiting(true);
    setSelectedDate(newDate);
    setIsBucketOpen(false); // Close bucket if navigating away
  };

  const load = useCallback(async () => {
    if (selectedDate === 0) return;
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
      setDisplayedDate(selectedDate);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setInitialLoading(false);
      setIsExiting(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    const today = todayUnixDay();
    setSelectedDate(today);
    setDisplayedDate(today);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scheduleFromBucket = async (task: Task) => {
    // 1. Optimistic move to "Any Time Today"
    setBucketTasks((prev) => prev.filter((t) => t.id !== task.id));
    setPlan((prev) =>
      prev ? { ...prev, tasks: [...prev.tasks, task] } : prev,
    );

    // 2. Pulse loading state
    setAnimatingTasksStatus((prev) => ({ ...prev, [task.id]: "loading" }));

    try {
      const updated = await updateTask(task.id, {
        scheduled_date: selectedDate,
      });
      // 3. API success -> blink green
      setAnimatingTasksStatus((prev) => ({ ...prev, [task.id]: "success" }));

      setTimeout(() => {
        setPlan((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) => (t.id === task.id ? updated : t)),
              }
            : prev,
        );
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      }, 500);

      listTasks({ bucket: true }).then(setBucketTasks);
      // Fetch updated dependencies to ensure the 'Remove Dependencies' modal works correctly
      getTodayPlan(selectedDate).then((planData) => {
        setPlan((prev) =>
          prev
            ? { ...prev, taskDependencies: planData.taskDependencies }
            : prev,
        );
      });
    } catch (e) {
      showToast((e as Error).message, "error");
      // 4. API error -> blink red, then revert
      setAnimatingTasksStatus((prev) => ({ ...prev, [task.id]: "error" }));

      setTimeout(() => {
        setPlan((prev) =>
          prev
            ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== task.id) }
            : prev,
        );
        setBucketTasks((prev) => {
          // Only add back if it's not already there
          if (prev.some((t) => t.id === task.id)) return prev;
          return [...prev, task];
        });
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
        listTasks({ bucket: true }).then(setBucketTasks);
      }, 500);
    }
  };

  const computeAllSuccessors = (
    taskId: string,
    deps: { taskId: string; predecessorId: string }[],
    allTasks: Task[],
  ) => {
    const toUnschedule = new Set<string>();
    let currentLevel = [taskId];
    while (currentLevel.length > 0) {
      const nextLevel: string[] = [];
      for (const id of currentLevel) {
        const children = deps
          .filter((d) => d.predecessorId === id)
          .map((d) => d.taskId);
        for (const child of children) {
          if (!toUnschedule.has(child)) {
            toUnschedule.add(child);
            nextLevel.push(child);
          }
        }
      }
      currentLevel = nextLevel;
    }
    return Array.from(toUnschedule)
      .map((id) => allTasks.find((t) => t.id === id))
      .filter(Boolean) as Task[];
  };

  const unscheduleToBucket = (task: Task) => {
    if (!plan) return;
    const successors = computeAllSuccessors(
      task.id,
      plan.taskDependencies || [],
      plan.tasks,
    );
    if (successors.length > 0) {
      setDependencyModal({
        task,
        successors,
        onConfirm: () => {
          setDependencyModal(null);
          doUnscheduleToBucket(task, successors);
        },
      });
    } else {
      doUnscheduleToBucket(task, []);
    }
  };

  const doUnscheduleToBucket = async (task: Task, successors: Task[]) => {
    const allToUnschedule = [task, ...successors];

    // 1. Loading sequential
    for (const t of allToUnschedule) {
      setAnimatingTasksStatus((prev) => ({ ...prev, [t.id]: "loading" }));
      await new Promise((r) => setTimeout(r, 200));
    }

    try {
      await updateTask(task.id, { scheduled_date: null });

      const [newPlan, newBucketTasks] = await Promise.all([
        getTodayPlan(selectedDate),
        listTasks({ bucket: true }),
      ]);

      // 2. Success sequential
      for (const t of allToUnschedule) {
        setAnimatingTasksStatus((prev) => ({ ...prev, [t.id]: "success" }));
        await new Promise((r) => setTimeout(r, 200));
      }

      if (successors.length > 0) {
        showToast(
          `Task and ${successors.length} dependenc${successors.length > 1 ? "ies" : "y"} removed successfully`,
          "success",
        );
      } else {
        showToast("Task returned to bucket", "success");
      }

      setTimeout(() => {
        setPlan(newPlan);
        setBucketTasks(newBucketTasks);
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          allToUnschedule.forEach((t) => delete next[t.id]);
          return next;
        });
      }, 500);
    } catch (e) {
      showToast((e as Error).message, "error");
      for (const t of allToUnschedule) {
        setAnimatingTasksStatus((prev) => ({ ...prev, [t.id]: "error" }));
        await new Promise((r) => setTimeout(r, 100));
      }
      setTimeout(() => {
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          allToUnschedule.forEach((t) => delete next[t.id]);
          return next;
        });
      }, 500);
    }
  };

  const handlePlaceBlock = async (taskId: string, startTime: number) => {
    if (!plan) return;

    const prevDayPlans = [...plan.dayPlans];

    // 1. Optimistic Update
    setPlan((prev) => {
      if (!prev) return prev;
      const newPlans = prev.dayPlans.filter((p) => p.taskId !== taskId);
      newPlans.push({
        userId: "",
        taskId,
        planDate: plan.date,
        startTime,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });
      return { ...prev, dayPlans: newPlans };
    });

    setAnimatingTasksStatus((prev) => ({ ...prev, [taskId]: "loading" }));

    try {
      await placeDayPlanBlock(taskId, plan.date, startTime);
      // 2. Success Blink
      setAnimatingTasksStatus((prev) => ({ ...prev, [taskId]: "success" }));
      setTimeout(() => {
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }, 500);
    } catch (e) {
      // 3. Error Blink & Revert
      showToast("Failed to place block: " + (e as Error).message, "error");
      setAnimatingTasksStatus((prev) => ({ ...prev, [taskId]: "error" }));
      setTimeout(() => {
        setPlan((prev) => (prev ? { ...prev, dayPlans: prevDayPlans } : prev));
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }, 500);
    }
  };

  const handleUnplaceBlock = async (taskId: string) => {
    if (!plan) return;

    const prevDayPlans = [...plan.dayPlans];

    // 1. Optimistic Update
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        dayPlans: prev.dayPlans.filter((p) => p.taskId !== taskId),
      };
    });

    setAnimatingTasksStatus((prev) => ({ ...prev, [taskId]: "loading" }));

    try {
      await removeDayPlanBlock(taskId);
      // 2. Success Blink
      setAnimatingTasksStatus((prev) => ({ ...prev, [taskId]: "success" }));
      setTimeout(() => {
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }, 500);
    } catch (e) {
      showToast("Failed to remove block: " + (e as Error).message, "error");
      // 3. Error Blink & Revert
      setAnimatingTasksStatus((prev) => ({ ...prev, [taskId]: "error" }));
      setTimeout(() => {
        setPlan((prev) => (prev ? { ...prev, dayPlans: prevDayPlans } : prev));
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }, 500);
    }
  };

  const handleMarkDone = async (task: Task) => {
    const isCompleted = task.status === "done";
    const newStatus = isCompleted ? "pending" : "done";
    const previousTasks = [...(plan?.tasks || [])];

    // 1. Optimistic Update
    setPlan((prev) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === task.id ? { ...t, status: newStatus } : t,
            ),
          }
        : prev,
    );

    setAnimatingTasksStatus((prev) => ({ ...prev, [task.id]: "loading" }));

    try {
      const updated = await updateTask(task.id, { status: newStatus });
      setAnimatingTasksStatus((prev) => ({ ...prev, [task.id]: "success" }));

      setTimeout(() => {
        setPlan((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) => (t.id === task.id ? updated : t)),
              }
            : prev,
        );
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      }, 500);
    } catch (e) {
      showToast("Failed to update task: " + (e as Error).message, "error");
      setAnimatingTasksStatus((prev) => ({ ...prev, [task.id]: "error" }));

      setTimeout(() => {
        setPlan((prev) => (prev ? { ...prev, tasks: previousTasks } : prev));
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      }, 500);
    }
  };

  const handleQuickAdd = () => {
    if (projects.length === 0) {
      showToast("Create a project first", "error");
      return;
    }
    setShowQuickCapture(true);
  };

  if (initialLoading) return <LoadingScreen message="Loading today's plan…" />;
  if (error)
    return (
      <div className="p-4">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );
  if (!plan) return null;

  const isToday = selectedDate === todayUnixDay();

  const scheduledTasks = plan.tasks;
  const totalPlannedMin = scheduledTasks.reduce(
    (sum, t) => sum + (t.estimateMin || 30),
    0,
  );
  const totalScheduledCount = scheduledTasks.length;
  const completedCount = scheduledTasks.filter(
    (t) => t.status === "done",
  ).length;

  // Find tasks scheduled for today but NOT in dayPlans (Timeline)
  const placedTaskIds = new Set(plan.dayPlans.map((dp) => dp.taskId));

  // All tasks in the original plan for "Any Time Today"
  const anyTimeTasksOrig = scheduledTasks.filter(
    (t) => !placedTaskIds.has(t.id),
  );

  const bucketTasksByProject = bucketTasks.reduce(
    (acc, task) => {
      if (!acc[task.projectId]) acc[task.projectId] = [];
      acc[task.projectId].push(task);
      return acc;
    },
    {} as Record<string, Task[]>,
  );

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden bg-base">
      <ArcDial
        selectedDate={selectedDate}
        onChange={handleDateChange}
        totalPlannedMin={totalPlannedMin}
        completedCount={completedCount}
        totalTasksCount={totalScheduledCount}
      />

      <div className="relative flex flex-1 overflow-hidden bg-surface">
        {/* Skeleton loader sits underneath, revealed as old content slides out, if network is slow */}
        {isExiting && (
          <div className="absolute inset-0 z-0">
            <TodaySkeleton />
          </div>
        )}

        <div
          key={displayedDate}
          className={`flex flex-col flex-1 overflow-hidden relative w-full h-full bg-surface z-10 ${
            isExiting
              ? slideDirection === "left"
                ? "animate-slide-out-left"
                : "animate-slide-out-right"
              : `animate-slide-${slideDirection}`
          }`}
        >
          {/* Mobile Tabs */}
          <div className="md:hidden flex border-b border-border-default shrink-0">
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "anytime" ? "text-primary border-b-2 border-accent" : "text-secondary"}`}
              onClick={() => setActiveTab("anytime")}
            >
              {isToday ? "Any Time Today" : "Any Time"}
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "dayview" ? "text-primary border-b-2 border-accent" : "text-secondary"}`}
              onClick={() => setActiveTab("dayview")}
            >
              Day View
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Any Time Today Panel */}
            <div
              className={`${activeTab === "anytime" ? "flex" : "hidden"} md:flex flex-1 md:flex-none md:w-64 border-r border-border-default flex-col p-6 bg-surface md:shrink-0 overflow-y-auto`}
            >
              <h3 className="text-lg font-medium text-primary mb-6 tracking-wide">
                {isToday ? "Any Time Today" : "Any Time"}
              </h3>

              <div className="space-y-4 mb-8">
                {anyTimeTasksOrig.map((task) => {
                  const animState = animatingTasksStatus[task.id];
                  const project = projects.find((p) => p.id === task.projectId);
                  const isHabitOrRecurring =
                    project?.type === "habit" || project?.type === "recurring";
                  return (
                    <div
                      key={task.id}
                      className={`flex flex-col group relative p-2 -mx-2 hover:bg-surface-raised rounded transition-colors ${
                        animState === "success"
                          ? "bg-done-subtle text-done"
                          : animState === "error"
                            ? "bg-missed-subtle text-missed"
                            : animState === "loading"
                              ? "bg-accent-subtle/50 animate-pulse text-secondary"
                              : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <button
                          onClick={() => handleMarkDone(task)}
                          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            task.status === "done"
                              ? "border-done bg-done text-surface"
                              : "border-border-strong hover:border-done"
                          }`}
                        >
                          {task.status === "done" && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </button>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span
                            className={`text-sm font-medium leading-tight truncate ${animState === "loading" ? "text-secondary" : "text-primary"} ${task.status === "done" ? "text-secondary doodle-strikethrough" : ""}`}
                          >
                            {task.title}
                          </span>
                          <span
                            className={`text-xs mt-1 ${animState === "loading" ? "text-secondary" : "text-secondary"}`}
                          >
                            {task.estimateMin}m
                          </span>
                        </div>
                      </div>
                      {!isHabitOrRecurring && (
                        <button
                          onClick={() => unscheduleToBucket(task)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-tertiary hover:text-missed transition-colors"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}

                {anyTimeTasksOrig.length === 0 && (
                  <p className="text-sm text-tertiary italic">
                    No unplaced tasks
                  </p>
                )}
              </div>

              {isToday && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={handleQuickAdd}
                    className="w-14 h-14 rounded-full bg-accent-subtle text-accent flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Center Area: DayView or DayPlanner */}
            <div
              className={`${activeTab === "dayview" ? "flex" : "hidden"} md:flex flex-1 overflow-hidden bg-surface relative flex`}
            >
              <div className="flex-1 min-w-0">
                <DayView
                  tasks={scheduledTasks}
                  projects={projects}
                  dayPlans={plan.dayPlans}
                  onOpenPlanner={() => setIsPlannerOpen(true)}
                  onMarkDone={handleMarkDone}
                  animatingPlacements={animatingTasksStatus}
                />
              </div>

              {isPlannerOpen && (
                <DayPlanner
                  tasks={scheduledTasks}
                  projects={projects}
                  dayPlans={plan.dayPlans}
                  onPlaceBlock={handlePlaceBlock}
                  onUnplaceBlock={handleUnplaceBlock}
                  onClose={() => setIsPlannerOpen(false)}
                  onMarkDone={handleMarkDone}
                  animatingPlacements={animatingTasksStatus}
                />
              )}

              {dependencyModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-base/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                  <div className="bg-surface rounded-2xl shadow-xl border border-border-default max-w-md w-full overflow-hidden">
                    <div className="p-6">
                      <h3 className="text-lg font-medium text-primary mb-2">
                        Remove Dependencies?
                      </h3>
                      <p className="text-sm text-secondary mb-4">
                        Unscheduling{" "}
                        <strong>{dependencyModal.task.title}</strong> will also
                        return the following dependent tasks to the bucket:
                      </p>
                      <ul className="text-sm text-secondary mb-6 max-h-40 overflow-y-auto space-y-2">
                        {dependencyModal.successors.map((s) => (
                          <li key={s.id} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent/50"></span>
                            {s.title}
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setDependencyModal(null)}
                          className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={dependencyModal.onConfirm}
                          className="px-4 py-2 text-sm font-medium bg-missed/10 text-missed hover:bg-missed/20 rounded-lg transition-colors"
                        >
                          Remove All
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bucket Toggle Bar (When closed) */}
            {!isBucketOpen && selectedDate === todayUnixDay() && (
              <div
                className="w-12 border-l border-border-default bg-surface flex flex-col items-center justify-center cursor-pointer hover:bg-surface-raised transition-colors shrink-0"
                onClick={() => setIsBucketOpen(true)}
              >
                <span
                  className="text-secondary font-mono tracking-[0.3em] text-sm"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                  }}
                >
                  BUCKET
                </span>
              </div>
            )}

            {/* Bucket Drawer (When open) */}
            {isBucketOpen && selectedDate === todayUnixDay() && (
              <BucketDrawer
                bucketTasksByProject={bucketTasksByProject}
                projects={projects}
                onSchedule={scheduleFromBucket}
                onClose={() => setIsBucketOpen(false)}
                animatingTasksStatus={animatingTasksStatus}
              />
            )}
          </div>
        </div>
      </div>
      {showQuickCapture && (
        <QuickCapture
          projects={projects}
          tasks={[...(plan?.tasks || []), ...bucketTasks]}
          defaultScheduledDate={selectedDate}
          onCreated={(taskOrTasks) => {
            load();
            setShowQuickCapture(false);
          }}
          onClose={() => setShowQuickCapture(false)}
        />
      )}
    </div>
  );
}
