"use client";

import React, { useState, useEffect } from "react";
import { StrategyForm, FeasibilityPrompt, TimelineConfirm } from "./index";
import type { DraftStrategy, FeasibilityResult, GeneratedSchedule } from "@/lib/scheduling/types";

export function SchedulingFlow({ initialTaskId }: { initialTaskId?: string }) {
  const [phase, setPhase] = useState<number>(0);
  
  const [tasks, setTasks] = useState<{id: string, title: string, estimateMin: number, deadlineAt: number | null}[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(initialTaskId || null);
  const [loadingTasks, setLoadingTasks] = useState(!initialTaskId);
  
  const [draft, setDraft] = useState<DraftStrategy | null>(null);
  const [feasibility, setFeasibility] = useState<FeasibilityResult | null>(null);
  const [schedule, setSchedule] = useState<GeneratedSchedule | null>(null);

  // Phase 0: Task Selection
  useEffect(() => {
    if (!initialTaskId) {
      setLoadingTasks(true);
      fetch("/api/tasks/unscheduled")
        .then(res => res.json())
        .then(data => {
          setTasks(data);
          setLoadingTasks(false);
        })
        .catch(err => {
          console.error("Failed to load tasks", err);
          setLoadingTasks(false);
        });
    } else {
      // If we have an ID, we might need to fetch its details or assume the parent passes it?
      // Actually we just skip to phase 1.
      setPhase(1);
    }
  }, [initialTaskId]);

  const handleTaskSelect = (taskId: string) => {
    setSelectedTask(taskId);
    setPhase(1);
  };

  const handleDraftSubmit = async (newDraft: DraftStrategy) => {
    setDraft(newDraft);
    // Move to Phase 2: Feasibility
    const res = await fetch(`/api/tasks/${newDraft.taskId}/strategy/feasibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDraft)
    });
    if (res.ok) {
      const result = await res.json();
      setFeasibility(result);
      setPhase(2);
    }
  };

  const generateSchedule = async (strategyDraft: DraftStrategy, acceptedRisk: boolean) => {
    const finalStrategy = { ...strategyDraft, acceptedRisk };
    const res = await fetch(`/api/tasks/${finalStrategy.taskId}/strategy/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalStrategy)
    });
    if (res.ok) {
      const generated = await res.json();
      setSchedule(generated);
      setPhase(3);
    }
  };

  const commitSchedule = async () => {
    if (!draft || !schedule) return;
    const finalStrategy = { ...draft, acceptedRisk: !feasibility?.isFeasible };
    const res = await fetch(`/api/tasks/${draft.taskId}/strategy/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategy: finalStrategy, schedule })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to commit");
    }
    setPhase(4);
  };

  const applySuggestions = (suggestions: NonNullable<FeasibilityResult['suggestions']>) => {
    if (!draft) return;
    const updatedDraft = { ...draft };
    if (suggestions.adjustedMinutesPerDay) updatedDraft.minutesPerDay = suggestions.adjustedMinutesPerDay;
    // Deadline extensions don't change the draft directly but change the UI
    setDraft(updatedDraft);
    setPhase(1); // Go back to draft to show the changes and re-run
  };

  const task = initialTaskId 
    ? { id: initialTaskId, title: "Selected Task", estimateMin: 60, deadlineAt: null } // Mock for now if direct ID is passed
    : tasks.find(t => t.id === selectedTask);

  if (phase === 0) {
    return (
      <div className="bg-surface border border-border-default rounded-xl p-5 font-inherit">
        <h2 className="m-0 text-lg font-semibold text-primary mb-4">Select Task to Schedule</h2>
        {loadingTasks ? <div className="text-secondary text-sm">Loading tasks...</div> : (
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {tasks.length === 0 ? <div className="text-secondary italic">No unscheduled tasks found.</div> : null}
            {tasks.map(t => (
              <button 
                key={t.id} 
                onClick={() => handleTaskSelect(t.id)}
                className="text-left px-4 py-3 rounded-lg border border-border-default hover:bg-surface-raised transition-colors flex justify-between"
              >
                <span className="font-medium text-primary">{t.title}</span>
                <span className="text-tertiary text-sm">{Math.floor(t.estimateMin/60)}h {t.estimateMin%60}m</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phase === 1 && task) {
    return (
      <StrategyForm 
        taskId={task.id} 
        taskTitle={task.title} 
        estimateMin={task.estimateMin} 
        deadlineAt={task.deadlineAt} 
        initialDraft={draft || undefined}
        onSubmit={handleDraftSubmit} 
      />
    );
  }

  if (phase === 2 && feasibility && draft) {
    return (
      <FeasibilityPrompt 
        result={feasibility} 
        onContinue={() => generateSchedule(draft, true)} 
        onRethink={() => setPhase(1)} 
        onApplySuggestions={applySuggestions}
      />
    );
  }

  if (phase === 3 && schedule) {
    return (
      <TimelineConfirm 
        schedule={schedule} 
        onCommit={commitSchedule} 
        onCancel={() => setPhase(1)} 
      />
    );
  }

  if (phase === 4) {
    return (
      <div className="bg-surface border border-border-default rounded-xl p-5 text-center font-inherit">
        <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-3 text-2xl">✓</div>
        <h2 className="m-0 text-lg font-semibold text-primary">Schedule Committed!</h2>
        <p className="mt-2 text-secondary text-sm">The timeline has been updated successfully.</p>
        <button 
          onClick={() => { setPhase(0); setSelectedTask(null); }}
          className="mt-4 px-4 py-2 rounded-lg border border-border-default hover:bg-surface-raised text-primary text-sm font-medium transition-colors"
        >
          Schedule Another Task
        </button>
      </div>
    );
  }

  return null;
}
