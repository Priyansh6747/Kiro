/**
 * Storage module — all database access for Kiro lives here.
 *
 * Route handlers MUST NOT contain raw SQL or direct Drizzle calls;
 * they go through functions exported from this module.
 */

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { db } from "./db/client";
import {
  type DayLog,
  type DayPlan,
  dayLogs,
  dayPlan,
  habitDayPlan,
  recurringDayPlan,
  type MemoryBaseline,
  memoryBaseline,
  artifacts,
  type Artifact,
  type NewArtifact,
  type NewDayLog,
  type NewDayPlan,
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
  schedulingStrategies,
  type User,
  users,
  habits,
  type Habit,
  type NewHabit,
  recurringTasks,
  type RecurringTask,
  type NewRecurringTask,
  habitMarkers,
  type HabitMarker,
  type NewHabitMarker,
  recurringMarkers,
  type RecurringMarker,
  type NewRecurringMarker,
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
    if (
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
      | "streakThreshold"
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

/** Find an active project by its name (case-insensitive) for a user. */
export async function findProjectByName(
  name: string,
  userId: string,
): Promise<Project | undefined> {
  const rows = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        sql`lower(${projects.name}) = lower(${name})`,
        isNull(projects.archivedAt),
      ),
    )
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

export async function createProject(data: Omit<NewProject, "id" | "createdAt" | "type"> & Partial<NewProject>): Promise<Project> {
  const [project] = await db.insert(projects).values({
    ...data,
    id: data.id || crypto.randomUUID(),
    createdAt: data.createdAt || nowSec(),
    type: data.type || "critical",
  }).returning();
  return project;
}

export async function updateProject(
  id: string,
  data: Partial<
    Pick<Project, "name" | "importance" | "type" | "deadlineAt" | "cadence">
  >,
): Promise<Project | undefined> {
  const rows = await db
    .update(projects)
    .set(data)
    .where(eq(projects.id, id))
    .returning();
  return rows[0];
}

export async function archiveProject(id: string): Promise<Project | undefined> {
  const t = nowSec();
  const rows = await db
    .update(projects)
    .set({ archivedAt: t })
    .where(eq(projects.id, id))
    .returning();
    
  if (rows[0]) {
    await db
      .update(tasks)
      .set({ deletedAt: t, status: "deleted" })
      .where(
        and(
          eq(tasks.projectId, id),
          isNull(tasks.deletedAt),
          inArray(tasks.status, ["pending", "carried"])
        )
      );
  }
  
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
      if (
        d.predecessorStatus !== "done" &&
        d.predecessorDate !== filter.todayDate
      ) {
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

/** Find a non-deleted task by title (case-insensitive), optionally scoped to a project. */
export async function findTaskByTitle(
  title: string,
  userId: string,
  projectId?: string,
): Promise<Task | undefined> {
  const conditions: any[] = [
    eq(tasks.userId, userId),
    isNull(tasks.deletedAt),
    sql`lower(${tasks.title}) = lower(${title})`,
  ];
  if (projectId) conditions.push(eq(tasks.projectId, projectId));
  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
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

export async function createTask(data: Omit<NewTask, "id" | "createdAt" | "updatedAt"> & Partial<NewTask>): Promise<Task> {
  const [task] = await db.insert(tasks).values({
    ...data,
    id: data.id || crypto.randomUUID(),
    createdAt: data.createdAt || nowSec(),
    updatedAt: data.updatedAt || nowSec(),
  }).returning();
  return task;
}

export async function batchCreateTasks(data: (Omit<NewTask, "id" | "createdAt" | "updatedAt"> & Partial<NewTask>)[]): Promise<Task[]> {
  if (data.length === 0) return [];
  const now = nowSec();
  const values = data.map((d) => ({
    ...d,
    id: d.id || crypto.randomUUID(),
    createdAt: d.createdAt || now,
    updatedAt: d.updatedAt || now,
  })) as NewTask[];
  return db.insert(tasks).values(values).returning();
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

/** Auto-reverts pending tasks from past dates back to the bucket for non-default projects */
export async function autoRevertMissedProjectTasks(
  userId: string,
  todayDate: number,
): Promise<void> {
  const pastPending = await db
    .select({ id: tasks.id })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.status, "pending"),
        lte(tasks.scheduledDate, todayDate - 1),
        isNull(tasks.deletedAt),
        eq(projects.isDefault, false),
        isNull(tasks.carriedFromId), // Exclude recurring instances so they go to carry flow
      ),
    );

  if (pastPending.length === 0) return;

  const ids = pastPending.map((t) => t.id);
  await db
    .update(tasks)
    .set({ scheduledDate: null, updatedAt: nowSec() })
    .where(inArray(tasks.id, ids));
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

  return rows.filter(
    (r) => r.taskRecurrenceRule !== null,
  ) as RecurringTemplate[];
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

export async function batchInsertTaskClosures(
  data: { ancestorId: string; descendantId: string; depth: number }[],
): Promise<void> {
  if (data.length === 0) return;
  
  // SQLite has a limit on the number of variables in a single query (usually 32766 or 999).
  // We can chunk the inserts just to be safe.
  const chunkSize = 1000;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await db.insert(taskClosure).values(chunk).onConflictDoNothing();
  }
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

export async function batchInsertTaskDependencies(
  data: { taskId: string; predecessorId: string }[],
): Promise<void> {
  if (data.length === 0) return;
  const now = nowSec();
  const values = data.map((d) => ({ ...d, createdAt: now }));
  
  const chunkSize = 1000;
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    await db.insert(taskDependencies).values(chunk).onConflictDoNothing();
  }
}

export async function pullUnresolvedPredecessors(
  startTaskId: string,
  scheduledDate: number,
  userId: string,
) {
  let currentTasks = [startTaskId];
  const seen = new Set<string>();

  while (currentTasks.length > 0) {
    const deps = await db
      .select({ predecessorId: taskDependencies.predecessorId })
      .from(taskDependencies)
      .where(inArray(taskDependencies.taskId, currentTasks));

    const predIds = deps
      .map((d) => d.predecessorId)
      .filter((id) => !seen.has(id));
    if (predIds.length === 0) break;

    for (const id of predIds) seen.add(id);

    const pendingPreds = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          inArray(tasks.id, predIds),
          eq(tasks.userId, userId),
          ne(tasks.status, "done"),
          ne(tasks.status, "deleted"),
        ),
      );

    const pendingIds = pendingPreds.map((p) => p.id);
    if (pendingIds.length === 0) break;

    await db
      .update(tasks)
      .set({ scheduledDate, updatedAt: nowSec() })
      .where(inArray(tasks.id, pendingIds));

    currentTasks = pendingIds;
  }
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

export async function listTaskDependenciesForTasks(
  taskIds: string[],
): Promise<{ taskId: string; predecessorId: string }[]> {
  if (taskIds.length === 0) return [];
  return db
    .select({
      taskId: taskDependencies.taskId,
      predecessorId: taskDependencies.predecessorId,
    })
    .from(taskDependencies)
    .where(
      or(
        inArray(taskDependencies.taskId, taskIds),
        inArray(taskDependencies.predecessorId, taskIds),
      ),
    );
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
      | "habitsCompleted"
      | "habitsMissed"
      | "recurringsCompleted"
      | "recurringsMissed"
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

export async function syncDayLogStats(
  userId: string,
  date: number,
): Promise<void> {
  const log = await findDayLog(userId, date);
  if (!log) return;

  const tasksForDay = await listTasks({ userId, date });
  const completed = tasksForDay.filter((t) => t.status === "done").length;
  const carried = tasksForDay.filter((t) => t.status === "carried").length;
  const explicitMissed = tasksForDay.filter(
    (t) => t.status === "missed",
  ).length;

  // Tasks that were reverted to the bucket lose their scheduledDate and thus disappear from tasksForDay.
  // To ensure they are still counted as missed against the day's original commitment, we use Math.max.
  const missed = Math.max(
    explicitMissed,
    log.tasksAssigned - completed - carried,
  );

  // ratio is against tasksAssigned which was locked in at the time of confirmDay
  const ratio = log.tasksAssigned > 0 ? completed / log.tasksAssigned : 0.0;

  const habitsStats = await db
    .select({ status: habitMarkers.status, count: sql<number>`count(*)` })
    .from(habitMarkers)
    .where(and(eq(habitMarkers.userId, userId), eq(habitMarkers.date, date)))
    .groupBy(habitMarkers.status);

  const recStats = await db
    .select({ status: recurringMarkers.status, count: sql<number>`count(*)` })
    .from(recurringMarkers)
    .where(and(eq(recurringMarkers.userId, userId), eq(recurringMarkers.date, date)))
    .groupBy(recurringMarkers.status);

  const habitsCompleted = habitsStats.find((s) => s.status === "done")?.count || 0;
  const habitsMissedCount = (habitsStats.find((s) => s.status === "missed")?.count || 0) + 
                            (habitsStats.find((s) => s.status === "pending")?.count || 0);

  const recurringsCompleted = recStats.find((s) => s.status === "done")?.count || 0;
  const recurringsMissedCount = (recStats.find((s) => s.status === "missed")?.count || 0) + 
                                (recStats.find((s) => s.status === "pending")?.count || 0);

  await updateDayLog(userId, date, {
    tasksCompleted: completed,
    tasksMissed: missed,
    tasksCarried: carried,
    habitsCompleted,
    habitsMissed: habitsMissedCount,
    recurringsCompleted,
    recurringsMissed: recurringsMissedCount,
    ratio: Math.min(ratio, 1.0),
    updatedAt: nowSec(),
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
  excludeTaskId?: string,
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
        excludeTaskId ? ne(dayPlan.taskId, excludeTaskId) : undefined,
      ),
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
  startTime: number,
): Promise<void> {
  const task = await findTaskById(taskId, userId);
  if (!task) throw new Error("Task not found");

  const hasOverlap = await checkOverlap(
    userId,
    planDate,
    startTime,
    task.estimateMin,
    taskId,
  );

  if (hasOverlap) throw new OverlapConflictError();

  await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(dayPlan)
      .where(and(eq(dayPlan.userId, userId), eq(dayPlan.taskId, taskId)))
      .limit(1);

    if (existing.length > 0) {
      const e = existing[0];
      await tx
        .delete(dayPlan)
        .where(and(eq(dayPlan.userId, userId), eq(dayPlan.taskId, taskId)));
      
      await tx.insert(dayPlan).values({
        ...e,
        planDate,
        startTime,
        updatedAt: nowSec(),
      });
    } else {
      await tx.insert(dayPlan).values({
        userId,
        taskId,
        planDate,
        startTime,
        createdAt: nowSec(),
        updatedAt: nowSec(),
      });
    }
  });
}

export async function listDayPlansForDate(
  userId: string,
  planDate: number,
): Promise<DayPlan[]> {
  return db
    .select()
    .from(dayPlan)
    .where(and(eq(dayPlan.userId, userId), eq(dayPlan.planDate, planDate)))
    .orderBy(asc(dayPlan.startTime));
}

export async function removeDayPlanBlock(
  userId: string,
  taskId: string,
): Promise<void> {
  await db
    .delete(dayPlan)
    .where(and(eq(dayPlan.userId, userId), eq(dayPlan.taskId, taskId)));
}

export async function removeDayPlanBlockForDate(
  userId: string,
  taskId: string,
  planDate: number,
): Promise<void> {
  await db
    .delete(dayPlan)
    .where(and(eq(dayPlan.userId, userId), eq(dayPlan.taskId, taskId), eq(dayPlan.planDate, planDate)));
}

export async function placeHabitDayPlanBlock(
  userId: string,
  habitId: string,
  planDate: number,
  startTime: number,
): Promise<void> {
  await db
    .insert(habitDayPlan)
    .values({
      userId,
      habitId,
      planDate,
      startTime,
      createdAt: nowSec(),
      updatedAt: nowSec(),
    })
    .onConflictDoUpdate({
      target: [habitDayPlan.userId, habitDayPlan.habitId, habitDayPlan.planDate],
      set: { startTime, updatedAt: nowSec() },
    });
}

export async function removeHabitDayPlanBlock(
  userId: string,
  habitId: string,
  planDate: number,
): Promise<void> {
  await db
    .delete(habitDayPlan)
    .where(
      and(
        eq(habitDayPlan.userId, userId),
        eq(habitDayPlan.habitId, habitId),
        eq(habitDayPlan.planDate, planDate)
      )
    );
}

export async function listHabitDayPlansForDate(
  userId: string,
  planDate: number,
) {
  return db
    .select()
    .from(habitDayPlan)
    .where(and(eq(habitDayPlan.userId, userId), eq(habitDayPlan.planDate, planDate)));
}

export async function placeRecurringDayPlanBlock(
  userId: string,
  recurringTaskId: string,
  planDate: number,
  startTime: number,
): Promise<void> {
  await db
    .insert(recurringDayPlan)
    .values({
      userId,
      recurringTaskId,
      planDate,
      startTime,
      createdAt: nowSec(),
      updatedAt: nowSec(),
    })
    .onConflictDoUpdate({
      target: [recurringDayPlan.userId, recurringDayPlan.recurringTaskId, recurringDayPlan.planDate],
      set: { startTime, updatedAt: nowSec() },
    });
}

export async function removeRecurringDayPlanBlock(
  userId: string,
  recurringTaskId: string,
  planDate: number,
): Promise<void> {
  await db
    .delete(recurringDayPlan)
    .where(
      and(
        eq(recurringDayPlan.userId, userId),
        eq(recurringDayPlan.recurringTaskId, recurringTaskId),
        eq(recurringDayPlan.planDate, planDate)
      )
    );
}

export async function listRecurringDayPlansForDate(
  userId: string,
  planDate: number,
) {
  return db
    .select()
    .from(recurringDayPlan)
    .where(and(eq(recurringDayPlan.userId, userId), eq(recurringDayPlan.planDate, planDate)));
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export async function createArtifact(data: Omit<NewArtifact, "id" | "createdAt" | "updatedAt"> & Partial<NewArtifact>): Promise<Artifact> {
  const [artifact] = await db.insert(artifacts).values({
    ...data,
    id: data.id || crypto.randomUUID(),
    createdAt: data.createdAt || nowSec(),
    updatedAt: data.updatedAt || nowSec(),
  }).returning();
  return artifact;
}

export async function getArtifactById(id: string): Promise<Artifact | undefined> {
  const rows = await db.select().from(artifacts).where(eq(artifacts.id, id)).limit(1);
  return rows[0];
}

export async function getArtifactsByUser(userId: string, type?: string): Promise<Artifact[]> {
  let query = db.select().from(artifacts).where(eq(artifacts.userId, userId));
  if (type) {
    query = db.select().from(artifacts).where(and(eq(artifacts.userId, userId), eq(artifacts.type, type)));
  }
  return query.orderBy(desc(artifacts.createdAt));
}

export async function updateArtifact(
  id: string,
  patch: Partial<Pick<Artifact, "content" | "type" | "projectId">>
): Promise<Artifact> {
  const [updated] = await db
    .update(artifacts)
    .set({ ...patch, updatedAt: nowSec() })
    .where(eq(artifacts.id, id))
    .returning();
  return updated;
}

// ---------------------------------------------------------------------------
// Scheduling Module (Phases 1-5)
// ---------------------------------------------------------------------------

export async function getDayPlanRowsForDateRange(userId: string, fromDate: number, toDate: number, excludeTaskId: string) {
  return db
    .select()
    .from(dayPlan)
    .where(
      and(
        eq(dayPlan.userId, userId),
        ne(dayPlan.taskId, excludeTaskId),
        gte(dayPlan.planDate, fromDate),
        lte(dayPlan.planDate, toDate)
      )
    );
}

export async function getRecurringTasksForUser(userId: string, excludeTaskId?: string) {
  // Query both habits and recurring tasks, returning uniform format for capacity projection
  const userHabits = await db
    .select({
      id: habits.id,
      estimateMin: habits.estimateMin,
      recurrenceRule: sql<string | null>`NULL`,
      recurrenceEndsAt: sql<number | null>`NULL`,
      cadence: habits.cadence,
      projectType: sql<string>`'habit'`,
      scheduledDate: sql<number | null>`NULL`,
      activeDays: habits.activeDays,
    })
    .from(habits)
    .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)));

  const userRecurring = await db
    .select({
      id: recurringTasks.id,
      estimateMin: recurringTasks.estimateMin,
      recurrenceRule: recurringTasks.recurrenceRule,
      recurrenceEndsAt: recurringTasks.recurrenceEndsAt,
      cadence: recurringTasks.cadence,
      projectType: sql<string>`'recurring'`,
      scheduledDate: sql<number | null>`NULL`,
      activeDays: recurringTasks.activeDays,
    })
    .from(recurringTasks)
    .where(and(eq(recurringTasks.userId, userId), isNull(recurringTasks.archivedAt)));

  let results = [...userHabits, ...userRecurring];
  if (excludeTaskId) {
    results = results.filter(r => r.id !== excludeTaskId);
  }
  return results;
}

export async function getPredecessorTasks(taskId: string) {
  return db
    .select({
      id: tasks.id,
      status: tasks.status,
      scheduledDate: tasks.scheduledDate,
    })
    .from(taskDependencies)
    .innerJoin(tasks, eq(tasks.id, taskDependencies.predecessorId))
    .where(eq(taskDependencies.taskId, taskId));
}

export async function commitSchedule(
  userId: string,
  taskId: string,
  strategy: any,
  blocks: any[],
  firstBlockDate: number
): Promise<{ strategyId: string }> {
  return await db.transaction(async (tx) => {
    // Check if strategy already exists
    const existing = await tx.select({ id: schedulingStrategies.id })
      .from(schedulingStrategies)
      .where(eq(schedulingStrategies.taskId, taskId))
      .limit(1);
      
    if (existing.length > 0) {
      throw new Error("ALREADY_SCHEDULED");
    }

    const strategyId = crypto.randomUUID();
    
    await tx.insert(schedulingStrategies).values({
      id: strategyId,
      taskId: strategy.taskId,
      importance: strategy.importance,
      minutesPerDay: strategy.minutesPerDay,
      activeDays: strategy.activeDays,
      preferredStartDate: strategy.preferredStartDate,
      deadlineAt: strategy.deadlineAt,
      isFlexible: strategy.isFlexible,
      acceptedRisk: strategy.acceptedRisk,
      suggestedBy: strategy.suggestedBy,
      createdAt: Math.floor(Date.now() / 1000),
    });

    for (const b of blocks) {
      await tx.insert(dayPlan).values({
        userId,
        taskId,
        strategyId,
        planDate: b.planDate,
        startTime: b.startTime,
        durationMin: b.durationMin,
        sessionType: b.sessionType,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      }).onConflictDoUpdate({
        target: [dayPlan.userId, dayPlan.taskId, dayPlan.planDate, dayPlan.startTime],
        set: {
          durationMin: b.durationMin,
          sessionType: b.sessionType,
          updatedAt: Math.floor(Date.now() / 1000),
        }
      });
    }

    // Sync task's scheduledDate if it wasn't already set
    await tx.update(tasks)
      .set({ scheduledDate: firstBlockDate, updatedAt: Math.floor(Date.now() / 1000) })
      .where(and(eq(tasks.id, taskId), isNull(tasks.scheduledDate)));

    return { strategyId };
  });
}

export async function getMemoryBaselineForUser(userId: string) {
  return db
    .select()
    .from(memoryBaseline)
    .where(eq(memoryBaseline.userId, userId))
    .orderBy(desc(memoryBaseline.computedAt))
    .limit(1)
    .then(rows => rows[0] || null);
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

export async function createHabit(data: NewHabit): Promise<Habit> {
  const rows = await db.insert(habits).values(data).returning();
  return rows[0];
}

export async function listActiveHabits(userId: string): Promise<Habit[]> {
  return db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)));
}
export async function archiveHabit(id: string): Promise<void> {
  await db
    .update(habits)
    .set({ archivedAt: nowSec(), updatedAt: nowSec() })
    .where(eq(habits.id, id));
}

export async function updateHabit(id: string, updates: Partial<Habit>): Promise<Habit> {
  const rows = await db
    .update(habits)
    .set({ ...updates, updatedAt: nowSec() })
    .where(eq(habits.id, id))
    .returning();
  return rows[0];
}

// ---------------------------------------------------------------------------
// Recurring Tasks
// ---------------------------------------------------------------------------

export async function createRecurringTask(data: NewRecurringTask): Promise<RecurringTask> {
  const rows = await db.insert(recurringTasks).values(data).returning();
  return rows[0];
}

export async function listActiveRecurringTasks(userId: string): Promise<RecurringTask[]> {
  return db
    .select()
    .from(recurringTasks)
    .where(and(eq(recurringTasks.userId, userId), isNull(recurringTasks.archivedAt)));
}

export async function archiveRecurringTask(id: string): Promise<void> {
  await db
    .update(recurringTasks)
    .set({ archivedAt: nowSec(), updatedAt: nowSec() })
    .where(eq(recurringTasks.id, id));
}

export async function updateRecurringTask(id: string, updates: Partial<NewRecurringTask>): Promise<RecurringTask> {
  const rows = await db
    .update(recurringTasks)
    .set({ ...updates, updatedAt: nowSec() })
    .where(eq(recurringTasks.id, id))
    .returning();
  return rows[0];
}

// ---------------------------------------------------------------------------
// Habit Markers
// ---------------------------------------------------------------------------

export async function ensureHabitMarkersForDate(userId: string, date: number): Promise<void> {
  const activeHabits = await listActiveHabits(userId);
  for (const h of activeHabits) {
    // Quick active_days check
    const dow = new Date(date * 86400000).getUTCDay();
    const normalizedDow = dow === 0 ? 7 : dow; // 1-7 (Mon-Sun)
    
    let shouldFire = false;
    if (h.cadence === "daily") {
      shouldFire = true;
    } else if (h.activeDays && Array.isArray(h.activeDays)) {
      if ((h.activeDays as number[]).includes(normalizedDow)) {
        shouldFire = true;
      }
    }
    
    if (shouldFire) {
      await db.insert(habitMarkers).values({
        id: crypto.randomUUID(),
        userId,
        habitId: h.id,
        date,
        status: "pending",
        createdAt: nowSec()
      }).onConflictDoNothing();
    }
  }
}

export async function markHabit(habitId: string, date: number, status: "pending" | "done" | "missed" | "skipped"): Promise<HabitMarker> {
  const rows = await db
    .update(habitMarkers)
    .set({ status, completedAt: status === "done" ? nowSec() : null })
    .where(and(eq(habitMarkers.habitId, habitId), eq(habitMarkers.date, date)))
    .returning();
  if (rows.length === 0) throw new Error("Marker not found");
  return rows[0];
}

export async function getHabitMarkersInRange(userId: string, habitId: string, from: number, to: number): Promise<HabitMarker[]> {
  return db
    .select()
    .from(habitMarkers)
    .where(
      and(
        eq(habitMarkers.userId, userId),
        eq(habitMarkers.habitId, habitId),
        gte(habitMarkers.date, from),
        lte(habitMarkers.date, to)
      )
    )
    .orderBy(asc(habitMarkers.date));
}

export async function computeHabitStreak(userId: string, habitId: string): Promise<{ current: number, best: number, rate7d: number, totalCompletions: number }> {
  const markers = await db
    .select()
    .from(habitMarkers)
    .where(and(eq(habitMarkers.userId, userId), eq(habitMarkers.habitId, habitId)))
    .orderBy(desc(habitMarkers.date));

  return computeStreakFromMarkers(markers);
}

export async function computeRecurringStreak(userId: string, recurringTaskId: string): Promise<{ current: number, best: number, rate7d: number, totalCompletions: number }> {
  const markers = await db
    .select()
    .from(recurringMarkers)
    .where(and(eq(recurringMarkers.userId, userId), eq(recurringMarkers.recurringTaskId, recurringTaskId)))
    .orderBy(desc(recurringMarkers.date));

  return computeStreakFromMarkers(markers);
}

function computeStreakFromMarkers(markers: any[]): { current: number, best: number, rate7d: number, totalCompletions: number } {
  let current = 0;
  let best = 0;
  let tempStreak = 0;
  let done7d = 0;
  let valid7d = 0;

  const today = Math.floor(Date.now() / 86400000);
  
  // Calculate current streak
  for (const m of markers) {
    if (m.date > today) continue;
    if (m.status === "done") {
      current++;
    } else if (m.status === "missed" && m.date < today) {
      break;
    }
  }

  // Calculate best streak
  for (let i = markers.length - 1; i >= 0; i--) {
    const m = markers[i];
    if (m.status === "done") {
      tempStreak++;
      if (tempStreak > best) best = tempStreak;
    } else if (m.status === "missed") {
      tempStreak = 0;
    }
  }

  // Calculate 7d rate
  const sevenDaysAgo = today - 7;
  for (const m of markers) {
    if (m.date <= today && m.date > sevenDaysAgo) {
      if (m.status === "done" || m.status === "missed") {
        valid7d++;
        if (m.status === "done") done7d++;
      }
    }
  }

  const totalCompletions = markers.filter(m => m.status === "done").length;

  return {
    current,
    best,
    rate7d: valid7d > 0 ? done7d / valid7d : 0,
    totalCompletions
  };
}

// ---------------------------------------------------------------------------
// Recurring Markers
// ---------------------------------------------------------------------------

export async function ensureRecurringMarkersForDate(userId: string, date: number): Promise<void> {
  // We'll import matchesRecurrenceRule dynamically to avoid circular dependency
  const { matchesRecurrenceRule } = await import("./scheduling/capacity");
  const activeRecurring = await listActiveRecurringTasks(userId);
  
  for (const rt of activeRecurring) {
    if (rt.recurrenceEndsAt && date * 86400 > rt.recurrenceEndsAt) continue;
    if (matchesRecurrenceRule(rt.recurrenceRule, rt.cadence, "recurring", date)) {
      await db.insert(recurringMarkers).values({
        id: crypto.randomUUID(),
        userId,
        recurringTaskId: rt.id,
        date,
        status: "pending",
        createdAt: nowSec()
      }).onConflictDoNothing();
    }
  }
}

export async function markRecurring(recurringTaskId: string, date: number, status: "pending" | "done" | "missed" | "carried"): Promise<RecurringMarker> {
  const rows = await db
    .update(recurringMarkers)
    .set({ status, completedAt: status === "done" ? nowSec() : null })
    .where(and(eq(recurringMarkers.recurringTaskId, recurringTaskId), eq(recurringMarkers.date, date)))
    .returning();
  if (rows.length === 0) throw new Error("Marker not found");
  return rows[0];
}

export async function getRecurringMarkersInRange(userId: string, recurringTaskId: string, from: number, to: number): Promise<RecurringMarker[]> {
  return db
    .select()
    .from(recurringMarkers)
    .where(
      and(
        eq(recurringMarkers.userId, userId),
        eq(recurringMarkers.recurringTaskId, recurringTaskId),
        gte(recurringMarkers.date, from),
        lte(recurringMarkers.date, to)
      )
    )
    .orderBy(asc(recurringMarkers.date));
}

export async function spawnCarryForwardTask(marker: RecurringMarker): Promise<Task> {
  const rt = await db.select().from(recurringTasks).where(eq(recurringTasks.id, marker.recurringTaskId)).limit(1);
  if (!rt.length) throw new Error("Recurring task not found");
  
  const { createTask } = await import("./storage");
  const newTask = await createTask({
    id: crypto.randomUUID(),
    userId: marker.userId,
    projectId: rt[0].projectId || "", 
    title: rt[0].title,
    estimateMin: rt[0].estimateMin,
    status: "pending",
    createdAt: nowSec(),
    updatedAt: nowSec(),
    // We reuse carriedFromId conceptually to point back to the recurring task 
    carriedFromId: rt[0].id
  });
  
  await db.update(recurringMarkers).set({ spawnedTaskId: newTask.id }).where(eq(recurringMarkers.id, marker.id));
  return newTask;
}

// ---------------------------------------------------------------------------
// Combined Daily View
// ---------------------------------------------------------------------------

export async function getDailyHabitBlocks(userId: string, date: number) {
  const habitsRes = await db
    .select({
      id: habits.id,
      name: habits.name,
      estimateMin: habits.estimateMin,
      color: habits.color,
      status: habitMarkers.status,
    })
    .from(habitMarkers)
    .innerJoin(habits, eq(habitMarkers.habitId, habits.id))
    .where(and(
      eq(habitMarkers.userId, userId), 
      eq(habitMarkers.date, date),
      isNull(habits.archivedAt)
    ));

  const recurringRes = await db
    .select({
      id: recurringTasks.id,
      title: recurringTasks.title,
      estimateMin: recurringTasks.estimateMin,
      status: recurringMarkers.status,
      spawnedTaskId: recurringMarkers.spawnedTaskId,
    })
    .from(recurringMarkers)
    .innerJoin(recurringTasks, eq(recurringMarkers.recurringTaskId, recurringTasks.id))
    .where(and(
      eq(recurringMarkers.userId, userId), 
      eq(recurringMarkers.date, date),
      isNull(recurringTasks.archivedAt)
    ));

  // Deduplicate in case of dirty db state or missing unique constraints
  const uniqueHabits = Array.from(new Map(habitsRes.map(h => [h.id, h])).values());
  const uniqueRecurring = Array.from(new Map(recurringRes.map(r => [r.id, r])).values());

  return { habits: uniqueHabits, recurring: uniqueRecurring };
}

// ---------------------------------------------------------------------------
// Day Close
// ---------------------------------------------------------------------------

export async function closeDayForUser(userId: string, todayUnixDay: number) {
  const yesterdayUnixDay = todayUnixDay - 1;

  // 1. Seed today's markers
  await ensureHabitMarkersForDate(userId, todayUnixDay);
  await ensureRecurringMarkersForDate(userId, todayUnixDay);

  // 2. Mark pending from yesterday as missed
  const missedHabits = await db
    .update(habitMarkers)
    .set({ status: "missed" })
    .where(and(eq(habitMarkers.userId, userId), eq(habitMarkers.date, yesterdayUnixDay), eq(habitMarkers.status, "pending")))
    .returning();

  const missedRecurrings = await db
    .update(recurringMarkers)
    .set({ status: "missed" })
    .where(and(eq(recurringMarkers.userId, userId), eq(recurringMarkers.date, yesterdayUnixDay), eq(recurringMarkers.status, "pending")))
    .returning();

  // 3. Spawn carry-forward tasks for missed recurring tasks
  for (const m of missedRecurrings) {
    await spawnCarryForwardTask(m);
  }

  // 4. Compute stats for yesterday's day log
  const habitsStats = await db
    .select({ status: habitMarkers.status, count: sql<number>`count(*)` })
    .from(habitMarkers)
    .where(and(eq(habitMarkers.userId, userId), eq(habitMarkers.date, yesterdayUnixDay)))
    .groupBy(habitMarkers.status);

  const recStats = await db
    .select({ status: recurringMarkers.status, count: sql<number>`count(*)` })
    .from(recurringMarkers)
    .where(and(eq(recurringMarkers.userId, userId), eq(recurringMarkers.date, yesterdayUnixDay)))
    .groupBy(recurringMarkers.status);

  const habitsCompleted = habitsStats.find((s) => s.status === "done")?.count || 0;
  const habitsMissedCount = habitsStats.find((s) => s.status === "missed")?.count || 0;
  const recurringsCompleted = recStats.find((s) => s.status === "done")?.count || 0;
  const recurringsMissedCount = recStats.find((s) => s.status === "missed")?.count || 0;

  // 5. Update yesterday's day log
  await db
    .update(dayLogs)
    .set({
      habitsCompleted,
      habitsMissed: habitsMissedCount,
      recurringsCompleted,
      recurringsMissed: recurringsMissedCount,
      updatedAt: nowSec(),
    })
    .where(and(eq(dayLogs.userId, userId), eq(dayLogs.date, yesterdayUnixDay)));
}
