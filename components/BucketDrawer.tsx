"use client";

import { useState, useRef } from "react";
import { Task, Project } from "@/lib/types";

interface BucketDrawerProps {
  bucketTasksByProject: Record<string, Task[]>;
  projects: Project[];
  onSchedule: (task: Task) => void;
  onClose: () => void;
  animatingTasksStatus?: Record<string, 'loading' | 'success' | 'error'>;
}

export function BucketDrawer({ bucketTasksByProject, projects, onSchedule, onClose, animatingTasksStatus = {} }: BucketDrawerProps) {
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});

  const toggleProject = (projectId: string) => {
    setCollapsedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  return (
    <div className="w-80 h-full bg-surface-raised border-l border-border-default flex flex-col shrink-0 overflow-hidden shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <h3 className="font-semibold text-primary">Schedule a new Task</h3>
        <button onClick={onClose} className="text-secondary hover:text-primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(bucketTasksByProject).map(([projectId, tasks]) => {
          const project = projects.find(p => p.id === projectId);
          const projectName = project?.name || "Unknown Project";
          const isCollapsed = collapsedProjects[projectId];
          
          return (
            <div key={projectId} className="border border-border-strong rounded-lg overflow-hidden">
              <div 
                className="px-3 py-2 bg-accent-subtle flex items-center justify-between cursor-pointer"
                onClick={() => toggleProject(projectId)}
              >
                <span className="text-sm font-semibold text-primary">
                  {projectName}
                </span>
                <span className="text-xs text-secondary">Deadline</span>
              </div>
              
              {!isCollapsed && (
                <div className="flex flex-col bg-surface">
                  {tasks.map((task) => (
                    <SwipeableTask
                      key={task.id}
                      task={task}
                      animState={animatingTasksStatus[task.id]}
                      onSchedule={onSchedule}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SwipeableTask({
  task,
  animState,
  onSchedule
}: {
  task: Task;
  animState?: 'loading' | 'success' | 'error';
  onSchedule: (t: Task) => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startX.current;
    // only allow swipe left
    if (diff < 0 && diff > -150) {
      setDragX(diff);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (dragX < -60) {
      onSchedule(task);
    }
    setDragX(0);
  };

  return (
    <div className="relative overflow-hidden border-b border-border-default last:border-0">
      {/* Background action hint */}
      <div 
        className="absolute inset-y-0 right-0 bg-accent text-white flex items-center justify-end px-4 w-full" 
        style={{ opacity: Math.min(Math.abs(dragX) / 60, 1) }}
      >
         <span className="mr-2 text-sm font-semibold">Schedule</span>
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
           <path d="M19 12H5M12 19l-7-7 7-7"/>
         </svg>
      </div>

      <div
        className={`group flex flex-col p-3 bg-surface hover:bg-surface-raised transition-colors cursor-grab active:cursor-grabbing select-none touch-none ${
          animState === 'success' ? '!bg-done-subtle text-done' :
          animState === 'error' ? '!bg-missed-subtle text-missed' :
          animState === 'loading' ? '!bg-accent-subtle/50 animate-pulse text-secondary' :
          ''
        } ${!isDragging ? 'transition-transform duration-200' : ''}`}
        style={{ transform: `translateX(${dragX}px)`, touchAction: 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className={`flex justify-between items-start mb-1 ${animState === 'loading' ? 'text-secondary' : 'text-primary'}`}>
          <span className="text-sm text-primary">{task.title}</span>
          <span className="text-xs text-secondary">{task.estimateMin}m</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-secondary">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onSchedule(task);
            }}
            className="flex items-center gap-1 text-tertiary hover:text-accent hover:underline pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Swipe to add
          </button>
          <span className="ml-auto text-tertiary">Deadline</span>
        </div>
      </div>
    </div>
  );
}
