import React, { useState, useRef } from "react";
import type { Task, DayPlan } from "@/lib/types";

interface TimelineProps {
  tasks: Task[];
  dayPlans: DayPlan[];
  onPlaceBlock: (taskId: string, startTime: number) => Promise<void>;
}

export function Timeline({ tasks, dayPlans, onPlaceBlock }: TimelineProps) {
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
    <div className="flex flex-col h-full bg-gray-50 border-t md:border-t-0 md:border-l relative overflow-hidden shrink-0 w-80">
      {error && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-red-100 text-red-700 px-3 py-1 text-xs rounded shadow">
          {error}
        </div>
      )}
      <div className="px-4 py-3 bg-white border-b shrink-0 flex justify-between items-center">
        <h2 className="text-xs font-semibold text-gray-500 uppercase">Day Planner</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Unplaced Tasks Sidebar */}
        <div className="w-24 bg-white border-r p-2 overflow-y-auto space-y-2 shrink-0">
          <p className="text-[10px] font-medium text-gray-400 uppercase mb-2">Unplaced</p>
          {tasks
            .filter((t) => !dayPlans.some((p) => p.taskId === t.id))
            .map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task)}
                className="bg-blue-50 border border-blue-200 p-2 rounded text-[10px] cursor-move hover:bg-blue-100 transition-colors shadow-sm"
              >
                <div className="font-medium truncate">{task.title}</div>
                <div className="text-blue-600/70">{task.estimateMin}m</div>
              </div>
            ))}
        </div>

        {/* Timeline Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto relative bg-white"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
            {/* Grid lines */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-b border-gray-100 flex items-start"
                style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              >
                <span className="text-[9px] text-gray-400 font-medium w-10 text-right pr-2 pt-1">
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
                  className="absolute left-10 right-2 bg-blue-100 border border-blue-300 rounded shadow-sm px-2 py-1 overflow-hidden cursor-move hover:shadow-md transition-shadow group"
                  style={{ top, height }}
                >
                  <div className="text-[10px] font-medium text-blue-900 truncate leading-tight">
                    {task.title}
                  </div>
                  <div className="text-[9px] text-blue-700/80">
                    {task.estimateMin}m
                  </div>
                </div>
              );
            })}

            {/* Drag Preview */}
            {draggingTask && previewTop !== null && (
              <div
                className="absolute left-10 right-2 bg-blue-500/20 border-2 border-blue-500 border-dashed rounded pointer-events-none"
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
  );
}
