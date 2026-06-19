import React from "react";
import type { Task, DayPlan } from "@/lib/types";

interface DayViewProps {
  tasks: Task[];
  dayPlans: DayPlan[];
  onOpenPlanner: () => void;
  animatingPlacements?: Record<string, 'loading' | 'success' | 'error'>;
}

export function DayView({ tasks, dayPlans, onOpenPlanner, animatingPlacements = {} }: DayViewProps) {
  // Sort day plans chronologically
  const sortedPlans = [...dayPlans].sort((a, b) => a.startTime - b.startTime);

  const formatTime = (unix: number) => {
    const d = new Date(unix * 1000);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  };

  return (
    <div className="flex flex-col h-full bg-surface relative overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center border-b border-border-default bg-surface z-10 shrink-0">
        <h2 className="text-lg font-medium text-primary tracking-wide">Day View</h2>
        <button 
          onClick={onOpenPlanner}
          className="px-4 py-2 bg-accent-subtle text-accent rounded-lg text-sm font-medium hover:bg-surface-raised transition-colors border border-border-default"
        >
          Open Day Planner
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {sortedPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-tertiary">
            <p className="mb-4 text-sm">Your day is empty.</p>
            <button 
              onClick={onOpenPlanner}
              className="px-4 py-2 border border-border-default rounded-lg text-secondary hover:text-primary transition-colors"
            >
              Plan your day
            </button>
          </div>
        ) : (
          <div className="relative w-full pr-4 md:pr-12 lg:pr-24 pl-4 md:pl-8">
            {/* Continuous vertical timeline line */}
            <div className="absolute top-0 bottom-0 left-[16px] md:left-[32px] w-px bg-border-default z-0"></div>
            
            <div className="space-y-6 relative z-10 py-2">
              {sortedPlans.map((plan, index) => {
                const task = tasks.find(t => t.id === plan.taskId);
                if (!task) return null;

                const startStr = formatTime(plan.startTime);
                const endUnix = plan.startTime + (task.estimateMin * 60);
                const endStr = formatTime(endUnix);

                return (
                  <div key={plan.taskId} className="relative flex items-stretch group">
                    {/* Timeline Left Axis */}
                    <div className="w-20 md:w-32 shrink-0 flex flex-col justify-between py-2 -ml-[1px]">
                      {/* Top tick (Start Time) */}
                      <div className="flex items-center">
                        <div className="h-px w-4 md:w-6 bg-border-strong"></div>
                        <span className="text-[11px] text-tertiary font-medium pl-2 md:pl-3 whitespace-nowrap">{startStr}</span>
                      </div>
                      
                      {/* Minor ticks */}
                      <div className="flex flex-col justify-evenly flex-1 py-1">
                        <div className="h-px w-2 md:w-3 bg-border-default"></div>
                        <div className="h-px w-2 md:w-3 bg-border-default"></div>
                        <div className="h-px w-2 md:w-3 bg-border-default"></div>
                      </div>

                      {/* Bottom tick (End Time) */}
                      <div className="flex items-center">
                        <div className="h-px w-4 md:w-6 bg-border-strong"></div>
                        <span className="text-[11px] text-tertiary font-medium pl-2 md:pl-3 whitespace-nowrap">{endStr}</span>
                      </div>
                    </div>

                    {/* Task Card */}
                    <div className="flex-1 flex justify-between items-center ml-2">
                      {/* Left: Task Content */}
                      <div className={`flex-1 min-w-0 border rounded-xl p-4 md:p-6 shadow-sm transition-colors ${
                        animatingPlacements[plan.taskId] === 'success' ? 'bg-done-subtle border-done text-done' :
                        animatingPlacements[plan.taskId] === 'error' ? 'bg-missed-subtle border-missed text-missed' :
                        animatingPlacements[plan.taskId] === 'loading' ? 'bg-accent-subtle border-accent/50 animate-pulse text-secondary' :
                        'bg-surface-raised border-border-default hover:border-accent text-primary'
                      }`}>
                        <div className="flex flex-col gap-2">
                          <span className={`text-sm md:text-base font-medium truncate block ${animatingPlacements[plan.taskId] === 'loading' ? 'text-secondary' : 'text-inherit'}`}>
                            {task.title}
                          </span>
                          {task.projectId && (
                            <span className="text-[10px] uppercase tracking-wider text-tertiary">
                              {task.projectId}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle: Duration with arrows */}
                      <div className="flex flex-col items-center justify-center px-4 md:px-8">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-tertiary mb-1">
                          <path d="M5 0L10 6H0L5 0Z" fill="currentColor"/>
                        </svg>
                        <div className="h-4 w-px border-l border-dotted border-tertiary"></div>
                        <span className="text-xs font-mono text-secondary my-1">{formatDuration(task.estimateMin)}</span>
                        <div className="h-4 w-px border-l border-dotted border-tertiary"></div>
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-tertiary mt-1">
                          <path d="M5 6L0 0H10L5 6Z" fill="currentColor"/>
                        </svg>
                      </div>

                      {/* Right side: Time Range */}
                      <div className="flex-1 text-right">
                        <span className="text-xs text-secondary font-mono tracking-wide">{startStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
