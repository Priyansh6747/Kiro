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
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 12,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      fontFamily: 'inherit'
    }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Review Schedule</h2>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
          {sortedDates.length} days • {Math.floor(totalMinutes/60)}h {totalMinutes%60}m total
        </p>
      </div>

      {riskFlags.length > 0 && (
        <div style={{ background: 'rgba(243, 156, 18, 0.1)', padding: 16, borderRadius: 8, borderLeft: '4px solid #f39c12' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#f39c12', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚠️</span> Schedule Risks
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {riskFlags.map((flag, i) => <li key={i}>{flag}</li>)}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
        {sortedDates.map((date) => {
          const dayBlocks = groupedBlocks[date];
          const totalMin = dayBlocks.reduce((s, b) => s + b.durationMin, 0);
          const dateStr = new Date(date * 86_400_000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
          
          return (
            <div key={date} style={{ 
              display: 'flex', gap: 16, padding: '12px 16px', 
              background: 'var(--bg-surface-raised)', borderRadius: 8,
              border: '1px solid var(--border-default)'
            }}>
              <div style={{ width: 100, flexShrink: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{dateStr}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{Math.floor(totalMin/60)}h {totalMin%60}m</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                {dayBlocks.map((block, i) => {
                  const typeColors = {
                    focused: { bg: 'rgba(46, 204, 113, 0.1)', text: '#2ecc71', border: 'rgba(46, 204, 113, 0.2)' },
                    overflow: { bg: 'rgba(231, 76, 60, 0.1)', text: '#e74c3c', border: 'rgba(231, 76, 60, 0.2)' },
                    makeup: { bg: 'rgba(243, 156, 18, 0.1)', text: '#f39c12', border: 'rgba(243, 156, 18, 0.2)' },
                  };
                  const colors = typeColors[block.sessionType];
                  
                  return (
                    <div key={i} style={{ 
                      background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
                      padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 6
                    }}>
                      {block.durationMin}m {block.sessionType !== 'focused' && `(${block.sessionType})`}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {error && <div style={{ color: 'var(--status-missed)', fontSize: 14, textAlign: 'center' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          onClick={onCancel}
          disabled={isCommitting}
          style={{
            flex: 1, background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-default)',
            borderRadius: 8, padding: '12px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            opacity: isCommitting ? 0.5 : 1
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleCommit}
          disabled={isCommitting}
          style={{
            flex: 2, background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '12px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            opacity: isCommitting ? 0.7 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}
        >
          {isCommitting ? 'Committing...' : 'Commit to Timeline'}
        </button>
      </div>
    </div>
  );
}
