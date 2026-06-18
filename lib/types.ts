// ── Domain types matching the DB schema ──────────────────────────────────────

export type TaskStatus = "pending" | "done" | "missed" | "carried" | "adjusted" | "deleted";
export type ProjectType = "critical" | "recurring" | "habit" | "nicetohave";
export type RatioMode = "cumulative" | "streak";
export type DayType = "normal" | "adjusted" | "break";
export type Cadence = "daily" | "weekly" | "custom";
/** Recurrence rule: "daily", "weekly", or comma-separated day abbreviations like "MON,THU" */
export type RecurrenceRule = string;

export interface Task {
  id: string;
  userId: string;
  projectId: string;
  parentId: string | null;
  carriedFromId: string | null;
  title: string;
  estimateMin: number;
  status: TaskStatus;
  scheduledDate: number | null; // unix day (null = bucket or recurring template)
  deadlineAt: number | null;    // unix timestamp
  completedAt: number | null;
  deletedAt: number | null;
  /** Recurrence rule: null = one-off, "daily", "weekly", or "MON,THU" etc. */
  recurrenceRule: RecurrenceRule | null;
  /** Until when to recur; null = forever */
  recurrenceEndsAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  importance: number; // 1–5
  type: ProjectType;
  deadlineAt: number | null;
  isDefault: boolean;
  /** cadence: null = no auto-suggest, daily = habit, weekly/custom = recurring */
  cadence: Cadence | null;
  createdAt: number;
  archivedAt: number | null;
}

export interface Preference {
  id: string;
  userId: string;
  timezone: string;
  defaultAvailableMin: number;
  ratioMode: RatioMode;
  morningNudgeTime: string; // HH:MM
  createdAt: number;
  updatedAt: number;
}

export interface DayLog {
  id: string;
  userId: string;
  date: number;
  availableMin: number;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksMissed: number;
  tasksCarried: number;
  ratio: number;
  penalty: number;
  dayType: DayType;
  createdAt: number;
  updatedAt: number;
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface TodayPlannerData {
  date: number;
  tasks: Task[];
  totalEstimatedMin: number;
  availableMin: number;
  overloaded: boolean;
  dayLog: DayLog | null;
}

export interface MorningNudgeData {
  nudge: string;
  projects: Array<{ id: string; name: string; score?: number }>;
}

export interface EodSummaryData {
  summary: string;
  stats: {
    assigned: number;
    completed: number;
    missed: number;
    ratio: number;
    doneTasks: string[];
    missedTasks: string[];
    day_type: string;
  };
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** Convert a JS Date to a unix day integer (days since epoch in UTC). */
export function toUnixDay(date: Date): number {
  return Math.floor(date.getTime() / 86400000);
}

/** Convert a unix day integer back to a JS Date (UTC midnight). */
export function fromUnixDay(day: number): Date {
  return new Date(day * 86400000);
}

/** Format a unix day integer as "Mon, Jun 18". */
export function formatUnixDay(day: number): string {
  return fromUnixDay(day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Format a unix timestamp as a short date string. */
export function formatTimestamp(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Return the current unix day integer in the browser's local timezone. */
export function todayUnixDay(): number {
  const now = new Date();
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(localMidnight.getTime() / 86400000);
}

/** How many minutes as "Xh Ym" or "Ym". */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
