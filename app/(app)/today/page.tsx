"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import type { Task, Project, TodayPlannerData } from "@/lib/types";
import { todayUnixDay } from "@/lib/types";
import { getTodayPlan, listTasks, listProjects, updateTask, placeDayPlanBlock, removeDayPlanBlock, createTask } from "@/lib/api-client";
import { LoadingScreen, ErrorBanner } from "@/components/ui";
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
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isExiting, setIsExiting] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'anytime' | 'dayview'>('anytime');
  
  const [isBucketOpen, setIsBucketOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  
  const [animatingTasksStatus, setAnimatingTasksStatus] = useState<Record<string, 'loading' | 'success' | 'error'>>({});

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
    // 1. Optimistic move to "Any Time Today"
    setBucketTasks(prev => prev.filter(t => t.id !== task.id));
    setPlan(prev => prev ? { ...prev, tasks: [...prev.tasks, task] } : prev);
    
    // 2. Pulse loading state
    setAnimatingTasksStatus(prev => ({ ...prev, [task.id]: 'loading' }));

    try {
      const updated = await updateTask(task.id, {
        scheduled_date: selectedDate,
      });
      // 3. API success -> blink green
      setAnimatingTasksStatus(prev => ({ ...prev, [task.id]: 'success' }));
      
      setTimeout(() => {
        setPlan(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === task.id ? updated : t) } : prev);
        setAnimatingTasksStatus(prev => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      }, 500);
      
      listTasks({ bucket: true }).then(setBucketTasks);
    } catch (e) {
      showToast((e as Error).message, 'error');
      // 4. API error -> blink red, then revert
      setAnimatingTasksStatus(prev => ({ ...prev, [task.id]: 'error' }));
      
      setTimeout(() => {
        setPlan(prev => prev ? { ...prev, tasks: prev.tasks.filter(t => t.id !== task.id) } : prev);
        setBucketTasks(prev => [...prev, task]);
        setAnimatingTasksStatus(prev => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      }, 500);
    }
  };

  const unscheduleToBucket = async (task: Task) => {
    // 1. Optimistic remove to bucket
    setPlan(prev => prev ? { ...prev, tasks: prev.tasks.filter(t => t.id !== task.id) } : prev);
    setBucketTasks(prev => [...prev, task]);

    // 2. Pulse loading state
    setAnimatingTasksStatus(prev => ({ ...prev, [task.id]: 'loading' }));

    try {
      await updateTask(task.id, { scheduled_date: null });
      
      // Re-fetch in case DAG removed other things
      const [newPlan, newBucketTasks] = await Promise.all([
        getTodayPlan(selectedDate),
        listTasks({ bucket: true }),
      ]);
      
      setAnimatingTasksStatus(prev => ({ ...prev, [task.id]: 'success' }));
      
      setTimeout(() => {
        setPlan(newPlan);
        setBucketTasks(newBucketTasks);
        setAnimatingTasksStatus(prev => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      }, 500);

    } catch (e) {
      showToast((e as Error).message, 'error');
      // 4. API error -> blink red, revert
      setAnimatingTasksStatus(prev => ({ ...prev, [task.id]: 'error' }));
      setTimeout(() => {
        setPlan(prev => prev ? { ...prev, tasks: [...prev.tasks, task] } : prev);
        setBucketTasks(prev => prev.filter(t => t.id !== task.id));
        setAnimatingTasksStatus(prev => {
          const next = { ...prev };
          delete next[task.id];
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
    
    setAnimatingTasksStatus(prev => ({ ...prev, [taskId]: 'loading' }));

    try {
      await placeDayPlanBlock(taskId, plan.date, startTime);
      // 2. Success Blink
      setAnimatingTasksStatus(prev => ({ ...prev, [taskId]: 'success' }));
      setTimeout(() => {
        setAnimatingTasksStatus(prev => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }, 500);
    } catch (e) {
      // 3. Error Blink & Revert
      showToast("Failed to place block: " + (e as Error).message, 'error');
      setAnimatingTasksStatus(prev => ({ ...prev, [taskId]: 'error' }));
      setTimeout(() => {
        setPlan(prev => prev ? { ...prev, dayPlans: prevDayPlans } : prev);
        setAnimatingTasksStatus(prev => {
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
    
    setAnimatingTasksStatus(prev => ({ ...prev, [taskId]: 'loading' }));

    try {
      await removeDayPlanBlock(taskId);
      // 2. Success Blink
      setAnimatingTasksStatus(prev => ({ ...prev, [taskId]: 'success' }));
      setTimeout(() => {
        setAnimatingTasksStatus(prev => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }, 500);
    } catch (e) {
      // 3. Error Blink & Revert
      showToast("Failed to remove block: " + (e as Error).message, 'error');
      setAnimatingTasksStatus(prev => ({ ...prev, [taskId]: 'error' }));
      setTimeout(() => {
        setPlan(prev => prev ? { ...prev, dayPlans: prevDayPlans } : prev);
        setAnimatingTasksStatus(prev => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }, 500);
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
      showToast((e as Error).message, 'error');
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
          {/* Mobile Tabs */}
          <div className="md:hidden flex border-b border-border-default shrink-0">
            <button 
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'anytime' ? 'text-primary border-b-2 border-accent' : 'text-secondary'}`}
              onClick={() => setActiveTab('anytime')}
            >
              Any Time Today
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'dayview' ? 'text-primary border-b-2 border-accent' : 'text-secondary'}`}
              onClick={() => setActiveTab('dayview')}
            >
              Day View
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Any Time Today Panel */}
            <div className={`${activeTab === 'anytime' ? 'flex' : 'hidden'} md:flex flex-1 md:flex-none md:w-64 border-r border-border-default flex-col p-6 bg-surface md:shrink-0 overflow-y-auto`}>
          <h3 className="text-lg font-medium text-primary mb-6 tracking-wide">Any Time Today</h3>
          
          <div className="space-y-4 mb-8">
            {anyTimeTasksOrig.map(task => {
              const animState = animatingTasksStatus[task.id];
              return (
                <div 
                  key={task.id} 
                  className={`flex flex-col group relative p-2 -mx-2 hover:bg-surface-raised rounded transition-colors ${
                    animState === 'success' ? 'bg-done-subtle text-done' :
                    animState === 'error' ? 'bg-missed-subtle text-missed' :
                    animState === 'loading' ? 'bg-accent-subtle/50 animate-pulse text-secondary' : ''
                  }`}
                >
                  <span className={`text-sm font-medium leading-tight ${animState === 'loading' ? 'text-secondary' : 'text-primary'}`}>
                    {task.title}
                  </span>
                  <span className={`text-xs mt-1 ${animState === 'loading' ? 'text-secondary' : 'text-secondary'}`}>
                    {task.estimateMin}m
                  </span>
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
            
            {anyTimeTasksOrig.length === 0 && (
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
        <div className={`${activeTab === 'dayview' ? 'flex' : 'hidden'} md:flex flex-1 overflow-hidden bg-surface relative flex`}>
          <div className="flex-1 min-w-0">
            <DayView 
              tasks={scheduledTasks} 
              projects={projects}
              dayPlans={plan.dayPlans} 
              onOpenPlanner={() => setIsPlannerOpen(true)} 
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
              animatingPlacements={animatingTasksStatus}
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
            animatingTasksStatus={animatingTasksStatus}
          />
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
