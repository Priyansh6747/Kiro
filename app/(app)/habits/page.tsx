"use client";

import {
  Flame,
  CheckCircle2,
  Calendar,
  Repeat,
  Trophy,
  Activity,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  listHabits,
  listRecurringTasks,
  getHabitStreak,
  archiveHabit,
  archiveRecurringTask,
} from "@/lib/api-client";
import type { Habit, RecurringTask } from "@/lib/db/models";
import { LoadingScreen, EmptyState, ErrorBanner } from "@/components/ui";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";

function HabitCard({ habit, onArchive }: { habit: Habit; onArchive: (id: string) => void }) {
  const [streak, setStreak] = useState<{ current: number; best: number; rate7d: number } | null>(null);

  useEffect(() => {
    getHabitStreak(habit.id).then(setStreak).catch(console.error);
  }, [habit.id]);

  return (
    <div className="rounded-xl border border-border-default bg-surface p-5 hover:border-accent hover:shadow-sm transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg text-primary">{habit.name}</h3>
          <p className="text-sm text-secondary capitalize">{habit.cadence} Habit</p>
        </div>
        <button
          onClick={() => onArchive(habit.id)}
          className="text-tertiary hover:text-status-missed opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-raised rounded-lg p-3 flex flex-col items-center justify-center border border-border-subtle">
          <Flame className="w-5 h-5 text-orange-500 mb-1" />
          <span className="text-xl font-bold text-primary">{streak?.current ?? "-"}</span>
          <span className="text-[10px] uppercase tracking-wider text-tertiary font-medium">Current</span>
        </div>
        <div className="bg-surface-raised rounded-lg p-3 flex flex-col items-center justify-center border border-border-subtle">
          <Trophy className="w-5 h-5 text-yellow-500 mb-1" />
          <span className="text-xl font-bold text-primary">{streak?.best ?? "-"}</span>
          <span className="text-[10px] uppercase tracking-wider text-tertiary font-medium">Best</span>
        </div>
        <div className="bg-surface-raised rounded-lg p-3 flex flex-col items-center justify-center border border-border-subtle">
          <Activity className="w-5 h-5 text-accent mb-1" />
          <span className="text-xl font-bold text-primary">
            {streak ? Math.round(streak.rate7d * 100) : "-"}%
          </span>
          <span className="text-[10px] uppercase tracking-wider text-tertiary font-medium">7D Rate</span>
        </div>
      </div>
    </div>
  );
}

function RecurringTaskCard({ rt, onArchive }: { rt: RecurringTask; onArchive: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-border-default bg-surface p-5 hover:border-accent hover:shadow-sm transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg text-primary">{rt.title}</h3>
          <p className="text-sm text-secondary capitalize">{rt.cadence} Recurring Task</p>
        </div>
        <button
          onClick={() => onArchive(rt.id)}
          className="text-tertiary hover:text-status-missed opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center gap-2 text-sm text-secondary bg-surface-raised border border-border-subtle p-3 rounded-lg">
        <Calendar className="w-4 h-4 text-tertiary" />
        <span>Rule: {rt.recurrenceRule || "Custom (See schedule)"}</span>
      </div>
    </div>
  );
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [recurring, setRecurring] = useState<RecurringTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { confirm, ConfirmModal } = useConfirm();
  const { showToast } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [h, r] = await Promise.all([listHabits(), listRecurringTasks()]);
      setHabits(h);
      setRecurring(r);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleArchiveHabit = async (id: string) => {
    if (await confirm("Archive Habit", "Are you sure? This will remove it from your daily schedule.")) {
      try {
        await archiveHabit(id);
        showToast("Habit archived", "success");
        loadData();
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
  };

  const handleArchiveRecurring = async (id: string) => {
    if (await confirm("Archive Recurring Task", "Are you sure? This will stop future occurrences.")) {
      try {
        await archiveRecurringTask(id);
        showToast("Recurring task archived", "success");
        loadData();
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
  };

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorBanner message={error.message} onRetry={loadData} />;

  return (
    <div className="max-w-6xl mx-auto h-full p-4 lg:p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <Repeat className="w-8 h-8 text-accent" />
            Habits & Routines
          </h1>
          <p className="text-secondary mt-1">
            Track your daily disciplines and recurring commitments.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        {/* HABITS SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-primary">Active Habits</h2>
            <span className="bg-surface-raised border border-border-default px-2 py-0.5 rounded-full text-xs font-medium text-tertiary">
              {habits.length}
            </span>
          </div>

          {habits.length === 0 ? (
            <div className="border border-dashed border-border-strong rounded-xl p-8 text-center bg-surface-raised/50">
              <p className="text-secondary font-medium">No active habits</p>
              <p className="text-sm text-tertiary mt-1">Ask Nova to create a habit for you!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {habits.map((h) => (
                <HabitCard key={h.id} habit={h} onArchive={handleArchiveHabit} />
              ))}
            </div>
          )}
        </section>

        {/* RECURRING TASKS SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-primary">Recurring Tasks</h2>
            <span className="bg-surface-raised border border-border-default px-2 py-0.5 rounded-full text-xs font-medium text-tertiary">
              {recurring.length}
            </span>
          </div>

          {recurring.length === 0 ? (
            <div className="border border-dashed border-border-strong rounded-xl p-8 text-center bg-surface-raised/50">
              <p className="text-secondary font-medium">No recurring tasks</p>
              <p className="text-sm text-tertiary mt-1">Ask Nova to schedule one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recurring.map((rt) => (
                <RecurringTaskCard key={rt.id} rt={rt} onArchive={handleArchiveRecurring} />
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmModal />
    </div>
  );
}
