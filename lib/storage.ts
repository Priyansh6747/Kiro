/**
 * Storage module — all database access for Kiro lives here.
 *
 * Route handlers MUST NOT contain raw SQL or direct Drizzle calls;
 * they go through functions exported from this module.
 */

import { revalidateTag, cacheTag, cacheLife } from "next/cache";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNull,
  lte,
  or,
  sql,
  ne,
} from "drizzle-orm";
import { db } from "./db/client";
import {
  type DayLog,
  dayLogs,
  type MemoryBaseline,
  memoryBaseline,
  type NewDayLog,
  type NewMemoryBaseline,
  type NewPreference,
  type NewProject,
  type NewTask,
  type NewUser,
  type Preference,
  type Project,
  preferences,
  projects,
  type Task,
  taskClosure,
  taskDependencies,
  tasks,
  type User,
  users,
  dayPlan,
  type DayPlan,
  type NewDayPlan,
} from "./db/models";
import { nowSec } from "./utils";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function findUserById(id: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function createUser(data: NewUser): Promise<User> {
  const rows = await db.insert(users).values(data).returning();
  return rows[0];
}

export async function updateUser(
  id: string,
  data: Partial<
    Pick<User, "email" | "username" | "name" | "avatarUrl" | "updatedAt">
  >,
): Promise<User | undefined> {
  const rows = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  return rows[0];
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function findPrefsByUserId(
  userId: string,
): Promise<Preference | undefined> {
  const rows = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, userId))
    .limit(1);
  return rows[0];
}

export async function createPreferences(
  data: NewPreference,
): Promise<Preference> {
  const rows = await db.insert(preferences).values(data).returning();
  return rows[0];
}

/**
 * Returns the user's preference row, creating one with default values if it
 * doesn't exist yet. Use this instead of `findPrefsByUserId` in routes so that
 * a missing row is never treated as an error — defaults apply until the user
 * visits the Settings page and customises their preferences.
 *
 * If the user row doesn't exist yet in the DB (e.g. the Clerk `user.created`
 * webhook hasn't fired yet), the insert would fail with a FOREIGN KEY
 * constraint error. In that case we return an **in-memory** default object so
 * the app keeps working; the real row will be persisted once the webhook runs.
 */
export async function getOrCreatePreferences(
  userId: string,
): Promise<Preference> {
  const existing = await findPrefsByUserId(userId);
  if (existing) return existing;

  const now = nowSec();
  const defaults = {
    id: crypto.randomUUID(),
    userId,
    timezone: "UTC",
    defaultAvailableMin: 240,
    ratioMode: "cumulative" as const,
    morningNudgeTime: "08:00",
    createdAt: now,
    updatedAt: now,
  };

  try {
    return await createPreferences(defaults);
  } catch (err) {
    // The user row doesn't exist yet (FK constraint). Return an in-memory
    // default so the request can still proceed; the row will be persisted
    // once the Clerk webhook syncs the user.
    const errObj =
      err && typeof err === "object" ? (err as Record<string, unknown>) : null;
    const errStr = String(err);
    const causeStr = errObj && "cause" in errObj ? String(errObj.cause) : "";
    const code = errObj && "code" in errObj ? String(errObj.code) : "";

    let causeCode = "";
    if(
      errObj &&
      "cause" in errObj &&
      errObj.cause &&
      typeof errObj.cause === "object"
    ) {
      const causeObj = errObj.cause as Record<string, unknown>;
      if ("code" in causeObj) {
        causeCode = String(causeObj.code);
      }
    }

    const isConstraintError =
      errStr.includes("FOREIGN KEY") ||
      errStr.includes("SQLITE_CONSTRAINT") ||
      causeStr.includes("FOREIGN KEY") ||
      causeStr.includes("SQLITE_CONSTRAINT") ||
      code === "SQLITE_CONSTRAINT" ||
      causeCode === "SQLITE_CONSTRAINT";

    if (isConstraintError) return defaults as Preference;
    throw err;
  }
}

export async function updatePreferences(
  userId: string,
  data: Partial<
    Pick<
      Preference,
      | "timezone"
      | "defaultAvailableMin"
      | "ratioMode"
      | "morningNudgeTime"
      | "updatedAt"
    >
  >,
): Promise<Preference | undefined> {
  const rows = await db
    .update(preferences)
    .set(data)
    .where(eq(preferences.userId, userId))
    .returning();
  return rows[0];
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function listActiveProjects(userId: string): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), isNull(projects.archivedAt)))
    .orderBy(desc(projects.importance), asc(projects.createdAt));
}

export async function findProjectById(
  id: string,
  userId: string,
): Promise<Project | undefined> {
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);
  return rows[0];
}

/** Count of non-default active projects for a user. */
export async function countActiveNonDefaultProjects(
  userId: string,
): Promise<number> {
  const rows = await db
    .select({ cnt: count() })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        isNull(projects.archivedAt),
        eq(projects.isDefault, false),
      ),
    );
  return rows[0]?.cnt ?? 0;
}

export async function createProject(data: NewProject): Promise<Project> {
  const rows = await db.insert(projects).values(data).returning();
  return rows[0];
}

export async function updateProject(
  id: string,
  data: Partial<Pick<Project, "name" | "importance" | "type" | "deadlineAt" | "cadence">>,
): Promise<Project | undefined> {
  const rows = await db
    .update(projects)
    .set(data)
    .where(eq(projects.id, id))
    .returning();
  return rows[0];
}

export async function archiveProject(id: string): Promise<Project | undefined> {
  const rows = await db
    .update(projects)
    .set({ archivedAt: nowSec() })
    .where(eq(projects.id, id))
    .returning();
  return rows[0];
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface ListTasksFilter {
  userId: string;
  projectId?: string;
  date?: number;
  status?: string;
  bucket?: boolean;
  todayDate?: number;
}

export async function listTasks(filter: ListTasksFilter): Promise<Task[]> {
  const conditions = [eq(tasks.userId, filter.userId), isNull(tasks.deletedAt)];

  if (filter.projectId) conditions.push(eq(tasks.projectId, filter.projectId));
  if (filter.date !== undefined)
    conditions.push(eq(tasks.scheduledDate, filter.date));
  if (filter.status)
    conditions.push(eq(tasks.status, filter.status as Task["status"]));
  if (filter.bucket) {
    conditions.push(isNull(tasks.scheduledDate));
    conditions.push(eq(tasks.status, "pending"));
  }

  let rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.createdAt));

  if (filter.bucket && filter.todayDate !== undefined && rows.length > 0) {
    const { inArray } = await import("drizzle-orm");
    const taskIds = rows.map((r) => r.id);

    const deps = await db
      .select({
        taskId: taskDependencies.taskId,
        predecessorStatus: tasks.status,
        predecessorDate: tasks.scheduledDate,
      })
      .from(taskDependencies)
      .innerJoin(tasks, eq(taskDependencies.predecessorId, tasks.id))
      .where(inArray(taskDependencies.taskId, taskIds));

    const blockedTaskIds = new Set<string>();
    for (const d of deps) {
      if (d.predecessorStatus !== "done" && d.predecessorDate !== filter.todayDate) {
        blockedTaskIds.add(d.taskId);
      }
    }

    rows = rows.filter((r) => !blockedTaskIds.has(r.id));
  }

  return rows;
}

export async function findTaskById(
  id: string,
  userId: string,
): Promise<Task | undefined> {
  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(eq(tasks.id, id), eq(tasks.userId, userId), isNull(tasks.deletedAt)),
    )
    .limit(1);
  return rows[0];
}

/** Find task with is_default from its parent project (used in DELETE / carry). */
export async function findTaskWithProject(
  id: string,
  userId: string,
): Promise<(Task & { isDefault: boolean }) | undefined> {
  const rows = await db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      projectId: tasks.projectId,
      parentId: tasks.parentId,
      carriedFromId: tasks.carriedFromId,
      title: tasks.title,
      estimateMin: tasks.estimateMin,
      status: tasks.status,
      scheduledDate: tasks.scheduledDate,
      deadlineAt: tasks.deadlineAt,
      completedAt: tasks.completedAt,
      deletedAt: tasks.deletedAt,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      recurrenceRule: tasks.recurrenceRule,
      recurrenceEndsAt: tasks.recurrenceEndsAt,
      isDefault: projects.isDefault,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function createTask(data: NewTask): Promise<Task> {
  const rows = await db.insert(tasks).values(data).returning();
  return rows[0];
}

export async function updateTask(
  id: string,
  data: Partial<
    Pick<
      Task,
      | "title"
      | "estimateMin"
      | "status"
      | "scheduledDate"
      | "deadlineAt"
      | "completedAt"
      | "deletedAt"
      | "updatedAt"
      | "recurrenceRule"
      | "recurrenceEndsAt"
    >
  >,
): Promise<Task | undefined> {
  const rows = await db
    .update(tasks)
    .set(data)
    .where(eq(tasks.id, id))
    .returning();
  return rows[0];
}

/** Soft-delete: set deleted_at and updated_at. */
export async function softDeleteTask(id: string): Promise<Task | undefined> {
  const now = nowSec();
  return updateTask(id, { deletedAt: now, updatedAt: now });
}

/** List unresolved (pending) tasks for a given day. Includes project.is_default. */
export async function listUnresolvedTasksForDay(
  userId: string,
  date: number,
): Promise<(Task & { isDefault: boolean })[]> {
  return db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      projectId: tasks.projectId,
      parentId: tasks.parentId,
      carriedFromId: tasks.carriedFromId,
      title: tasks.title,
      estimateMin: tasks.estimateMin,
      status: tasks.status,
      scheduledDate: tasks.scheduledDate,
      deadlineAt: tasks.deadlineAt,
      completedAt: tasks.completedAt,
      deletedAt: tasks.deletedAt,
      recurrenceRule: tasks.recurrenceRule,
      recurrenceEndsAt: tasks.recurrenceEndsAt,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      isDefault: projects.isDefault,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.scheduledDate, date),
        eq(tasks.status, "pending"),
        isNull(tasks.deletedAt),
      ),
    );
}

// ---------------------------------------------------------------------------
// Recurring task templates
// ---------------------------------------------------------------------------

export interface RecurringTemplate {
  taskId: string;
  taskTitle: string;
  taskEstimateMin: number;
  taskRecurrenceRule: string;
  taskRecurrenceEndsAt: number | null;
  projectId: string;
  projectCadence: string;
  userId: string;
}

/**
 * Fetch all recurring template tasks (no scheduled_date, has recurrence_rule)
 * for projects with a non-null cadence.
 */
export async function listRecurringTemplateTasks(
  userId: string,
): Promise<RecurringTemplate[]> {
  const rows = await db
    .select({
      taskId: tasks.id,
      taskTitle: tasks.title,
      taskEstimateMin: tasks.estimateMin,
      taskRecurrenceRule: tasks.recurrenceRule,
      taskRecurrenceEndsAt: tasks.recurrenceEndsAt,
      projectId: projects.id,
      projectCadence: projects.cadence,
      userId: tasks.userId,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.scheduledDate),
        isNull(tasks.deletedAt),
        eq(tasks.status, "pending"),
        sql`${tasks.recurrenceRule} IS NOT NULL`,
        sql`${projects.cadence} IS NOT NULL`,
      ),
    );

  return rows.filter((r) => r.taskRecurrenceRule !== null) as RecurringTemplate[];
}

/**
 * Check if a today-instance already exists for a given template task on a date.
 * An instance is identified by carriedFromId = templateTaskId.
 */
export async function findTodayInstanceOfTemplate(
  templateTaskId: string,
  date: number,
): Promise<Task | undefined> {
  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.carriedFromId, templateTaskId),
        eq(tasks.scheduledDate, date),
        isNull(tasks.deletedAt),
      ),
    )
    .limit(1);
  return rows[0];
}

// ---------------------------------------------------------------------------
// Task Closure
// ---------------------------------------------------------------------------

/** Insert the self-reference row (depth 0) for a new task. */
export async function insertTaskClosureSelf(taskId: string): Promise<void> {
  await db
    .insert(taskClosure)
    .values({ ancestorId: taskId, descendantId: taskId, depth: 0 })
    .onConflictDoNothing();
}

/**
 * Propagate all ancestors of `parentId` to `newTaskId` with depth + 1.
 * Run after inserting the self-reference.
 */
export async function propagateTaskClosure(
  newTaskId: string,
  parentId: string,
): Promise<void> {
  // Fetch all ancestor rows of the parent
  const ancestorRows = await db
    .select()
    .from(taskClosure)
    .where(eq(taskClosure.descendantId, parentId));

  if (ancestorRows.length === 0) return;

  await db
    .insert(taskClosure)
    .values(
      ancestorRows.map((row) => ({
        ancestorId: row.ancestorId,
        descendantId: newTaskId,
        depth: row.depth + 1,
      })),
    )
    .onConflictDoNothing();
}

/**
 * Cycle detection: returns true if `potentialAncestor` is already
 * an ancestor of `descendant` in the closure table (i.e. adding an edge
 * potentialAncestor → descendant would create a cycle).
 */
export async function isCyclicDependency(
  potentialAncestor: string,
  descendant: string,
): Promise<boolean> {
  const rows = await db
    .select({ v: sql<number>`1` })
    .from(taskClosure)
    .where(
      and(
        eq(taskClosure.ancestorId, potentialAncestor),
        eq(taskClosure.descendantId, descendant),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Task Dependencies
// ---------------------------------------------------------------------------

export async function insertTaskDependency(
  taskId: string,
  predecessorId: string,
): Promise<void> {
  await db
    .insert(taskDependencies)
    .values({ taskId, predecessorId, createdAt: nowSec() })
    .onConflictDoNothing();
}

export async function deleteTaskDependency(
  taskId: string,
  predecessorId: string,
): Promise<void> {
  await db
    .delete(taskDependencies)
    .where(
      and(
        eq(taskDependencies.taskId, taskId),
        eq(taskDependencies.predecessorId, predecessorId),
      ),
    );
}

export async function listTaskDependenciesForProject(
  projectId: string,
): Promise<{ taskId: string; predecessorId: string }[]> {
  return db
    .select({
      taskId: taskDependencies.taskId,
      predecessorId: taskDependencies.predecessorId,
    })
    .from(taskDependencies)
    .innerJoin(tasks, eq(taskDependencies.taskId, tasks.id))
    .where(eq(tasks.projectId, projectId));
}

// ---------------------------------------------------------------------------
// Day Logs
// ---------------------------------------------------------------------------

export async function listDayLogs(
  userId: string,
  from: number,
  to: number,
): Promise<DayLog[]> {
  return db
    .select()
    .from(dayLogs)
    .where(
      and(
        eq(dayLogs.userId, userId),
        gte(dayLogs.date, from),
        lte(dayLogs.date, to),
      ),
    )
    .orderBy(desc(dayLogs.date));
}

async function fetchDayLogFromDB(
  userId: string,
  date: number,
): Promise<DayLog | undefined> {
  const rows = await db
    .select()
    .from(dayLogs)
    .where(and(eq(dayLogs.userId, userId), eq(dayLogs.date, date)))
    .limit(1);
  return rows[0];
}

async function getCachedDayLog(
  userId: string,
  date: number,
): Promise<DayLog | undefined> {
  "use cache";
  const today = Math.floor(Date.now() / 86400000);
  // @ts-expect-error Types might not be fully generated yet
  cacheLife(date < today - 1 ? "archive" : "yesterday");
  cacheTag(`daylog-${userId}-${date}`);
  return fetchDayLogFromDB(userId, date);
}

export async function findDayLog(
  userId: string,
  date: number,
): Promise<DayLog | undefined> {
  const today = Math.floor(Date.now() / 86400000);
  if (date >= today) {
    return fetchDayLogFromDB(userId, date);
  }
  return getCachedDayLog(userId, date);
}

/**
 * Upsert a day log row. Because the schema only has a regular index on
 * (user_id, date), we do a manual select → insert or update.
 */
export async function upsertDayLog(
  data: Omit<NewDayLog, "id"> & { id: string },
): Promise<DayLog> {
  const existing = await findDayLog(data.userId, data.date);
  if (existing) {
    const rows = await db
      .update(dayLogs)
      .set({
        availableMin: data.availableMin,
        tasksAssigned: data.tasksAssigned,
        updatedAt: data.updatedAt,
      })
      .where(and(eq(dayLogs.userId, data.userId), eq(dayLogs.date, data.date)))
      .returning();
    revalidateTag(`daylog-${data.userId}-${data.date}`, "yesterday");
    return rows[0];
  }

  const rows = await db.insert(dayLogs).values(data).returning();
  revalidateTag(`daylog-${data.userId}-${data.date}`, "yesterday");
  return rows[0];
}

export async function updateDayLog(
  userId: string,
  date: number,
  data: Partial<
    Pick<
      DayLog,
      | "dayType"
      | "tasksCompleted"
      | "tasksMissed"
      | "tasksCarried"
      | "ratio"
      | "updatedAt"
    >
  >,
): Promise<DayLog | undefined> {
  const rows = await db
    .update(dayLogs)
    .set(data)
    .where(and(eq(dayLogs.userId, userId), eq(dayLogs.date, date)))
    .returning();
  revalidateTag(`daylog-${userId}-${date}`, "yesterday");
  return rows[0];
}

export async function syncDayLogStats(userId: string, date: number): Promise<void> {
  const log = await findDayLog(userId, date);
  if (!log) return;

  const tasksForDay = await listTasks({ userId, date });
  const completed = tasksForDay.filter(t => t.status === "done").length;
  const missed = tasksForDay.filter(t => t.status === "missed" || t.status === "carried").length;
  // ratio is against tasksAssigned which was locked in at the time of confirmDay
  const ratio = log.tasksAssigned > 0 ? completed / log.tasksAssigned : 0.0;

  await updateDayLog(userId, date, {
    tasksCompleted: completed,
    tasksMissed: missed,
    ratio: Math.min(ratio, 1.0),
    updatedAt: Math.floor(Date.now() / 1000)
  });
}

/** Count tasks by status for a given day (used in carry route). */
export async function countTasksByStatusForDay(
  userId: string,
  date: number,
): Promise<{ done: number; missed: number; carried: number }> {
  const rows = await db
    .select({ status: tasks.status, cnt: count() })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.scheduledDate, date),
        isNull(tasks.deletedAt),
        or(
          eq(tasks.status, "done"),
          eq(tasks.status, "missed"),
          eq(tasks.status, "carried"),
        ),
      ),
    )
    .groupBy(tasks.status);

  const result = { done: 0, missed: 0, carried: 0 };
  for (const row of rows) {
    if (row.status === "done") result.done = row.cnt;
    if (row.status === "missed") result.missed = row.cnt;
    if (row.status === "carried") result.carried = row.cnt;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Memory Baseline
// ---------------------------------------------------------------------------

/** Returns all distinct user IDs that have at least one day log. */
export async function listDistinctUserIds(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ userId: dayLogs.userId })
    .from(dayLogs);
  return rows.map((r) => r.userId);
}

/** Fetch the last N normal day logs for a user (ordered newest first). */
export async function listNormalDayLogs(
  userId: string,
  from: number,
  to: number,
): Promise<DayLog[]> {
  return db
    .select()
    .from(dayLogs)
    .where(
      and(
        eq(dayLogs.userId, userId),
        gte(dayLogs.date, from),
        lte(dayLogs.date, to),
        eq(dayLogs.dayType, "normal"),
      ),
    )
    .orderBy(desc(dayLogs.date));
}

export async function insertMemoryBaseline(
  data: NewMemoryBaseline,
): Promise<MemoryBaseline> {
  const rows = await db.insert(memoryBaseline).values(data).returning();
  return rows[0];
}

// ---------------------------------------------------------------------------
// Generation helpers
// ---------------------------------------------------------------------------

/** Returns the MAX(updated_at) across all tasks for a user. */
export async function latestTaskUpdateSec(
  userId: string,
): Promise<number | null> {
  const rows = await db
    .select({ maxUpdatedAt: sql<number | null>`MAX(${tasks.updatedAt})` })
    .from(tasks)
    .where(eq(tasks.userId, userId));
  return rows[0]?.maxUpdatedAt ?? null;
}

/** Returns MAX(updated_at) for tasks scheduled on a specific date. */
export async function latestTaskUpdateForDay(
  userId: string,
  date: number,
): Promise<number | null> {
  const rows = await db
    .select({ maxUpdatedAt: sql<number | null>`MAX(${tasks.updatedAt})` })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.scheduledDate, date),
        isNull(tasks.deletedAt),
      ),
    );
  return rows[0]?.maxUpdatedAt ?? null;
}

/**
 * Fetch active projects with last-completed task time and today's task count.
 * Used by the morning nudge generation.
 */
export async function listProjectsWithStats(
  userId: string,
  todayDate: number,
): Promise<
  Array<{
    id: string;
    name: string;
    importance: number;
    type: string;
    deadlineAt: number | null;
    archivedAt: number | null;
    lastCompletedAt: number | null;
    todayCount: number;
  }>
> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      importance: projects.importance,
      type: projects.type,
      deadlineAt: projects.deadlineAt,
      archivedAt: projects.archivedAt,
      lastCompletedAt: sql<
        number | null
      >`MAX(CASE WHEN ${tasks.completedAt} IS NOT NULL THEN ${tasks.completedAt} END)`,
      todayCount: sql<number>`COUNT(CASE WHEN ${tasks.scheduledDate} = ${todayDate} THEN 1 END)`,
    })
    .from(projects)
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(and(eq(projects.userId, userId), isNull(projects.archivedAt)))
    .groupBy(projects.id);

  return rows as Array<{
    id: string;
    name: string;
    importance: number;
    type: string;
    deadlineAt: number | null;
    archivedAt: number | null;
    lastCompletedAt: number | null;
    todayCount: number;
  }>;
}

// ---------------------------------------------------------------------------
// Day Plan (Timeline Blocks)
// ---------------------------------------------------------------------------

export class OverlapConflictError extends Error {
  constructor() {
    super("OVERLAP_CONFLICT");
    this.name = "OverlapConflictError";
  }
}

export async function checkOverlap(
  userId: string,
  planDate: number,
  startTime: number,
  estimateMin: number,
  excludeTaskId?: string
): Promise<boolean> {
  const blocks = await db
    .select({
      taskId: dayPlan.taskId,
      startTime: dayPlan.startTime,
      estimateMin: tasks.estimateMin,
    })
    .from(dayPlan)
    .innerJoin(tasks, eq(tasks.id, dayPlan.taskId))
    .where(
      and(
        eq(dayPlan.userId, userId),
        eq(dayPlan.planDate, planDate),
        excludeTaskId ? ne(dayPlan.taskId, excludeTaskId) : undefined
      )
    );

  const newEnd = startTime + estimateMin * 60;

  return blocks.some((block) => {
    const blockEnd = block.startTime + block.estimateMin * 60;
    return startTime < blockEnd && newEnd > block.startTime;
  });
}

export async function placeDayPlanBlock(
  userId: string,
  taskId: string,
  planDate: number,
  startTime: number
): Promise<void> {
  const task = await findTaskById(taskId, userId);
  if (!task) throw new Error("Task not found");

  const hasOverlap = await checkOverlap(
    userId,
    planDate,
    startTime,
    task.estimateMin,
    taskId
  );

  if (hasOverlap) throw new OverlapConflictError();

  await db
    .insert(dayPlan)
    .values({
      userId,
      taskId,
      planDate,
      startTime,
      createdAt: nowSec(),
      updatedAt: nowSec(),
    })
    .onConflictDoUpdate({
      target: [dayPlan.userId, dayPlan.taskId],
      set: { startTime, planDate, updatedAt: nowSec() },
    });
}

export async function listDayPlansForDate(
  userId: string,
  planDate: number
): Promise<DayPlan[]> {
  return db
    .select()
    .from(dayPlan)
    .where(and(eq(dayPlan.userId, userId), eq(dayPlan.planDate, planDate)))
    .orderBy(asc(dayPlan.startTime));
}
