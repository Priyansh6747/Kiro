"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import type { Task, Project, TodayPlannerData } from "@/lib/types";
import { todayUnixDay } from "@/lib/types";
import { getTodayPlan, listTasks, listProjects, updateTask, placeDayPlanBlock, createTask } from "@/lib/api-client";
import { LoadingScreen, ErrorBanner } from "@/components/ui";
import { Timeline } from "@/components/Timeline";
import { ArcDial } from "@/components/ArcDial";
import { BucketDrawer } from "@/components/BucketDrawer";

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

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number>(0);
  const [displayedDate, setDisplayedDate] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isExiting, setIsExiting] = useState(false);
  
  const [isBucketOpen, setIsBucketOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const handleDateChange = (newDate: number) => {
    if (newDate === selectedDate) return;
    if (newDate < selectedDate) setSlideDirection('right');
    else setSlideDirection('left');
    
    setIsExiting(true);
    setSelectedDate(newDate);
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
    try {
      const updated = await updateTask(task.id, {
        scheduled_date: selectedDate,
      });
      setBucketTasks((prev) => prev.filter((t) => t.id !== task.id));
      setPlan((prev) => prev ? { ...prev, tasks: [...prev.tasks, updated] } : prev);
      
      listTasks({ bucket: true }).then(setBucketTasks);
    } catch (e) {
      alert((e as Error).message);
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
          userId: "",
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

  const handleQuickAdd = async () => {
    if (projects.length === 0) return;
    setIsCreatingTask(true);
    try {
      // Find a suitable project, maybe the first one
      const targetProject = projects[0];
      const newTask = await createTask({
        project_id: targetProject.id,
        title: "New Task",
        estimate_min: 30,
        scheduled_date: selectedDate,
      });
      setPlan(prev => prev ? { ...prev, tasks: [...prev.tasks, newTask] } : prev);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setIsCreatingTask(false);
    }
  };

  if (initialLoading) return <LoadingScreen message="Loading today's plan…" />;
  if (error) return <div className="p-4"><ErrorBanner message={error} onRetry={load} /></div>;
  if (!plan) return null;

  const scheduledTasks = plan.tasks;
  
  // Find tasks scheduled for today but NOT in dayPlans (Timeline)
  const placedTaskIds = new Set(plan.dayPlans.map(dp => dp.taskId));
  const anyTimeTasks = scheduledTasks.filter(t => !placedTaskIds.has(t.id));

  const bucketTasksByProject = bucketTasks.reduce((acc, task) => {
    if (!acc[task.projectId]) acc[task.projectId] = [];
    acc[task.projectId].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden bg-base">
      <ArcDial selectedDate={selectedDate} onChange={handleDateChange} />
      
      <div 
        key={displayedDate} 
        className={`flex flex-1 overflow-hidden relative ${
          isExiting 
            ? (slideDirection === 'left' ? 'animate-slide-out-left' : 'animate-slide-out-right') 
            : `animate-slide-${slideDirection}`
        }`}
      >
        {/* Any Time Today Panel */}
        <div className="w-64 border-r border-border-default flex flex-col p-6 bg-surface shrink-0 overflow-y-auto">
          <h3 className="text-lg font-medium text-primary mb-6 tracking-wide">Any Time Today</h3>
          
          <div className="space-y-4 mb-8">
            {anyTimeTasks.map(task => (
              <div key={task.id} className="flex flex-col">
                <span className="text-sm font-medium text-primary leading-tight">{task.title}</span>
                <span className="text-xs text-secondary mt-1">{task.estimateMin}m</span>
              </div>
            ))}
            {anyTimeTasks.length === 0 && (
              <p className="text-sm text-tertiary italic">No unplaced tasks</p>
            )}
          </div>

          <div className="mt-4 flex justify-center">
            <button 
              onClick={handleQuickAdd}
              disabled={isCreatingTask}
              className="w-14 h-14 rounded-full bg-accent-subtle text-accent flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isCreatingTask ? (
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Timeline Center */}
        <div className="flex-1 overflow-y-auto bg-surface relative">
          <Timeline
            tasks={scheduledTasks}
            dayPlans={plan.dayPlans}
            onPlaceBlock={handlePlaceBlock}
          />
        </div>

        {/* Bucket Toggle Bar (When closed) */}
        {!isBucketOpen && (
          <div 
            className="w-12 border-l border-border-default bg-surface flex flex-col items-center justify-center cursor-pointer hover:bg-surface-raised transition-colors shrink-0"
            onClick={() => setIsBucketOpen(true)}
          >
            <span className="text-secondary font-mono tracking-[0.3em] text-sm" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              BUCKET
            </span>
          </div>
        )}

        {/* Bucket Drawer (When open) */}
        {isBucketOpen && (
          <BucketDrawer 
            bucketTasksByProject={bucketTasksByProject}
            projects={projects}
            onSchedule={scheduleFromBucket}
            onClose={() => setIsBucketOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
