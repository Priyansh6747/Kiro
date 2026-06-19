import React, { useState, useRef } from "react";
import type { Task, DayPlan, Project } from "@/lib/types";

interface TimelineProps {
  tasks: Task[];
  projects: Project[];
  dayPlans: DayPlan[];
  onPlaceBlock: (taskId: string, startTime: number) => Promise<void>;
  onUnplaceBlock: (taskId: string) => Promise<void>;
  onClose: () => void;
  animatingPlacements?: Record<string, 'loading' | 'success' | 'error'>;
}

export function DayPlanner({ tasks, projects, dayPlans, onPlaceBlock, onUnplaceBlock, onClose, animatingPlacements = {} }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [previewTop, setPreviewTop] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const HOUR_HEIGHT = 60;

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggingTask(task);
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current || !draggingTask) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = (y / HOUR_HEIGHT) * 60;
    const snappedMinutes = Math.round(minutes / 15) * 15;
    setPreviewTop((snappedMinutes / 60) * HOUR_HEIGHT);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === taskId);
    if (!task || previewTop === null) {
      setDraggingTask(null);
      setPreviewTop(null);
      return;
    }
    await commitPlacement(task, previewTop);
  };

  // Mobile Touch Handlers
  const handleTouchStart = (e: React.TouchEvent, task: Task) => {
    setDraggingTask(task);
    // don't set previewTop yet to avoid jumping
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || !draggingTask) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    let y = touch.clientY - rect.top;
    
    // Clamp y
    y = Math.max(0, Math.min(y, hours.length * HOUR_HEIGHT));
    
    const minutes = (y / HOUR_HEIGHT) * 60;
    const snappedMinutes = Math.round(minutes / 15) * 15;
    setPreviewTop((snappedMinutes / 60) * HOUR_HEIGHT);
  };

  const handleTouchEnd = async () => {
    if (draggingTask && previewTop !== null) {
      await commitPlacement(draggingTask, previewTop);
    } else {
      setDraggingTask(null);
      setPreviewTop(null);
    }
  };

  const commitPlacement = async (task: Task, topOffset: number) => {
    const startMinutes = (topOffset / HOUR_HEIGHT) * 60;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const midnightSec = Math.floor(d.getTime() / 1000);
    const startTime = midnightSec + startMinutes * 60;
    
    const newEnd = startTime + task.estimateMin * 60;

    const hasOverlap = dayPlans.some((plan) => {
      if (plan.taskId === task.id) return false;
      const planTask = tasks.find(t => t.id === plan.taskId);
      if (!planTask) return false;
      const blockEnd = plan.startTime + planTask.estimateMin * 60;
      return startTime < blockEnd && newEnd > plan.startTime;
    });

    if (hasOverlap) {
      setError("Cannot place block: overlaps with existing task.");
      setTimeout(() => setError(null), 3000);
    } else {
      await onPlaceBlock(task.id, startTime);
    }

    setDraggingTask(null);
    setPreviewTop(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="flex flex-col h-full w-full max-w-6xl bg-surface rounded-2xl md:rounded-3xl border border-border-default shadow-2xl relative overflow-hidden">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-missed-subtle border border-missed text-missed px-4 py-2 text-sm rounded-lg shadow-lg animate-in slide-in-from-top-4">
            {error}
          </div>
        )}
        
        <div className="px-4 md:px-6 py-3 md:py-4 bg-surface-raised border-b border-border-default shrink-0 flex justify-between items-center z-10">
          <h2 className="text-base md:text-lg font-medium text-primary tracking-wide">Drag & Drop Day Planner</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-tertiary hover:text-primary hover:bg-surface rounded-lg transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Unplaced Tasks Sidebar (Top row on mobile, left sidebar on desktop) */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border-default flex flex-col p-4 md:p-6 bg-surface-raised shrink-0">
            <div className="flex items-baseline justify-between mb-2 md:mb-4">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Unplaced Tasks</p>
              <span className="text-xs text-tertiary md:hidden">Drag to schedule</span>
            </div>
            
            <div className="flex overflow-x-auto md:flex-col md:overflow-y-auto gap-3 md:gap-4 flex-1 pb-2 md:pb-0 scrollbar-hide">
              {tasks
                .filter((t) => !dayPlans.some((p) => p.taskId === t.id))
                .map((task) => {
                  const animState = animatingPlacements[task.id];
                  return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onTouchStart={(e) => handleTouchStart(e, task)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`shrink-0 w-48 md:w-auto border p-3 md:p-4 rounded-xl md:rounded-2xl cursor-move hover:shadow-md transition-all group touch-none ${
                      animState === 'success' ? 'bg-done-subtle border-done text-done' :
                      animState === 'error' ? 'bg-missed-subtle border-missed text-missed' :
                      animState === 'loading' ? 'bg-surface-raised border-border-default animate-pulse text-secondary' :
                      'bg-surface border-border-default hover:border-accent text-primary'
                    }`}
                  >
                    <div className={`font-medium text-[11px] md:text-sm line-clamp-2 ${animState === 'loading' ? 'text-secondary' : 'text-inherit'}`}>{task.title}</div>
                    {task.projectId && (
                      <div className="text-[9px] uppercase tracking-wider opacity-60 truncate mt-1">
                        {projects.find(p => p.id === task.projectId)?.name || "PROJECT"}
                      </div>
                    )}
                    <div className={`text-[10px] md:text-xs mt-1 md:mt-2 font-mono ${
                      animState === 'success' ? 'text-done' :
                      animState === 'error' ? 'text-missed' :
                      'text-secondary'
                    }`}>{task.estimateMin}m</div>
                  </div>
                )})}
            </div>
          </div>

          {/* Timeline Area */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto relative bg-surface"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="relative min-h-full" style={{ height: Math.max(1200, hours.length * HOUR_HEIGHT) }}>
              {/* Grid lines */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full border-b border-border-subtle flex items-start"
                  style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                >
                  <span className="text-[10px] md:text-[11px] text-tertiary font-medium w-12 md:w-16 text-right pr-2 md:pr-4 pt-1 font-mono select-none">
                    {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                  </span>
                </div>
              ))}

              {/* Placed Blocks */}
              {dayPlans.map((plan) => {
                const task = tasks.find((t) => t.id === plan.taskId);
                if (!task) return null;

                const d = new Date(plan.startTime * 1000);
                const startMinutes = d.getHours() * 60 + d.getMinutes();
                const top = (startMinutes / 60) * HOUR_HEIGHT;
                const height = (task.estimateMin / 60) * HOUR_HEIGHT;
                
                const animState = animatingPlacements[plan.taskId];

                return (
                  <div
                    key={plan.taskId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onTouchStart={(e) => handleTouchStart(e, task)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`absolute left-14 md:left-20 right-2 md:right-8 border rounded-xl shadow-sm px-2 md:px-4 py-1 md:py-2 overflow-hidden cursor-move hover:shadow-md transition-all group backdrop-blur-md touch-none ${
                      animState === 'success' ? 'bg-done-subtle border-done text-done' :
                      animState === 'error' ? 'bg-missed-subtle border-missed text-missed' :
                      animState === 'loading' ? 'bg-accent-subtle border-accent/50 animate-pulse' :
                      'bg-accent-subtle border-accent/30 hover:border-accent text-primary'
                    }`}
                    style={{ top, height }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col flex-1 min-w-0 pr-2">
                        <span className={`text-xs md:text-sm font-medium truncate leading-tight select-none ${animState === 'loading' ? 'text-secondary' : 'text-inherit'}`}>
                          {task.title}
                        </span>
                        {task.projectId && (
                          <span className="text-[9px] uppercase tracking-wider opacity-60 truncate">
                            {projects.find(p => p.id === task.projectId)?.name || "PROJECT"}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnplaceBlock(task.id);
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 p-1 -m-1 text-tertiary hover:text-missed transition-colors rounded-full hover:bg-surface"
                        title="Unschedule from timeline"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                    <div className={`text-[10px] md:text-xs mt-0.5 md:mt-1 font-mono select-none ${
                      animState === 'success' ? 'text-done' :
                      animState === 'error' ? 'text-missed' :
                      'text-accent'
                    }`}>
                      {task.estimateMin}m
                    </div>
                  </div>
                );
              })}

              {/* Drag Preview */}
              {draggingTask && previewTop !== null && (
                <div
                  className="absolute left-14 md:left-20 right-2 md:right-8 bg-accent/10 border-2 border-accent border-dashed rounded-xl pointer-events-none backdrop-blur-sm z-20"
                  style={{
                    top: previewTop,
                    height: (draggingTask.estimateMin / 60) * HOUR_HEIGHT,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
