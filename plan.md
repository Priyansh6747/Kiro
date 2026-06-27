# Kiro — Habit & Recurring Task Structural Reform Plan

## 0. Motivation and Core Problem

Today, "habits" and "recurring tasks" are **project-type enums** on the `projects` table and ordinary `tasks` rows with a `recurrenceRule` string. This collapses two very different concepts into one mold built for one-off work, causing:

- No first-class **status tracking** per occurrence (a missed DSA today is not the same as missing DSA yesterday).
- No **streak metrics**. The only completeness signal lives in `day_logs`, which is about *aggregate* throughput, not per-habit compliance.
- Spawning a "carried" task for a missed occurrence has no canonical source of truth — it just creates a loose task referencing nothing.
- The scheduler treats habits/recurring tasks the same as regular tasks, making it impossible to express "this always runs, every day, and a new occurrence is born at midnight".

---

## 1. New Mental Model

| Concept | Description | Analogy |
|---|---|---|
| **Habit** | A template for a daily (or cadence-based) commitment. Every day it fires a new *occurrence* automatically. Think "DSA practice". | A cron job for your personal life. |
| **Recurring Task** | A template for a periodic multi-step task. Fires on a schedule but is not necessarily daily. Think "Weekly retrospective". | A project that repeats. |
| **Occurrence** | A single-day instance of a habit or recurring task. Has its own status: `pending → done / missed / skipped`. | One execution of the cron job. |
| **Marker** | The row in the `habit_markers` or `recurring_markers` table representing one occurrence. The source of truth for streaks & daily schedule injection. | An event log entry. |

---

## 2. New Tables

### 2a. `habits`

Replaces the `type = 'habit'` projects. Each row is a habit *template*.

```sql
habits (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  name           TEXT NOT NULL,
  description    TEXT,
  importance     INTEGER NOT NULL DEFAULT 3,   -- 1–5
  cadence        TEXT NOT NULL DEFAULT 'daily', -- 'daily' | 'weekdays' | 'custom'
  active_days    TEXT,                          -- JSON: [1,2,3,4,5] (1=Mon..7=Sun), null = all
  estimate_min   INTEGER NOT NULL DEFAULT 30,
  color          TEXT,                          -- UI accent colour
  archived_at    INTEGER,                       -- soft delete
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
)
```

> **Note**: No `project_id` or `task_id`. Habits are top-level entities.

---

### 2b. `recurring_tasks`

Replaces the `type = 'recurring'` projects + their tasks.

```sql
recurring_tasks (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  title          TEXT NOT NULL,
  description    TEXT,
  project_id     TEXT REFERENCES projects(id),  -- optional: can be part of a project
  importance     INTEGER NOT NULL DEFAULT 3,
  cadence        TEXT NOT NULL,                 -- 'daily' | 'weekly' | 'custom'
  active_days    TEXT,                          -- JSON: [1,2,3,4,5]
  recurrence_rule TEXT,                         -- 'daily' | 'MON,THU' | 'weekly'
  recurrence_ends_at INTEGER,                   -- unix timestamp; null = forever
  estimate_min   INTEGER NOT NULL DEFAULT 30,
  archived_at    INTEGER,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
)
```

---

### 2c. `habit_markers`

One row per *occurrence* of a habit (created at midnight of each active day, or on-demand).

```sql
habit_markers (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  habit_id       TEXT NOT NULL REFERENCES habits(id),
  date           INTEGER NOT NULL,  -- unix day (occurrence date)
  status         TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'done' | 'missed' | 'skipped'
  completed_at   INTEGER,           -- unix timestamp when marked done
  notes          TEXT,              -- optional reflection
  created_at     INTEGER NOT NULL,

  UNIQUE(habit_id, date)            -- one marker per habit per day
)
```

---

### 2d. `recurring_markers`

One row per *occurrence* of a recurring task.

```sql
recurring_markers (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  recurring_task_id TEXT NOT NULL REFERENCES recurring_tasks(id),
  date            INTEGER NOT NULL,   -- unix day
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'done' | 'missed' | 'carried'
  spawned_task_id TEXT REFERENCES tasks(id),       -- if a concrete task was created for this occurrence
  completed_at    INTEGER,
  created_at      INTEGER NOT NULL,

  UNIQUE(recurring_task_id, date)
)
```

> The `spawned_task_id` column is the key to the carry-forward mechanic. When an occurrence is missed, the day-close routine creates a new task in the `tasks` table (with `carriedFromId` pointing here conceptually), marks the marker `missed`, and a fresh `recurring_marker` is inserted for the next fire date with status `pending`.

---

## 3. Streak Computation

Streaks are computed from `habit_markers` on-demand (or cached). Two types:

| Metric | Formula |
|---|---|
| **Current Streak** | Count consecutive days ending at *today* where `status = 'done'`. |
| **Best Streak** | The maximum run ever. |
| **Completion Rate (7d / 30d)** | `done / (done + missed)` in the window. `skipped` days are excluded from denominator. |

A pure SQL query over `habit_markers` can compute all three in one scan, no new table needed. A `habit_streaks` *view* can be materialized lazily.

---

## 4. Daily Schedule Injection

At **midnight UTC** (or when the user opens Kiro for the first time that day), a background job runs:

1. Query all active `habits` where today matches `cadence` / `active_days`.
2. For each, `INSERT OR IGNORE` a `habit_markers` row with `status = 'pending'` and `date = today`.
3. Query all active `recurring_tasks` whose `recurrence_rule` fires today.
4. For each, `INSERT OR IGNORE` a `recurring_markers` row with `status = 'pending'`.
5. The `show_today_agenda` Juno tool reads both marker tables alongside `day_plan` to surface the full day.

This makes the daily injection **idempotent** — hitting it multiple times is safe.

---

## 5. Miss / Carry-Forward Logic

When Iva (DayLogAgent) closes out a day, or at midnight of the *next* day:

```
For each habit_marker WHERE date = yesterday AND status = 'pending':
  UPDATE habit_markers SET status = 'missed'
  (no carry-forward — habits that are missed just break the streak)

For each recurring_marker WHERE date = yesterday AND status = 'pending':
  UPDATE recurring_markers SET status = 'missed'
  INSERT tasks (carried_from_id = recurring_marker.id, ...) as new task
  UPDATE recurring_markers SET spawned_task_id = new_task.id
```

---

## 6. Execution Phases

### Phase 1 — Schema & Migration

**Files**: `lib/db/models.ts`

1. Add `habits`, `recurring_tasks`, `habit_markers`, `recurring_markers` table definitions.
2. Remove `habit` and `recurring` from `projects.type` enum (breaking change — handle with migration).
3. Add `UNIQUE` indexes on `(habit_id, date)` and `(recurring_task_id, date)`.
4. Export new inferred types.
5. Run `npx dotenv-cli -e .env.local -- npx drizzle-kit push`.

> **Data Migration**: Existing `projects` rows with `type = 'habit'` → migrate to `habits`. Their child `tasks` rows become the initial `estimate_min` source, then are archived.

---

### Phase 2 — Data Access Layer (DAL)

**Files**: `lib/storage.ts`

New functions to add:

```ts
// Habits
createHabit(data: NewHabit): Promise<Habit>
listActiveHabits(userId: string): Promise<Habit[]>
archiveHabit(habitId: string): Promise<void>
updateHabit(habitId: string, patch: Partial<Habit>): Promise<Habit>

// Recurring Tasks
createRecurringTask(data: NewRecurringTask): Promise<RecurringTask>
listActiveRecurringTasks(userId: string): Promise<RecurringTask[]>
archiveRecurringTask(id: string): Promise<void>

// Habit Markers
ensureHabitMarkersForDate(userId: string, date: number): Promise<void>  // idempotent injector
markHabit(habitId: string, date: number, status: 'done'|'missed'|'skipped'): Promise<HabitMarker>
getHabitMarkersInRange(userId: string, habitId: string, from: number, to: number): Promise<HabitMarker[]>
computeHabitStreak(userId: string, habitId: string): Promise<{ current: number, best: number, rate7d: number }>

// Recurring Markers
ensureRecurringMarkersForDate(userId: string, date: number): Promise<void>
markRecurring(recurringTaskId: string, date: number, status: 'done'|'missed'|'carried'): Promise<RecurringMarker>
spawnCarryForwardTask(marker: RecurringMarker): Promise<Task>  // creates a task in tasks table

// Combined daily view
getDailyHabitBlocks(userId: string, date: number): Promise<DailyHabitBlock[]>  // for Juno
```

---

### Phase 3 — Scheduling Engine Integration

**Files**: `lib/scheduling/capacity.ts`, `lib/scheduling/generator.ts`

- `buildCapacityMap` currently calls `getRecurringTasksForUser`. Replace this with a query against the new `habits` + `recurring_tasks` tables to project reserved minutes for each active day.
- The `batchGenerateSchedule` should treat habits as **immovable blocks** (highest priority, always slot them first at the user's preferred morning time before fitting project tasks).

---

### Phase 4 — Nova's Tools

**Files**: `tools/projects.ts` → new `tools/habits.ts`, `tools/recurring.ts`

New agent tools for Nova:

```ts
// habits.ts
create_habit      → createHabit()
list_habits       → listActiveHabits()
archive_habit     → archiveHabit()
get_habit_streak  → computeHabitStreak()

// recurring.ts
create_recurring_task  → createRecurringTask()
list_recurring_tasks   → listActiveRecurringTasks()
archive_recurring_task → archiveRecurringTask()
```

Remove `habit` and `recurring` from `createProject` tool enum.

---

### Phase 5 — Juno's Daily Agenda

**Files**: `tools/planner.ts`

- `show_today_agenda` handler: after loading `day_plan` blocks, also call `getDailyHabitBlocks(userId, today)` and merge the results. Habits are shown with a ✦ prefix and their marker status.
- New tool: `mark_habit(habitId, status)` — allows Juno to mark a habit done/skipped for today when the user says "I did DSA today".
- New tool: `mark_recurring(recurringTaskId, status)`.

---

### Phase 6 — UI Components

New components needed:

1. **`HabitCard`** — Shown in the sidebar or home view. Displays name, current streak (🔥 N days), today's status indicator (⬜ pending / ✅ done / ❌ missed).
2. **`HabitStreakGraph`** — A 30-day heatmap (GitHub-style) showing completion over time.
3. **`RecurringTaskCard`** — Similar to HabitCard but shows the next fire date and last completed date.
4. **`HabitsSection`** — A dedicated section on the dashboard (alongside "Projects" and "ToDo") showing all active habits.

---

### Phase 7 — Day-Close / Midnight Cron

**Files**: `app/api/cron/day-close/route.ts` (new)

A cron endpoint (can be triggered by Vercel Cron or called by Iva at EOD):

1. `ensureHabitMarkersForDate(userId, today)` — seeds today's pending markers.
2. Mark all `habit_markers` from *yesterday* still at `pending` → `missed`.
3. Mark all `recurring_markers` from *yesterday* still at `pending` → `missed` + spawn carry-forward tasks.
4. Update `day_logs` with habit/recurring stats (new columns: `habitsCompleted`, `habitsMissed`, `recurringsCompleted`, `recurringsMissed`).

---

## 7. Breaking Changes & Risks

| Risk | Mitigation |
|---|---|
| Existing `habit`/`recurring` projects + tasks in DB | Write a one-time migration script in Phase 1 that reads and transforms them before removing the enum values. |
| `capacity.ts` calls `getRecurringTasksForUser` | Replace in Phase 3; old function can stay for compatibility until all callers updated. |
| `show_today_agenda` changes output shape | Juno's agent tests should be re-run after Phase 5. |
| Streak computation on large date ranges | Add `idx_habit_markers_habit_date` index; compute streak with a descending scan and early-exit. |

---

## 8. File Change Summary

| File | Change |
|---|---|
| `lib/db/models.ts` | Add 4 new tables; update enum; add new exported types |
| `lib/storage.ts` | Add ~15 new CRUD + query functions |
| `lib/scheduling/capacity.ts` | Update to query new tables for capacity projection |
| `lib/scheduling/generator.ts` | Treat habits as immovable fixed blocks |
| `tools/projects.ts` | Remove `habit`/`recurring` from `createProject` enum |
| `tools/habits.ts` | **NEW** — Nova's habit management tools |
| `tools/recurring.ts` | **NEW** — Nova's recurring task tools |
| `tools/planner.ts` | Update `show_today_agenda`; add `mark_habit`, `mark_recurring` tools |
| `tools/tool.ts` | Register new tool files in Nova's tool set |
| `app/api/cron/day-close/route.ts` | **NEW** — Day-close cron endpoint |
| `components/habits/HabitCard.tsx` | **NEW** |
| `components/habits/HabitStreakGraph.tsx` | **NEW** |
| `components/recurring/RecurringTaskCard.tsx` | **NEW** |

---

## 9. Recommended Execution Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 7 → Phase 5 → Phase 6
  (schema)  (DAL)   (scheduler) (nova)   (cron)   (juno)    (UI)
```

Phases 3–5 can be partially parallelized after Phase 2 is complete.
