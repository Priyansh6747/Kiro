/**
 * Storage module — all database access for Kiro lives here.
 *
 * Route handlers MUST NOT contain raw SQL or direct Drizzle calls;
 * they go through functions exported from this module.
 */

import { and, asc, count, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "./db/client";
import {
  dayLogs,
  memoryBaseline,
  preferences,
  projects,
  taskClosure,
  taskDependencies,
  tasks,
  users,
  type DayLog,
  type MemoryBaseline,
  type NewDayLog,
  type NewMemoryBaseline,
  type NewPreference,
  type NewProject,
  type NewTask,
  type NewUser,
  type Preference,
  type Project,
  type Task,
  type User,
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
  data: Partial<Pick<User, "email" | "username" | "name" | "avatarUrl" | "updatedAt">>,
): Promise<User | undefined> {
  const rows = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return rows[0];
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function findPrefsByUserId(userId: string): Promise<Preference | undefined> {
  const rows = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, userId))
    .limit(1);
  return rows[0];
}

export async function createPreferences(data: NewPreference): Promise<Preference> {
  const rows = await db.insert(preferences).values(data).returning();
  return rows[0];
}

export async function updatePreferences(
  userId: string,
  data: Partial<
    Pick<
      Preference,
      "timezone" | "defaultAvailableMin" | "ratioMode" | "morningNudgeTime" | "updatedAt"
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
export async function countActiveNonDefaultProjects(userId: string): Promise<number> {
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
  data: Partial<Pick<Project, "name" | "importance" | "type" | "deadlineAt">>,
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
}

export async function listTasks(filter: ListTasksFilter): Promise<Task[]> {
  const conditions = [
    eq(tasks.userId, filter.userId),
    isNull(tasks.deletedAt),
  ];

  if (filter.projectId) conditions.push(eq(tasks.projectId, filter.projectId));
  if (filter.date !== undefined) conditions.push(eq(tasks.scheduledDate, filter.date));
  if (filter.status) conditions.push(eq(tasks.status, filter.status as Task["status"]));
  if (filter.bucket) {
    conditions.push(isNull(tasks.scheduledDate));
    conditions.push(eq(tasks.status, "pending"));
  }

  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.createdAt));
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

export async function findDayLog(
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
    return rows[0];
  }

  const rows = await db.insert(dayLogs).values(data).returning();
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
  return rows[0];
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
    if (row.status === "done")    result.done    = row.cnt;
    if (row.status === "missed")  result.missed  = row.cnt;
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
export async function latestTaskUpdateSec(userId: string): Promise<number | null> {
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
      lastCompletedAt: sql<number | null>`MAX(CASE WHEN ${tasks.completedAt} IS NOT NULL THEN ${tasks.completedAt} END)`,
      todayCount: sql<number>`COUNT(CASE WHEN ${tasks.scheduledDate} = ${todayDate} THEN 1 END)`,
    })
    .from(projects)
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(
      and(eq(projects.userId, userId), isNull(projects.archivedAt)),
    )
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
