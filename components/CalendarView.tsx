import { ChevronLeft, ChevronRight, Share } from "lucide-react";
import { useState, useEffect } from "react";
import { HabitMarker, RecurringMarker } from "@/lib/db/models";

interface CalendarViewProps {
  markers: (HabitMarker | RecurringMarker)[];
  currentStreak: number;
  maxStreak: number;
  monthOffset: number; // 0 = current month, -1 = last month, etc.
  onMonthChange: (offset: number) => void;
  isLoading?: boolean;
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // 0 = Mon, 6 = Sun
}

export function CalendarView({ markers, currentStreak, maxStreak, monthOffset, onMonthChange, isLoading }: CalendarViewProps) {
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const monthName = targetDate.toLocaleString('default', { month: 'short' });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const markerMap = new Map<number, "done" | "missed" | "pending" | "carried">();
  markers.forEach(m => {
    // Unix day to Date
    const d = new Date(m.date * 86400000);
    if (d.getFullYear() === year && d.getMonth() === month) {
      markerMap.set(d.getDate(), m.status as any);
    }
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="h-8 w-8" />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const status = markerMap.get(d);
    let content = <span className="text-sm font-medium text-secondary">{d}</span>;
    if (status === "done") content = <span className="text-xl">🔥</span>;
    else if (status === "missed") content = <span className="text-xl">😭</span>;
    else if (status === "pending" || status === "carried") content = <span className="text-xl">⏱️</span>;

    cells.push(
      <div key={`day-${d}`} className="h-10 w-10 flex items-center justify-center relative">
        {status === "pending" && (
          <div className="absolute inset-0 rounded-full border border-border-default opacity-50 pointer-events-none" />
        )}
        {content}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-surface rounded-xl border border-border-default p-6 w-full max-w-sm animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-8 rounded-full bg-surface-raised" />
          <div className="h-8 w-24 rounded-lg bg-surface-raised" />
          <div className="h-8 w-8 rounded-full bg-surface-raised" />
        </div>
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {DAYS_OF_WEEK.map(d => <div key={d} className="h-4 bg-surface-raised rounded w-full" />)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-10 w-10 rounded-full bg-surface-raised mx-auto" />
          ))}
        </div>
        <div className="flex justify-between mt-6">
          <div className="h-10 w-32 rounded-lg bg-surface-raised" />
          <div className="h-10 w-32 rounded-lg bg-surface-raised" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-primary rounded-2xl border border-border-default p-6 w-full max-w-sm shadow-xl font-sans">
      <div className="flex justify-between items-center mb-6">
        <button className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-surface-raised transition-colors border border-border-subtle">
          <span className="text-secondary text-sm">i</span>
        </button>
        
        <div className="flex items-center gap-2">
          <button onClick={() => onMonthChange(monthOffset - 1)} className="p-1 hover:bg-surface-raised rounded transition-colors text-secondary">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="bg-surface-raised px-4 py-1.5 rounded-lg text-sm font-bold text-primary shadow-inner">
            {monthName}
          </div>
          <button onClick={() => onMonthChange(monthOffset + 1)} className="p-1 hover:bg-surface-raised rounded transition-colors text-secondary">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-surface-raised transition-colors border border-border-subtle text-secondary">
          <Share className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-4 mb-4 text-center">
        {DAYS_OF_WEEK.map(d => (
          <div key={d} className="text-xs font-semibold text-secondary">
            {d}
          </div>
        ))}
        {cells}
      </div>

      <div className="flex items-center justify-between mt-8">
        <div className="flex items-center gap-3 border border-border-subtle bg-surface-raised rounded-xl px-4 py-2">
          <span className="text-sm font-semibold text-primary">Current <span className="text-orange-500">🔥</span> {currentStreak}</span>
          <div className="w-px h-4 bg-border-strong" />
          <span className="text-sm font-semibold text-tertiary">Max <span className="text-red-500 text-xs">&lt;/&gt;</span> {maxStreak}</span>
        </div>
        
        <button className="flex items-center gap-2 border border-border-subtle bg-transparent hover:bg-surface-raised transition-colors rounded-xl px-4 py-2 text-sm font-semibold text-secondary">
          <span>⭐</span> Leaderboard
        </button>
      </div>
    </div>
  );
}
