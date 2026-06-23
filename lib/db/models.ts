import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // Clerk userId
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at").notNull(), // unix timestamp
  updatedAt: integer("updated_at").notNull(),
});

// ---------------------------------------------------------------------------
// preferences
// ---------------------------------------------------------------------------
export const preferences = sqliteTable("preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  timezone: text("timezone").notNull().default("UTC"),
  defaultAvailableMin: integer("default_available_min").notNull().default(240),
  ratioMode: text("ratio_mode", { enum: ["cumulative", "streak"] })
    .notNull()
    .default("cumulative"),
  morningNudgeTime: text("morning_nudge_time").notNull().default("08:00"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    importance: integer("importance").notNull().default(3), // 1–5
    type: text("type", {
      enum: ["critical", "recurring", "habit", "nicetohave"],
    }).notNull(),
    deadlineAt: integer("deadline_at"), // unix timestamp, nullable
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    /**
     * cadence – controls Planner auto-suggest frequency.
     * null = no auto-suggest (critical / nicetohave)
     * daily = habit (every morning)
     * weekly = recurring with a fixed weekly pattern
     * custom = recurring with explicit day-of-week selection
     */
    cadence: text("cadence", { enum: ["daily", "weekly", "custom"] }),
    createdAt: integer("created_at").notNull(),
    archivedAt: integer("archived_at"), // soft delete
  },
  (t) => [index("idx_projects_user_type").on(t.userId, t.type, t.archivedAt)],
);

// ---------------------------------------------------------------------------
// tasks
// ---------------------------------------------------------------------------
export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    parentId: text("parent_id").references((): any => tasks.id),
    carriedFromId: text("carried_from_id").references((): any => tasks.id),
    title: text("title").notNull(),
    estimateMin: integer("estimate_min").notNull().default(30),
    status: text("status", {
      enum: ["pending", "done", "missed", "carried", "adjusted", "deleted"],
    })
      .notNull()
      .default("pending"),
    scheduledDate: integer("scheduled_date"), // unix date (day only), null = bucket/template
    deadlineAt: integer("deadline_at"),
    completedAt: integer("completed_at"),
    deletedAt: integer("deleted_at"),
    /**
     * recurrence_rule – when null the task is a one-off.
     * Values: "daily" | comma-separated day abbreviations e.g. "MON" | "MON,THU" | "weekly"
     * Day abbreviations: MON TUE WED THU FRI SAT SUN
     */
    recurrenceRule: text("recurrence_rule"),
    /** recurrence_ends_at – optional unix timestamp; null = recur forever */
    recurrenceEndsAt: integer("recurrence_ends_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("idx_tasks_user_scheduled").on(t.userId, t.scheduledDate),
    index("idx_tasks_project_status").on(t.projectId, t.status),
    index("idx_tasks_parent").on(t.parentId),
  ],
);

// ---------------------------------------------------------------------------
// task_dependencies  (DAG edge table)
// ---------------------------------------------------------------------------
export const taskDependencies = sqliteTable(
  "task_dependencies",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id),
    predecessorId: text("predecessor_id")
      .notNull()
      .references(() => tasks.id),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.predecessorId] }),
    index("idx_dependencies_task").on(t.taskId),
  ],
);

// ---------------------------------------------------------------------------
// task_closure  (closure table for subtask hierarchy)
// ---------------------------------------------------------------------------
export const taskClosure = sqliteTable(
  "task_closure",
  {
    ancestorId: text("ancestor_id")
      .notNull()
      .references(() => tasks.id),
    descendantId: text("descendant_id")
      .notNull()
      .references(() => tasks.id),
    depth: integer("depth").notNull(), // 0 = self, 1 = direct parent, n = nth
  },
  (t) => [
    primaryKey({ columns: [t.ancestorId, t.descendantId] }),
    index("idx_closure_descendant").on(t.descendantId),
  ],
);

// ---------------------------------------------------------------------------
// day_logs
// ---------------------------------------------------------------------------
export const dayLogs = sqliteTable(
  "day_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    date: integer("date").notNull(), // unix date (day only)
    availableMin: integer("available_min").notNull(),
    tasksAssigned: integer("tasks_assigned").notNull().default(0),
    tasksCompleted: integer("tasks_completed").notNull().default(0),
    tasksMissed: integer("tasks_missed").notNull().default(0),
    tasksCarried: integer("tasks_carried").notNull().default(0),
    ratio: real("ratio").notNull().default(0.0),
    penalty: real("penalty").notNull().default(0.0),
    dayType: text("day_type", {
      enum: ["normal", "adjusted", "break"],
    })
      .notNull()
      .default("normal"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("idx_day_logs_user_date").on(t.userId, t.date)],
);

// ---------------------------------------------------------------------------
// memory_baseline (written by Memory module)
// ---------------------------------------------------------------------------
export const memoryBaseline = sqliteTable(
  "memory_baseline",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    computedAt: integer("computed_at").notNull(),
    rolling14dAvgCompleted: real("rolling_14d_avg_completed").notNull(),
    rolling14dAvgAssigned: real("rolling_14d_avg_assigned").notNull(),
    rolling14dAvgRatio: real("rolling_14d_avg_ratio").notNull(),
    baselineDeviation: real("baseline_deviation").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("idx_memory_user_computed").on(t.userId, t.computedAt)],
);

// ---------------------------------------------------------------------------
// day_plan
// ---------------------------------------------------------------------------
export const dayPlan = sqliteTable(
  "day_plan",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id),
    planDate: integer("plan_date").notNull(), // unix date (day only)
    startTime: integer("start_time").notNull(), // unix timestamp
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.taskId] }),
    index("idx_day_plan_user_date").on(t.userId, t.planDate),
  ],
);

// ---------------------------------------------------------------------------
// Inferred types  (handy for service/repo layers)
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Preference = typeof preferences.$inferSelect;
export type NewPreference = typeof preferences.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TaskDependency = typeof taskDependencies.$inferSelect;
export type NewTaskDependency = typeof taskDependencies.$inferInsert;

export type TaskClosure = typeof taskClosure.$inferSelect;
export type NewTaskClosure = typeof taskClosure.$inferInsert;

export type DayLog = typeof dayLogs.$inferSelect;
export type NewDayLog = typeof dayLogs.$inferInsert;

export type MemoryBaseline = typeof memoryBaseline.$inferSelect;
export type NewMemoryBaseline = typeof memoryBaseline.$inferInsert;

export type DayPlan = typeof dayPlan.$inferSelect;
export type NewDayPlan = typeof dayPlan.$inferInsert;

// ---------------------------------------------------------------------------
// AI Usage
// ---------------------------------------------------------------------------
export const aiUsage = sqliteTable("ai_usage", {
  uid: text("uid").notNull(),
  datetime: integer("datetime").notNull(),
  inputToken: integer("input_token").notNull(),
  outputToken: integer("output_token").notNull(),
}, (table) => [
  primaryKey({ columns: [table.uid, table.datetime] }),
]);

// ---------------------------------------------------------------------------
// User Cost
// ---------------------------------------------------------------------------
export const userCost = sqliteTable("user_cost", {
  uid: text("uid").notNull(),
  date: text("date").notNull(),
  dayCost: real("day_cost").notNull().default(0),
}, (table) => [
  primaryKey({ columns: [table.uid, table.date] }),
]);

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------
export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  projectId: text("project_id")
    .references(() => projects.id),
  type: text("type").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type Artifact = typeof artifacts.$inferSelect;
export type NewArtifact = typeof artifacts.$inferInsert;

