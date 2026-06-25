"use client";

import React from "react";
import type { FeasibilityResult } from "@/lib/scheduling/types";

interface FeasibilityPromptProps {
  result: FeasibilityResult;
  onContinue: () => void;
  onRethink: () => void;
  onApplySuggestions: (suggestions: NonNullable<FeasibilityResult['suggestions']>) => void;
}

export function FeasibilityPrompt({ result, onContinue, onRethink, onApplySuggestions }: FeasibilityPromptProps) {
  const { isFeasible, requiredMin, availableMin, shortfallMin, dependencyBlocked, dependencyDetails, suggestions } = result;

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      fontFamily: 'inherit'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isFeasible ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
          color: isFeasible ? '#2ecc71' : '#e74c3c',
          fontSize: 18
        }}>
          {isFeasible ? '✓' : '×'}
        </div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
          {isFeasible ? 'Schedule is Feasible' : 'Schedule is at Risk'}
        </h2>
      </div>

      <div style={{ display: 'flex', gap: 24, padding: '16px 0', borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Required</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
            {Math.floor(requiredMin/60)}h {requiredMin%60 > 0 ? requiredMin%60+'m' : ''}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Available Capacity</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: isFeasible ? 'var(--text-primary)' : 'var(--status-missed)' }}>
            {Math.floor(availableMin/60)}h {availableMin%60 > 0 ? availableMin%60+'m' : ''}
          </div>
        </div>
        {!isFeasible && shortfallMin && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--status-missed)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Shortfall</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--status-missed)' }}>
              {Math.floor(shortfallMin/60)}h {shortfallMin%60 > 0 ? shortfallMin%60+'m' : ''}
            </div>
          </div>
        )}
      </div>

      {!isFeasible && (
        <div style={{ background: 'var(--bg-surface-raised)', padding: 16, borderRadius: 8, borderLeft: '4px solid var(--status-missed)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 15, color: 'var(--text-primary)' }}>Issues Found</h3>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shortfallMin && <li>Not enough available capacity in the given timeline.</li>}
            {dependencyBlocked && <li>Blocked by unfinished predecessors: {dependencyDetails?.map(d => d.predecessorId).join(', ')}</li>}
          </ul>

          {suggestions && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Suggestions:</div>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
                {suggestions.adjustedMinutesPerDay && <li>Increase daily time to {suggestions.adjustedMinutesPerDay} min</li>}
                {suggestions.recommendedDeadlineExtensionDays && <li>Extend deadline by {suggestions.recommendedDeadlineExtensionDays} days</li>}
              </ul>
              <button 
                onClick={() => onApplySuggestions(suggestions)}
                style={{
                  marginTop: 12, background: 'transparent', border: '1px solid var(--border-default)', 
                  color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer'
                }}
              >
                Apply Suggestions
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {!isFeasible && (
          <button
            onClick={onRethink}
            style={{
              flex: 1, background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-default)',
              borderRadius: 8, padding: '12px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer'
            }}
          >
            Adjust Strategy
          </button>
        )}
        <button
          onClick={onContinue}
          style={{
            flex: 1, background: isFeasible ? 'var(--accent)' : 'var(--status-missed)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '12px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer'
          }}
        >
          {isFeasible ? 'Generate Schedule →' : 'Force Generate Anyway →'}
        </button>
      </div>
    </div>
  );
}
