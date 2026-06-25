"use client";

import React, { useState, useEffect } from "react";
import { StrategyForm, FeasibilityPrompt, TimelineConfirm } from "./index";
import type { DraftStrategy, FeasibilityResult, GeneratedSchedule } from "@/lib/scheduling/types";

export function SchedulingFlow({ initialProjectId }: { initialProjectId?: string }) {
  const [phase, setPhase] = useState<number>(0);
  
  const [projects, setProjects] = useState<{id: string, name: string, estimateMin: number, deadlineAt: number | null}[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(initialProjectId || null);
  const [loading, setLoading] = useState(!initialProjectId);
  
  const [draft, setDraft] = useState<DraftStrategy | null>(null);
  const [feasibility, setFeasibility] = useState<FeasibilityResult | null>(null);
  // Store an array of schedules for the batch
  const [schedules, setSchedules] = useState<GeneratedSchedule[] | null>(null);

  // Phase 0: Project Selection
  useEffect(() => {
    if (!initialProjectId) {
      setLoading(true);
      fetch("/api/projects/unscheduled")
        .then(res => res.json())
        .then(data => {
          setProjects(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load projects", err);
          setLoading(false);
        });
    } else {
      setPhase(1);
    }
  }, [initialProjectId]);

  const handleSelect = (id: string) => {
    setSelectedProject(id);
    setPhase(1);
  };

  const handleDraftSubmit = async (newDraft: DraftStrategy) => {
    // For project batch, we use the strategy as a template.
    const projectDraft = { ...newDraft, projectId: selectedProject! };
    setDraft(projectDraft);
    
    // We could do a batch feasibility check, but for now we just skip Phase 2 and go straight to generation,
    // OR we pass acceptedRisk = true and just generate the batch.
    generateBatchSchedule(projectDraft, true);
  };

  const generateBatchSchedule = async (strategyDraft: DraftStrategy, acceptedRisk: boolean) => {
    const finalStrategy = { ...strategyDraft, acceptedRisk };
    const res = await fetch(`/api/projects/${selectedProject}/strategy/batch-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalStrategy)
    });
    if (res.ok) {
      const data = await res.json();
      setSchedules(data.schedules);
      setPhase(3);
    }
  };

  const commitBatchSchedule = async () => {
    if (!draft || !schedules) return;
    const finalStrategy = { ...draft, acceptedRisk: true };
    const res = await fetch(`/api/projects/${selectedProject}/strategy/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategy: finalStrategy, schedules })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to commit");
    }
    setPhase(4);
  };

  const project = initialProjectId 
    ? { id: initialProjectId, name: "Selected Project", estimateMin: 0, deadlineAt: null }
    : projects.find(p => p.id === selectedProject);

  if (phase === 0) {
    return (
      <div className="bg-surface border border-border-default rounded-xl p-5 font-inherit">
        <h2 className="m-0 text-lg font-semibold text-primary mb-4">Select Project to Schedule</h2>
        {loading ? <div className="text-secondary text-sm">Loading projects...</div> : (
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {projects.length === 0 ? <div className="text-secondary italic">No unscheduled projects found.</div> : null}
            {projects.map(p => (
              <button 
                key={p.id} 
                onClick={() => handleSelect(p.id)}
                className="text-left px-4 py-3 rounded-lg border border-border-default hover:bg-surface-raised transition-colors flex justify-between"
              >
                <span className="font-medium text-primary">{p.name}</span>
                {p.estimateMin > 0 && <span className="text-tertiary text-sm">{Math.floor(p.estimateMin/60)}h {p.estimateMin%60}m</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phase === 1 && project) {
    return (
      <StrategyForm 
        taskId={project.id} // Reusing StrategyForm, passing projectId as taskId
        taskTitle={`Project: ${project.name}`} 
        estimateMin={project.estimateMin} 
        deadlineAt={project.deadlineAt} 
        initialDraft={draft || undefined}
        onSubmit={handleDraftSubmit} 
      />
    );
  }

  // Merging all schedule blocks into one composite schedule for TimelineConfirm
  if (phase === 3 && schedules) {
    const compositeBlocks = schedules.flatMap(s => s.blocks);
    const totalMin = schedules.reduce((acc, s) => acc + s.totalMinutes, 0);
    const riskFlags = schedules.flatMap(s => s.riskFlags);
    
    return (
      <TimelineConfirm 
        schedule={{
          taskId: "batch",
          blocks: compositeBlocks,
          totalMinutes: totalMin,
          completionDate: compositeBlocks.length > 0 ? Math.max(...compositeBlocks.map(b => b.planDate)) : 0,
          riskFlags: [...new Set(riskFlags)], // deduplicate
        }} 
        onCommit={commitBatchSchedule} 
        onCancel={() => setPhase(1)} 
      />
    );
  }

  if (phase === 4) {
    return (
      <div className="bg-surface border border-border-default rounded-xl p-5 text-center font-inherit">
        <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-3 text-2xl">✓</div>
        <h2 className="m-0 text-lg font-semibold text-primary">Project Committed!</h2>
        <p className="mt-2 text-secondary text-sm">All tasks have been scheduled onto your timeline sequentially.</p>
        <button 
          onClick={() => { setPhase(0); setSelectedProject(null); }}
          className="mt-4 px-4 py-2 rounded-lg border border-border-default hover:bg-surface-raised text-primary text-sm font-medium transition-colors"
        >
          Schedule Another
        </button>
      </div>
    );
  }

  return null;
}
