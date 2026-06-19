"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import type { Task, Project, TodayPlannerData } from "@/lib/types";
import { todayUnixDay } from "@/lib/types";
import { getTodayPlan, listTasks, listProjects, updateTask, placeDayPlanBlock, createTask } from "@/lib/api-client";
import { LoadingScreen, ErrorBanner } from "@/components/ui";
import { DayPlanner } from "@/components/DayPlanner";
import { DayView } from "@/components/DayView";
import { ArcDial } from "@/components/ArcDial";
import { BucketDrawer } from "@/components/BucketDrawer";
import { TodaySkeleton } from "@/components/TodaySkeleton";

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
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  
  const [swipingOutTaskIds, setSwipingOutTaskIds] = useState<Set<string>>(new Set());
  const [animatingTasks, setAnimatingTasks] = useState<{task: Task, state: 'adding' | 'success' | 'error' | 'returning' | 'removing'}[]>([]);

  const handleDateChange = (newDate: number) => {
    if (newDate === selectedDate) return;
    if (newDate < selectedDate) setSlideDirection('right');
    else setSlideDirection('left');
    
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
    // 1. Animate out of bucket (swipe left)
    setSwipingOutTaskIds(prev => new Set(prev).add(task.id));
    
    // Wait for bucket exit animation
    await new Promise(r => setTimeout(r, 200));

    setSwipingOutTaskIds(prev => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });
    setBucketTasks((prev) => prev.filter((t) => t.id !== task.id));
    
    // 2. Animate into Any Time Today (swipe right)
    setAnimatingTasks(prev => [...prev, { task, state: 'adding' }]);

    try {
      const updated = await updateTask(task.id, {
        scheduled_date: selectedDate,
      });
      // 3. API success -> blink green
      setAnimatingTasks(prev => prev.map(at => at.task.id === task.id ? { ...at, state: 'success' } : at));
      
      setTimeout(() => {
        setPlan((prev) => prev ? { ...prev, tasks: [...prev.tasks, updated] } : prev);
        setAnimatingTasks(prev => prev.filter(at => at.task.id !== task.id));
      }, 500);
      
      listTasks({ bucket: true }).then(setBucketTasks);
    } catch (e) {
      // 4. API error -> blink red
      setAnimatingTasks(prev => prev.map(at => at.task.id === task.id ? { ...at, state: 'error' } : at));
      
      setTimeout(() => {
        // Animate out of Any Time Today (swipe out right)
        setAnimatingTasks(prev => prev.map(at => at.task.id === task.id ? { ...at, state: 'returning' } : at));
        setTimeout(() => {
          setBucketTasks((prev) => [...prev, task]);
          setAnimatingTasks(prev => prev.filter(at => at.task.id !== task.id));
        }, 200);
      }, 500);
    }
  };

  const unscheduleToBucket = async (task: Task) => {
    // 1. Set to removing state (pulse neutral)
    setAnimatingTasks(prev => [...prev, { task, state: 'removing' }]);

    try {
      await updateTask(task.id, { scheduled_date: null });
      
      // Re-fetch to see if DAG removed other tasks too
      const [newPlan, newBucketTasks] = await Promise.all([
        getTodayPlan(selectedDate),
        listTasks({ bucket: true }),
      ]);
      
      const oldPlanTaskIds = new Set(plan?.tasks.map(t => t.id) || []);
      const newPlanTaskIds = new Set(newPlan.tasks.map(t => t.id));
      const removedTasks = plan?.tasks.filter(t => oldPlanTaskIds.has(t.id) && !newPlanTaskIds.has(t.id)) || [];
      if (!removedTasks.find(t => t.id === task.id)) {
        removedTasks.push(task);
      }

      setAnimatingTasks(prev => prev.filter(at => at.task.id !== task.id));
      
      // 2. Blink green for all removed tasks (success)
      const newAnimating = removedTasks.map(t => ({ task: t, state: 'success' as const }));
      setAnimatingTasks(prev => [...prev, ...newAnimating]);
      
      setTimeout(() => {
        // 3. Swipe them all out (returning)
        setAnimatingTasks(prev => prev.map(at => removedTasks.find(rt => rt.id === at.task.id) ? { ...at, state: 'returning' } : at));
        
        setTimeout(() => {
          setPlan(newPlan);
          setBucketTasks(newBucketTasks);
          setAnimatingTasks(prev => prev.filter(at => !removedTasks.find(rt => rt.id === at.task.id)));
        }, 200);
      }, 500);

    } catch (e) {
      // 4. API error -> blink red, back to normal
      setAnimatingTasks(prev => prev.map(at => at.task.id === task.id ? { ...at, state: 'error' } : at));
      setTimeout(() => {
        setAnimatingTasks(prev => prev.filter(at => at.task.id !== task.id));
      }, 500);
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
  const totalPlannedMin = scheduledTasks.reduce((sum, t) => sum + (t.estimateMin || 30), 0);

  // Find tasks scheduled for today but NOT in dayPlans (Timeline)
  const placedTaskIds = new Set(plan.dayPlans.map(dp => dp.taskId));
  
  // All tasks in the original plan for "Any Time Today"
  const anyTimeTasksOrig = scheduledTasks.filter(t => !placedTaskIds.has(t.id));
  
  // Tasks currently animating that came FROM the bucket (not in the original plan yet)
  const bucketAnimatingTasks = animatingTasks.filter(at => !anyTimeTasksOrig.find(t => t.id === at.task.id));

  const bucketTasksByProject = bucketTasks.reduce((acc, task) => {
    if (!acc[task.projectId]) acc[task.projectId] = [];
    acc[task.projectId].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden bg-base">
      <ArcDial selectedDate={selectedDate} onChange={handleDateChange} totalPlannedMin={totalPlannedMin} />
      
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
              ? (slideDirection === 'left' ? 'animate-slide-out-left' : 'animate-slide-out-right') 
              : `animate-slide-${slideDirection}`
          }`}
        >
          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Any Time Today Panel */}
            <div className="w-64 border-r border-border-default flex flex-col p-6 bg-surface shrink-0 overflow-y-auto">
          <h3 className="text-lg font-medium text-primary mb-6 tracking-wide">Any Time Today</h3>
          
          <div className="space-y-4 mb-8">
            {anyTimeTasksOrig.map(task => {
              const animatingState = animatingTasks.find(at => at.task.id === task.id)?.state;
              
              if (animatingState) {
                return (
                  <div 
                    key={`anim-${task.id}`} 
                    className={`flex flex-col -mx-2 px-2 py-1 rounded transition-colors duration-300 ${
                      animatingState === 'adding' ? 'animate-slide-left bg-surface-raised' :
                      animatingState === 'returning' ? 'animate-slide-out-right bg-surface-raised' :
                      animatingState === 'success' ? 'bg-done-subtle' :
                      animatingState === 'error' ? 'bg-missed-subtle' : ''
                    }`}
                  >
                    <span className={`text-sm font-medium leading-tight ${animatingState === 'adding' || animatingState === 'removing' || animatingState === 'returning' ? 'animate-pulse text-secondary' : 'text-primary'}`}>{task.title}</span>
                    <span className="text-xs text-secondary mt-1">{task.estimateMin}m</span>
                  </div>
                );
              }

              return (
                <div key={task.id} className="flex flex-col group relative p-2 -mx-2 hover:bg-surface-raised rounded transition-colors">
                  <span className="text-sm font-medium text-primary leading-tight">{task.title}</span>
                  <span className="text-xs text-secondary mt-1">{task.estimateMin}m</span>
                  <button 
                    onClick={() => unscheduleToBucket(task)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-tertiary hover:text-missed transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              );
            })}
            
            {bucketAnimatingTasks.map(({ task, state }) => (
              <div 
                key={`anim-${task.id}`} 
                className={`flex flex-col -mx-2 px-2 py-1 rounded transition-colors duration-300 ${
                  state === 'adding' ? 'animate-slide-left bg-surface-raised' :
                  state === 'returning' ? 'animate-slide-out-right bg-surface-raised' :
                  state === 'success' ? 'bg-done-subtle' :
                  state === 'error' ? 'bg-missed-subtle' : ''
                }`}
              >
                <span className={`text-sm font-medium leading-tight ${state === 'adding' || state === 'removing' || state === 'returning' ? 'animate-pulse text-secondary' : 'text-primary'}`}>{task.title}</span>
                <span className="text-xs text-secondary mt-1">{task.estimateMin}m</span>
              </div>
            ))}

            {anyTimeTasksOrig.length === 0 && bucketAnimatingTasks.length === 0 && (
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

        {/* Center Area: DayView or DayPlanner */}
        <div className="flex-1 overflow-hidden bg-surface relative flex">
          <div className="flex-1 min-w-0">
            <DayView 
              tasks={scheduledTasks} 
              dayPlans={plan.dayPlans} 
              onOpenPlanner={() => setIsPlannerOpen(true)} 
            />
          </div>
          
          {isPlannerOpen && (
            <DayPlanner
              tasks={scheduledTasks}
              dayPlans={plan.dayPlans}
              onPlaceBlock={handlePlaceBlock}
              onClose={() => setIsPlannerOpen(false)}
            />
          )}
        </div>

        {/* Bucket Toggle Bar (When closed) */}
        {!isBucketOpen && selectedDate === todayUnixDay() && (
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
        {isBucketOpen && selectedDate === todayUnixDay() && (
          <BucketDrawer 
            bucketTasksByProject={bucketTasksByProject}
            projects={projects}
            onSchedule={scheduleFromBucket}
            onClose={() => setIsBucketOpen(false)}
            swipingOutTaskIds={swipingOutTaskIds}
          />
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
