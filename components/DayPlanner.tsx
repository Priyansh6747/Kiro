import React, { useState, useRef } from "react";
import type { Task, DayPlan } from "@/lib/types";

interface TimelineProps {
  tasks: Task[];
  dayPlans: DayPlan[];
  onPlaceBlock: (taskId: string, startTime: number) => Promise<void>;
}

export function DayPlanner({ tasks, dayPlans, onPlaceBlock, onClose }: TimelineProps & { onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [previewTop, setPreviewTop] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 24 hours
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // 60 pixels per hour
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
    
    // Snap to 15-minute intervals
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

    const startMinutes = (previewTop / HOUR_HEIGHT) * 60;
    
    // Midnight of current local day in UTC
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const midnightSec = Math.floor(d.getTime() / 1000);
    const startTime = midnightSec + startMinutes * 60;
    
    const estimateMin = task.estimateMin;
    const newEnd = startTime + estimateMin * 60;

    // Frontend overlap check
    const hasOverlap = dayPlans.some((plan) => {
      if (plan.taskId === taskId) return false; // ignore self
      const planTask = tasks.find(t => t.id === plan.taskId);
      if (!planTask) return false;
      const blockEnd = plan.startTime + planTask.estimateMin * 60;
      return startTime < blockEnd && newEnd > plan.startTime;
    });

    if (hasOverlap) {
      setError("Cannot place block: overlaps with existing task.");
      setTimeout(() => setError(null), 3000);
    } else {
      await onPlaceBlock(taskId, startTime);
    }

    setDraggingTask(null);
    setPreviewTop(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
      {/* Click outside to close (optional, could just use the X) */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="flex flex-col h-full w-full max-w-6xl bg-surface rounded-2xl md:rounded-3xl border border-border-default shadow-2xl relative overflow-hidden">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-missed-subtle border border-missed text-missed px-4 py-2 text-sm rounded-lg shadow-lg animate-in slide-in-from-top-4">
            {error}
          </div>
        )}
        
        <div className="px-6 py-4 bg-surface-raised border-b border-border-default shrink-0 flex justify-between items-center z-10">
          <h2 className="text-lg font-medium text-primary tracking-wide">Drag & Drop Day Planner</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-tertiary hover:text-primary hover:bg-surface rounded-lg transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Unplaced Tasks Sidebar */}
          <div className="w-64 bg-surface border-r border-border-default p-4 overflow-y-auto space-y-3 shrink-0 flex flex-col">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Unplaced Tasks</p>
            <p className="text-xs text-tertiary mb-4">Drag tasks onto the timeline to schedule them.</p>
            
            <div className="space-y-3">
              {tasks
                .filter((t) => !dayPlans.some((p) => p.taskId === t.id))
                .map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    className="bg-surface-raised border border-border-default p-3 rounded-xl cursor-move hover:border-accent hover:shadow-md transition-all group"
                  >
                    <div className="font-medium text-primary text-sm line-clamp-2">{task.title}</div>
                    <div className="text-xs text-secondary mt-2 font-mono">{task.estimateMin}m</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Timeline Area */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto relative bg-surface"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
              {/* Grid lines */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full border-b border-border-subtle flex items-start"
                  style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                >
                  <span className="text-[11px] text-tertiary font-medium w-16 text-right pr-4 pt-1 font-mono">
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

                return (
                  <div
                    key={plan.taskId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    className="absolute left-20 right-8 bg-accent-subtle border border-accent/30 rounded-xl shadow-sm px-4 py-2 overflow-hidden cursor-move hover:shadow-md hover:border-accent transition-all group backdrop-blur-md"
                    style={{ top, height }}
                  >
                    <div className="text-sm font-medium text-primary truncate leading-tight">
                      {task.title}
                    </div>
                    <div className="text-xs text-accent mt-1 font-mono">
                      {task.estimateMin}m
                    </div>
                  </div>
                );
              })}

              {/* Drag Preview */}
              {draggingTask && previewTop !== null && (
                <div
                  className="absolute left-20 right-8 bg-accent/10 border-2 border-accent border-dashed rounded-xl pointer-events-none backdrop-blur-sm z-20"
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
