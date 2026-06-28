"use client";

import React, { useState } from "react";
import type { DraftStrategy } from "@/lib/scheduling/types";

interface StrategyFormProps {
  taskId: string;
  taskTitle: string;
  estimateMin: number;
  deadlineAt: number | null;
  initialDraft?: Partial<DraftStrategy>;
  onSubmit: (draft: DraftStrategy) => void;
}

const IMPORTANCE_LABELS = ["Minimal", "Low", "Medium", "High", "Critical"];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function StrategyForm({ taskId, taskTitle, estimateMin, deadlineAt, initialDraft, onSubmit }: StrategyFormProps) {
  const [importance, setImportance] = useState(initialDraft?.importance ?? 3);
  const [minutesPerDay, setMinutesPerDay] = useState(initialDraft?.minutesPerDay ?? 60);
  const [activeDays, setActiveDays] = useState<number[]>(initialDraft?.activeDays ?? [1, 2, 3, 4, 5]);
  const [preferredStartDate, setPreferredStartDate] = useState(() => {
    if (initialDraft?.preferredStartDate) {
      return new Date(initialDraft.preferredStartDate * 86_400_000).toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });
  const [isFlexible, setIsFlexible] = useState(initialDraft?.isFlexible ?? false);
  
  const [autoSuggestLoading, setAutoSuggestLoading] = useState(false);
  const [autoSuggestError, setAutoSuggestError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleAutoSuggest = async () => {
    setAutoSuggestLoading(true);
    setAutoSuggestError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/strategy/auto-suggest`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to auto-suggest");
      const data: DraftStrategy = await res.json();
      setImportance(data.importance);
      setMinutesPerDay(data.minutesPerDay);
      setActiveDays(data.activeDays);
      setPreferredStartDate(new Date(data.preferredStartDate * 86_400_000).toISOString().slice(0, 10));
    } catch (err: any) {
      setAutoSuggestError(err.message);
    } finally {
      setAutoSuggestLoading(false);
    }
  };

  const handleSubmit = async () => {
    setFieldErrors({});
    const startUnixDay = Math.floor(new Date(preferredStartDate + 'T00:00:00Z').getTime() / 86_400_000);
    
    const draft: DraftStrategy = {
      taskId,
      importance,
      minutesPerDay,
      activeDays,
      preferredStartDate: startUnixDay,
      deadlineAt,
      isFlexible,
      suggestedBy: "manual"
    };

    try {
      const res = await fetch(`/api/tasks/${taskId}/strategy/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      if (!res.ok) {
        const errData = await res.json();
        if (errData.errors) {
          setFieldErrors(errData.errors);
          return;
        }
        throw new Error("Validation failed");
      }
      const validatedDraft = await res.json();
      onSubmit(validatedDraft);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDay = (d: number) => {
    setActiveDays(prev => 
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()
    );
  };

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      fontFamily: 'inherit'
    }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Schedule: {taskTitle}</h2>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>Estimate: {Math.floor(estimateMin/60)}h {estimateMin%60 > 0 ? estimateMin%60+'m' : ''}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Importance</label>
          <button 
            onClick={handleAutoSuggest} 
            disabled={autoSuggestLoading}
            style={{ 
              background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 8, 
              padding: '4px 10px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' 
            }}
          >
            {autoSuggestLoading ? "Thinking..." : "✨ Auto-suggest"}
          </button>
        </div>
        {autoSuggestError && <span style={{ color: 'var(--status-missed)', fontSize: 12 }}>{autoSuggestError}</span>}
        
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {IMPORTANCE_LABELS.map((label, i) => {
            const val = i + 1;
            const selected = importance === val;
            return (
              <button
                key={val}
                onClick={() => setImportance(val)}
                style={{
                  background: selected ? 'var(--bg-accent-subtle)' : 'var(--bg-surface-raised)',
                  border: `1px solid ${selected ? 'var(--accent-border)' : 'var(--border-default)'}`,
                  color: selected ? 'var(--text-accent)' : 'var(--text-secondary)',
                  borderRadius: 4, padding: '6px 12px', fontSize: 14, cursor: 'pointer',
                  transition: 'background 0.15s ease, border-color 0.15s ease'
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Minutes per day</label>
          <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
            {Math.floor(minutesPerDay/60)}h {minutesPerDay%60 > 0 ? minutesPerDay%60+'m' : ''}
          </span>
        </div>
        <input 
          type="range" min={30} max={480} step={30} value={minutesPerDay}
          onChange={e => setMinutesPerDay(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
        {fieldErrors.minutesPerDay && <span style={{ color: 'var(--status-missed)', fontSize: 12 }}>{fieldErrors.minutesPerDay}</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Days</label>
        <div className="day-picker" style={{ display: 'flex', gap: 8 }}>
          {DAYS.map((label, i) => {
            const val = i + 1;
            const selected = activeDays.includes(val);
            return (
              <button
                key={val}
                onClick={() => toggleDay(val)}
                className="day"
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  background: selected ? 'var(--accent)' : 'var(--bg-surface-raised)',
                  border: 'none',
                  color: selected ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: selected ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        {fieldErrors.activeDays && <span style={{ color: 'var(--status-missed)', fontSize: 12 }}>{fieldErrors.activeDays}</span>}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Start Date</label>
          <input 
            type="date" 
            className="start-date"
            value={preferredStartDate} 
            onChange={e => setPreferredStartDate(e.target.value)}
            style={{
              background: 'var(--bg-surface-raised)', border: '1px solid var(--border-default)',
              color: 'var(--text-primary)', borderRadius: 8, padding: '8px 12px', outline: 'none'
            }}
          />
          {fieldErrors.preferredStartDate && <span style={{ color: 'var(--status-missed)', fontSize: 12 }}>{fieldErrors.preferredStartDate}</span>}
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deadline</label>
          <div style={{
            background: 'var(--bg-surface-raised)', border: '1px solid var(--border-default)', opacity: 0.7,
            color: deadlineAt ? 'var(--text-primary)' : 'var(--text-tertiary)', borderRadius: 8, padding: '8px 12px'
          }}>
            {deadlineAt ? new Date(deadlineAt * 1000).toLocaleDateString() : "No deadline set"}
          </div>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input 
          type="checkbox" 
          checked={isFlexible} 
          onChange={e => setIsFlexible(e.target.checked)} 
          style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
        />
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Allow schedule flexibility (risk overruns)</span>
      </label>

      <button
        className="feasibility-btn"
        onClick={handleSubmit}
        style={{
          background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
          padding: '12px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          marginTop: 8
        }}
      >
        Check Feasibility →
      </button>
    </div>
  );
}
