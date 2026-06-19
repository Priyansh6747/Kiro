"use client";

import { useState } from "react";
import { Task, Project } from "@/lib/types";

interface BucketDrawerProps {
  bucketTasksByProject: Record<string, Task[]>;
  projects: Project[];
  onSchedule: (task: Task) => void;
  onClose: () => void;
}

export function BucketDrawer({ bucketTasksByProject, projects, onSchedule, onClose }: BucketDrawerProps) {
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
                    <div key={task.id} className="group relative flex flex-col p-3 border-b border-border-default last:border-0 hover:bg-surface-raised transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm text-primary">{task.title}</span>
                        <span className="text-xs text-secondary">{task.estimateMin}m</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-secondary">
                        <button 
                          onClick={() => onSchedule(task)}
                          className="flex items-center gap-1 text-accent hover:underline"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                          </svg>
                          Swipe to add
                        </button>
                        <span className="ml-auto text-tertiary">Deadline</span>
                      </div>
                    </div>
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
