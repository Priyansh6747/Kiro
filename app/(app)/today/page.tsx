"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { ArcDial } from "@/components/ArcDial";
import { BucketDrawer } from "@/components/BucketDrawer";
import { DayPlanner } from "@/components/DayPlanner";
import type { HabitPlan, RecurringPlan } from "@/components/DayPlanner";
import { DayView } from "@/components/DayView";
import { TodaySkeleton } from "@/components/skeletons";
import { ErrorBanner, QuickCapture } from "@/components/ui";
import { useToast } from "@/hooks/useToast";
import {
  createTask,
  getTodayPlan,
  listProjects,
  listTasks,
  placeDayPlanBlock,
  removeDayPlanBlock,
  placeHabitDayPlanBlock,
  removeHabitDayPlanBlock,
  placeRecurringDayPlanBlock,
  removeRecurringDayPlanBlock,
  updateTask,
  getHabitsDashboard,
  markHabitMarker,
  markRecurringMarker,
} from "@/lib/api-client";
import type { Project, Task, TodayPlannerData } from "@/lib/types";
import { todayUnixDay } from "@/lib/utils";

export default function TodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <TodayPageContent />
    </Suspense>
  );
}

function TodayPageContent() {
  const { showToast } = useToast();
  const [plan, setPlan] = useState<TodayPlannerData | null>(null);
  const [bucketTasks, setBucketTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [habitsData, setHabitsData] = useState<any>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number>(0);
  const [displayedDate, setDisplayedDate] = useState<number>(0);
  const [userTimezone, setUserTimezone] = useState("UTC");
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "left",
  );
  const [isExiting, setIsExiting] = useState(false);

  const [activeTab, setActiveTab] = useState<"anytime" | "dayview">("anytime");

  const [isBucketOpen, setIsBucketOpen] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);

  // Client-side placements for habits & recurring tasks (not persisted to DB)
  const [habitDayPlans, setHabitDayPlans] = useState<HabitPlan[]>([]);
  const [recurringDayPlans, setRecurringDayPlans] = useState<RecurringPlan[]>([]);

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
      const [planData, bucket, projs, habDash] = await Promise.all([
        getTodayPlan(selectedDate),
        listTasks({ bucket: true }),
        listProjects(),
        getHabitsDashboard(selectedDate, selectedDate).catch(() => null),
      ]);
      setPlan(planData);
      setHabitDayPlans(planData.habitDayPlans || []);
      setRecurringDayPlans(planData.recurringDayPlans || []);
      setBucketTasks(bucket);
      setProjects(projs);
      if (habDash) setHabitsData(habDash);
      setDisplayedDate(selectedDate);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setInitialLoading(false);
      setIsExiting(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    import("@/lib/api-client").then(({ getPreferences }) => {
      getPreferences()
        .then((prefs) => {
          setUserTimezone(prefs.timezone);
          const today = todayUnixDay(prefs.timezone);
          setSelectedDate(today);
          setDisplayedDate(today);
        })
        .catch(() => {
          const today = todayUnixDay();
          setSelectedDate(today);
          setDisplayedDate(today);
        });
    });
  }, []);

  useEffect(() => {
    if (selectedDate !== 0) {
      load();
    }
  }, [load, selectedDate]);

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

  const handleMarkHabit = async (habitId: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "pending" : "done";
    
    // Optimistic Update
    setHabitsData((prev: any) => {
      if (!prev) return prev;
      const next = { ...prev };
      next.markers = { ...prev.markers };
      next.markers[habitId] = { ...prev.markers[habitId], [selectedDate]: newStatus };
      return next;
    });
    setAnimatingTasksStatus((prev) => ({ ...prev, [habitId]: "loading" }));

    try {
      await markHabitMarker(habitId, selectedDate, newStatus);
      setAnimatingTasksStatus((prev) => ({ ...prev, [habitId]: "success" }));
      setTimeout(() => {
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          delete next[habitId];
          return next;
        });
      }, 500);
    } catch (e) {
      showToast("Failed to update habit: " + (e as Error).message, "error");
      setAnimatingTasksStatus((prev) => ({ ...prev, [habitId]: "error" }));
      // Revert
      setHabitsData((prev: any) => {
        if (!prev) return prev;
        const next = { ...prev };
        next.markers = { ...prev.markers };
        next.markers[habitId] = { ...prev.markers[habitId], [selectedDate]: currentStatus };
        return next;
      });
      setTimeout(() => {
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          delete next[habitId];
          return next;
        });
      }, 500);
    }
  };

  const handleMarkRecurring = async (rtId: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "pending" : "done";
    
    // Optimistic Update
    setHabitsData((prev: any) => {
      if (!prev) return prev;
      const next = { ...prev };
      next.recurringMarkers = { ...prev.recurringMarkers };
      next.recurringMarkers[rtId] = { ...prev.recurringMarkers[rtId], [selectedDate]: newStatus };
      return next;
    });
    setAnimatingTasksStatus((prev) => ({ ...prev, [rtId]: "loading" }));

    try {
      await markRecurringMarker(rtId, selectedDate, newStatus);
      setAnimatingTasksStatus((prev) => ({ ...prev, [rtId]: "success" }));
      setTimeout(() => {
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          delete next[rtId];
          return next;
        });
      }, 500);
    } catch (e) {
      showToast("Failed to update routine: " + (e as Error).message, "error");
      setAnimatingTasksStatus((prev) => ({ ...prev, [rtId]: "error" }));
      // Revert
      setHabitsData((prev: any) => {
        if (!prev) return prev;
        const next = { ...prev };
        next.recurringMarkers = { ...prev.recurringMarkers };
        next.recurringMarkers[rtId] = { ...prev.recurringMarkers[rtId], [selectedDate]: currentStatus };
        return next;
      });
      setTimeout(() => {
        setAnimatingTasksStatus((prev) => {
          const next = { ...prev };
          delete next[rtId];
          return next;
        });
      }, 500);
    }
  };

  // ── Habit / Recurring planner handlers ──────────────────────────────────────
  const handlePlaceHabit = (habitId: string, startTime: number) => {
    setHabitDayPlans((prev) => [
      ...prev.filter((p) => p.habitId !== habitId),
      { habitId, startTime },
    ]);
    placeHabitDayPlanBlock(habitId, selectedDate, startTime).catch((e) => showToast(e.message, "error"));
  };

  const handleUnplaceHabit = (habitId: string) => {
    setHabitDayPlans((prev) => prev.filter((p) => p.habitId !== habitId));
    removeHabitDayPlanBlock(habitId, selectedDate).catch((e) => showToast(e.message, "error"));
  };

  const handlePlaceRecurring = (recurringTaskId: string, startTime: number) => {
    setRecurringDayPlans((prev) => [
      ...prev.filter((p) => p.recurringTaskId !== recurringTaskId),
      { recurringTaskId, startTime },
    ]);
    placeRecurringDayPlanBlock(recurringTaskId, selectedDate, startTime).catch((e) => showToast(e.message, "error"));
  };

  const handleUnplaceRecurring = (recurringTaskId: string) => {
    setRecurringDayPlans((prev) =>
      prev.filter((p) => p.recurringTaskId !== recurringTaskId),
    );
    removeRecurringDayPlanBlock(recurringTaskId, selectedDate).catch((e) => showToast(e.message, "error"));
  };

  const handleQuickAdd = () => {
    if (projects.length === 0) {
      showToast("Create a project first", "error");
      return;
    }
    setShowQuickCapture(true);
  };

  if (initialLoading) return <TodaySkeleton />;
  if (error)
    return (
      <div className="p-4">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );
  if (!plan) return null;

  const isToday = selectedDate === todayUnixDay(userTimezone);

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
  const placedHabitIds = new Set(habitDayPlans.map((dp) => dp.habitId));
  const placedRecurringIds = new Set(recurringDayPlans.map((dp) => dp.recurringTaskId));

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
                          <div className="relative flex max-w-full self-start min-w-0">
                            <span
                              style={task.status === "done" ? { color: "rgba(0,0,0,0.5)" } : undefined}
                              className={`text-sm font-medium leading-tight truncate ${
                                animState === "loading"
                                  ? "text-secondary"
                                  : task.status === "done"
                                    ? ""
                                    : "text-primary"
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.status === "done" && (
                              <div className="doodle-strikethrough block absolute left-0 right-0 top-0 bottom-0 pointer-events-none" />
                            )}
                          </div>
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

                {/* Habits */}
                {habitsData?.habits?.map((habit: any) => {
                  if (placedHabitIds.has(habit.id)) return null;
                  const status = habitsData.markers[habit.id]?.[selectedDate];
                  if (!status) return null;
                  
                  const animState = animatingTasksStatus[habit.id];
                  return (
                    <div
                      key={`habit-${habit.id}`}
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
                          onClick={() => handleMarkHabit(habit.id, status)}
                          className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            status === "done"
                              ? "border-done bg-done text-surface"
                              : "border-border-strong hover:border-done"
                          }`}
                        >
                          {status === "done" && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          )}
                        </button>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="relative flex max-w-full self-start min-w-0">
                            <span style={status === "done" ? { color: "rgba(0,0,0,0.5)" } : undefined} className={`text-sm font-medium leading-tight truncate ${animState === "loading" ? "text-secondary" : status === "done" ? "" : "text-primary"}`}>
                              {habit.name}
                            </span>
                            {status === "done" && <div className="doodle-strikethrough block absolute left-0 right-0 top-0 bottom-0 pointer-events-none" />}
                          </div>
                          <span className={`text-xs mt-1 ${animState === "loading" ? "text-secondary" : "text-secondary"}`}>
                            {habit.estimateMin}m (Habit)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Recurring Tasks */}
                {habitsData?.recurringTasks?.map((rt: any) => {
                  if (placedRecurringIds.has(rt.id)) return null;
                  const status = habitsData.recurringMarkers[rt.id]?.[selectedDate];
                  if (!status) return null;
                  
                  const animState = animatingTasksStatus[rt.id];
                  return (
                    <div
                      key={`recurring-${rt.id}`}
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
                          onClick={() => handleMarkRecurring(rt.id, status)}
                          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            status === "done"
                              ? "border-done bg-done text-surface"
                              : "border-border-strong hover:border-done"
                          }`}
                        >
                          {status === "done" && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          )}
                        </button>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="relative flex max-w-full self-start min-w-0">
                            <span style={status === "done" ? { color: "rgba(0,0,0,0.5)" } : undefined} className={`text-sm font-medium leading-tight truncate ${animState === "loading" ? "text-secondary" : status === "done" ? "" : "text-primary"}`}>
                              {rt.title}
                            </span>
                            {status === "done" && <div className="doodle-strikethrough block absolute left-0 right-0 top-0 bottom-0 pointer-events-none" />}
                          </div>
                          <span className={`text-xs mt-1 ${animState === "loading" ? "text-secondary" : "text-secondary"}`}>
                            {rt.estimateMin}m (Routine)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {anyTimeTasksOrig.length === 0 && (!habitsData || (habitsData.habits.length === 0 && habitsData.recurringTasks.length === 0)) && (
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
                  habits={(habitsData?.habits ?? []).filter((h: any) => habitsData?.markers?.[h.id]?.[selectedDate])}
                  habitDayPlans={habitDayPlans}
                  recurringTasks={(habitsData?.recurringTasks ?? []).filter((rt: any) => habitsData?.recurringMarkers?.[rt.id]?.[selectedDate])}
                  recurringDayPlans={recurringDayPlans}
                  onOpenPlanner={() => setIsPlannerOpen(true)}
                  onMarkDone={handleMarkDone}
                  onMarkHabit={handleMarkHabit}
                  onMarkRecurring={handleMarkRecurring}
                  habitsData={habitsData}
                  selectedDate={selectedDate}
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
                  habits={(
                    habitsData?.habits ?? []
                  ).filter((h: any) => habitsData?.markers?.[h.id]?.[selectedDate])}
                  habitDayPlans={habitDayPlans}
                  onPlaceHabit={handlePlaceHabit}
                  onUnplaceHabit={handleUnplaceHabit}
                  recurringTasks={(
                    habitsData?.recurringTasks ?? []
                  ).filter((r: any) => habitsData?.recurringMarkers?.[r.id]?.[selectedDate])}
                  recurringDayPlans={recurringDayPlans}
                  onPlaceRecurring={handlePlaceRecurring}
                  onUnplaceRecurring={handleUnplaceRecurring}
                  onClose={() => setIsPlannerOpen(false)}
                  onMarkDone={handleMarkDone}
                  onMarkHabit={handleMarkHabit}
                  onMarkRecurring={handleMarkRecurring}
                  habitsData={habitsData}
                  selectedDate={selectedDate}
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
            {!isBucketOpen && selectedDate === todayUnixDay(userTimezone) && (
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
            {isBucketOpen && selectedDate === todayUnixDay(userTimezone) && (
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
