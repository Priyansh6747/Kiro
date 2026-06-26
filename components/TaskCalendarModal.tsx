import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { HabitMarker, RecurringMarker } from "@/lib/db/models";
import { getHabitMarkers, getHabitStreak, getRecurringMarkers } from "@/lib/api-client";
import { CalendarView } from "./CalendarView";

export function TaskCalendarModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  type,
}: {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  type: "habit" | "recurring";
}) {
  const [markers, setMarkers] = useState<(HabitMarker | RecurringMarker)[]>([]);
  const [streak, setStreak] = useState({ current: 0, max: 0 });
  const [monthOffset, setMonthOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    const load = async () => {
      try {
        const today = new Date();
        const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        
        // Approximate range for the month
        const firstDay = new Date(year, month, 1).getTime() / 86400000;
        const lastDay = new Date(year, month + 1, 0).getTime() / 86400000 + 1; // plus padding

        if (type === "habit") {
          const [m, s] = await Promise.all([
            getHabitMarkers(taskId, Math.floor(firstDay) - 7, Math.floor(lastDay) + 7),
            getHabitStreak(taskId),
          ]);
          if (isMounted) {
            setMarkers(m);
            setStreak({ current: s.current, max: s.best });
          }
        } else {
          const m = await getRecurringMarkers(taskId, Math.floor(firstDay) - 7, Math.floor(lastDay) + 7);
          if (isMounted) {
            setMarkers(m);
            // Recurring doesn't have streak API yet, mock it
            setStreak({ current: 0, max: 0 });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [isOpen, taskId, monthOffset, type]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface border border-border-default rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-tertiary hover:text-primary hover:bg-surface-raised rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="mb-6 pr-8">
          <h2 className="text-xl font-bold text-primary">{taskTitle}</h2>
          <p className="text-sm text-secondary capitalize">{type} Calendar</p>
        </div>

        <div className="flex justify-center">
          <CalendarView
            markers={markers}
            currentStreak={streak.current}
            maxStreak={streak.max}
            monthOffset={monthOffset}
            onMonthChange={setMonthOffset}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
