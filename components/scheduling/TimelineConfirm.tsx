"use client";

import React, { useState } from "react";
import type { GeneratedSchedule } from "@/lib/scheduling/types";

interface TimelineConfirmProps {
  schedule: GeneratedSchedule;
  onCommit: () => Promise<void>;
  onCancel: () => void;
}

export function TimelineConfirm({ schedule, onCommit, onCancel }: TimelineConfirmProps) {
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { blocks, totalMinutes, completionDate, riskFlags } = schedule;

  const handleCommit = async () => {
    setIsCommitting(true);
    setError(null);
    try {
      await onCommit();
    } catch (err: any) {
      setError(err.message || "Failed to commit schedule");
      setIsCommitting(false);
    }
  };

  // Group blocks by date
  const groupedBlocks = blocks.reduce((acc, block) => {
    if (!acc[block.planDate]) acc[block.planDate] = [];
    acc[block.planDate].push(block);
    return acc;
  }, {} as Record<number, typeof blocks>);
  
  const sortedDates = Object.keys(groupedBlocks).map(Number).sort((a, b) => a - b);

  return (
    <div className="bg-surface border border-border-default rounded-xl p-6 font-inherit shadow-lg shadow-black/5">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-border-subtle flex justify-between items-end">
        <div>
          <h2 className="m-0 text-xl font-bold text-primary tracking-tight">Review Schedule</h2>
          <p className="mt-1 text-secondary text-sm">
            {sortedDates.length} days • <span className="font-medium text-primary">{Math.floor(totalMinutes/60)}h {totalMinutes%60}m</span> total allocated
          </p>
        </div>
      </div>

      {/* Risks */}
      {riskFlags.length > 0 && (
        <div className="bg-warning-subtle/50 p-4 rounded-xl border-l-4 border-warning mb-6">
          <h3 className="m-0 mb-2 text-sm text-warning font-semibold flex items-center gap-2">
            <span>⚠️</span> Schedule Risks
          </h3>
          <ul className="m-0 pl-5 text-warning-text text-sm flex flex-col gap-1 list-disc">
            {riskFlags.map((flag, i) => <li key={i}>{flag}</li>)}
          </ul>
        </div>
      )}

      {/* Timeline */}
      <div className="relative border-l-2 border-border-default ml-4 space-y-6 pb-6 max-h-[400px] overflow-y-auto pr-4">
        {sortedDates.map((date, index) => {
          const dayBlocks = groupedBlocks[date];
          const totalMin = dayBlocks.reduce((s, b) => s + b.durationMin, 0);
          const dateObj = new Date(date * 86_400_000);
          const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
          const isToday = date === Math.floor(Date.now() / 86400000);

          return (
            <div key={date} className="relative pl-6 group">
              {/* Timeline Dot */}
              <div className={`absolute -left-[9px] top-3 w-4 h-4 rounded-full border-2 bg-surface transition-colors duration-300 ${isToday ? 'border-accent bg-accent/20' : 'border-border-strong group-hover:border-accent'}`} />
              
              {/* Card */}
              <div className="bg-surface-raised border border-border-subtle rounded-xl p-4 transition-all duration-300 hover:border-accent/50 hover:shadow-md hover:shadow-accent/5 relative overflow-hidden">
                {/* Background glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-accent/0 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Left: Date info */}
                  <div className="w-28 flex-shrink-0">
                    <div className={`font-semibold text-sm ${isToday ? 'text-accent' : 'text-primary'}`}>
                      {dateStr}
                    </div>
                    <div className="text-xs text-secondary mt-0.5">
                      {Math.floor(totalMin/60)}h {totalMin%60}m
                    </div>
                  </div>
                  
                  {/* Right: Blocks */}
                  <div className="flex flex-wrap gap-2 flex-1">
                    {dayBlocks.map((block, i) => {
                      const typeStyles = {
                        focused: "bg-done-subtle text-done border-done/20",
                        overflow: "bg-missed-subtle text-missed border-missed/20",
                        makeup: "bg-warning-subtle text-warning border-warning/20",
                      };
                      const style = typeStyles[block.sessionType];
                      
                      return (
                        <div key={i} className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 shadow-sm transition-transform hover:scale-105 ${style}`}>
                          <span>{block.durationMin}m</span>
                          {block.sessionType !== 'focused' && (
                            <span className="opacity-80 text-[10px] uppercase tracking-wider">
                              • {block.sessionType}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="text-missed text-sm text-center mt-4 bg-missed-subtle/50 p-3 rounded-lg border border-missed/20">{error}</div>}

      {/* Footer */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-border-subtle">
        <button
          onClick={onCancel}
          disabled={isCommitting}
          className="flex-1 px-5 py-3 rounded-xl border border-border-default text-primary font-medium hover:bg-surface-raised transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleCommit}
          disabled={isCommitting}
          className="flex-[2] px-5 py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20 disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {isCommitting ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Committing...
            </>
          ) : 'Commit to Timeline'}
        </button>
      </div>
    </div>
  );
}
