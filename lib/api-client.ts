// ── Thin API client wrapping native fetch ─────────────────────────────────────
// All functions throw on non-2xx responses.

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? `HTTP ${res.status}`);
  }
  return json.data as T;
}

// ── Planner ───────────────────────────────────────────────────────────────────

export const getTodayPlan = (date?: number) => {
  const sp = new URLSearchParams();
  if (date != null) sp.set("date", String(date));
  const query = sp.toString() ? `?${sp.toString()}` : "";
  return request<import("./types").TodayPlannerData>(
    `/api/planner/today${query}`,
  );
};

export const confirmDay = (availableMin?: number) =>
  request<import("./types").DayLog>("/api/planner/today/confirm", {
    method: "POST",
    body:
      availableMin != null
        ? JSON.stringify({ available_min: availableMin })
        : "{}",
  });

export const carryTasks = (toCarry: string[], toDrop: string[]) =>
  request<{ carried: string[]; dropped: string[] }>("/api/planner/carry", {
    method: "POST",
    body: JSON.stringify({
      task_ids_to_carry: toCarry,
      task_ids_to_drop: toDrop,
    }),
  });

export const placeDayPlanBlock = (
  taskId: string,
  planDate: number,
  startTime: number,
) =>
  request<"ok">("/api/planner/day-plan", {
    method: "POST",
    body: JSON.stringify({
      task_id: taskId,
      plan_date: planDate,
      start_time: startTime,
    }),
  });

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const listTasks = (params: {
  project_id?: string;
  date?: number;
  status?: string;
  bucket?: boolean;
}) => {
  const sp = new URLSearchParams();
  if (params.project_id) sp.set("project_id", params.project_id);
  if (params.date != null) sp.set("date", String(params.date));
  if (params.status) sp.set("status", params.status);
  if (params.bucket) sp.set("bucket", "true");
  return request<import("./types").Task[]>(`/api/tasks?${sp.toString()}`);
};

export const createTask = (body: {
  project_id: string;
  title: string;
  estimate_min?: number;
  scheduled_date?: number | null;
  deadline_at?: number | null;
  parent_id?: string;
  recurrence_rule?: string | null;
  recurrence_ends_at?: number | null;
  predecessor_id?: string;
}) =>
  request<import("./types").Task>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const ingestTasks = (body: {
  project_id: string;
  tasks: any[];
  scheduled_date?: number | null;
}) =>
  request<import("./types").Task[]>("/api/tasks/ingest", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateTask = (
  id: string,
  body: Partial<{
    title: string;
    estimate_min: number;
    status: import("./types").TaskStatus;
    scheduled_date: number | null;
    deadline_at: number | null;
    recurrence_rule: string | null;
    recurrence_ends_at: number | null;
  }>,
) =>
  request<import("./types").Task>(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteTask = (id: string) =>
  request<"ok">(`/api/tasks/${id}`, { method: "DELETE" });

export const addDependency = (taskId: string, predecessorId: string) =>
  request<"ok">(`/api/tasks/${taskId}/dependencies`, {
    method: "POST",
    body: JSON.stringify({ predecessor_id: predecessorId }),
  });

export const deleteDependency = (taskId: string, predecessorId: string) =>
  request<"ok">(`/api/tasks/${taskId}/dependencies/${predecessorId}`, {
    method: "DELETE",
  });

export const getProjectDependencies = (projectId: string) =>
  request<{ taskId: string; predecessorId: string }[]>(
    `/api/projects/${projectId}/dependencies`,
  );

// ── Projects ──────────────────────────────────────────────────────────────────

export const getTodayUsage = () =>
  request<{ dayCost: number; maxCost: number }>("/api/usage/today");

export const listProjects = () =>
  request<import("./types").Project[]>("/api/projects");

export const createProject = (body: {
  name: string;
  importance: number;
  type: import("./types").ProjectType;
  deadline_at?: number | null;
  cadence?: import("./types").Cadence | null;
}) =>
  request<import("./types").Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateProject = (
  id: string,
  body: Partial<{
    name: string;
    importance: number;
    type: import("./types").ProjectType;
    deadline_at: number | null;
    cadence?: import("./types").Cadence | null;
  }>,
) =>
  request<import("./types").Project>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const archiveProject = (id: string) =>
  request<"ok">(`/api/projects/${id}`, { method: "DELETE" });

// ── Preferences ───────────────────────────────────────────────────────────────

export const getPreferences = () =>
  request<import("./types").Preference>("/api/preferences");

export const patchPreferences = (
  body: Partial<{
    timezone: string;
    default_available_min: number;
    ratio_mode: import("./types").RatioMode;
    morning_nudge_time: string;
    streak_threshold: number;
  }>,
) =>
  request<import("./types").Preference>("/api/preferences", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// ── Day Logs ──────────────────────────────────────────────────────────────────

export const listDayLogs = (from?: number, to?: number) => {
  const sp = new URLSearchParams();
  if (from != null) sp.set("from", String(from));
  if (to != null) sp.set("to", String(to));
  return request<import("./types").DayLog[]>(`/api/day-logs?${sp.toString()}`);
};

export const getDayLog = (date: number) =>
  request<import("./types").DayLog>(`/api/day-logs/${date}`);

export const patchDayLog = (date: number, dayType: import("./types").DayType) =>
  request<import("./types").DayLog>(`/api/day-logs/${date}`, {
    method: "PATCH",
    body: JSON.stringify({ day_type: dayType }),
  });

// ── Generation ────────────────────────────────────────────────────────────────

export const generateMorningNudge = () =>
  request<import("./types").MorningNudgeData>("/api/generation/morning-nudge", {
    method: "POST",
  });

export const generateEodSummary = () =>
  request<import("./types").EodSummaryData>("/api/generation/eod-summary", {
    method: "POST",
  });

export const removeDayPlanBlock = (taskId: string) =>
  request<"ok">(`/api/planner/day-plan/${taskId}`, { method: "DELETE" });

// ── Habits & Recurring ────────────────────────────────────────────────────────

export const listHabits = () => request<import("./db/models").Habit[]>("/api/habits");
export const getHabitsDashboard = (from?: number, to?: number) => {
  const sp = new URLSearchParams();
  if (from != null) sp.set("from", String(from));
  if (to != null) sp.set("to", String(to));
  return request<{
    habits: import("./db/models").Habit[];
    streaks: Record<string, { current: number; best: number; rate7d: number }>;
    markers: Record<string, Record<number, string>>;
    recurringTasks: import("./db/models").RecurringTask[];
    recurringStreaks: Record<string, { current: number; best: number; rate7d: number }>;
    recurringMarkers: Record<string, Record<number, string>>;
    today: number;
  }>(`/api/habits/dashboard?${sp.toString()}`);
};
export const createHabit = (data: Partial<import("./db/models").Habit>) => request<import("./db/models").Habit>("/api/habits", { method: "POST", body: JSON.stringify(data) });
export const archiveHabit = (id: string) => request<{ success: boolean }>(`/api/habits/${id}`, { method: "DELETE" });
export const getHabitStreak = (id: string) => request<{ current: number; best: number; rate7d: number }>(`/api/habits/${id}/streak`);
export const getHabitMarkers = (id: string, from: number, to: number) => request<import("./db/models").HabitMarker[]>(`/api/habits/${id}/markers?from=${from}&to=${to}`);

export const listRecurringTasks = () => request<import("./db/models").RecurringTask[]>("/api/recurring");
export const createRecurringTask = (data: Partial<import("./db/models").RecurringTask>) => request<import("./db/models").RecurringTask>("/api/recurring", { method: "POST", body: JSON.stringify(data) });
export const archiveRecurringTask = (id: string) => request<{ success: boolean }>(`/api/recurring/${id}`, { method: "DELETE" });
export const getRecurringMarkers = (id: string, from: number, to: number) => request<import("./db/models").RecurringMarker[]>(`/api/recurring/${id}/markers?from=${from}&to=${to}`);
