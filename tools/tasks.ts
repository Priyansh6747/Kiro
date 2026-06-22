import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import {
  createTask,
  findProjectById,
  findTaskById,
  insertTaskClosureSelf,
  listTaskDependenciesForTasks,
  listTasks,
  propagateTaskClosure,
  updateTask,
} from "@/lib/storage";
import { nowSec } from "@/lib/utils";

export const taskTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "listTasks",
      description:
        "List tasks. Can filter by projectId, date (unix day), status (pending, completed, missed, archived), or bucket (true/false). Returns tasks with a 'blockedBy' array of predecessor IDs.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          date: { type: "number", description: "Unix day integer" },
          status: { type: "string" },
          bucket: { type: "boolean" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createTask",
      description: "Create a new task under a project.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          title: { type: "string" },
          estimateMin: { type: "integer", description: "Duration in minutes" },
          scheduledDate: { type: "number", description: "Unix day integer" },
        },
        required: ["projectId", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateTask",
      description:
        "Update a task's properties (e.g. mark as 'done', change scheduledDate, update estimate).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: {
            type: "string",
            enum: [
              "pending",
              "done",
              "missed",
              "carried",
              "adjusted",
              "deleted",
            ],
          },
          title: { type: "string" },
          estimateMin: { type: "integer" },
          scheduledDate: { type: "number", description: "Unix day integer" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "unscheduleToBucket",
      description:
        "Unschedule a task, returning it to the bucket. This will automatically unschedule all of its dependent tasks as well.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The ID of the task to unschedule",
          },
        },
        required: ["id"],
      },
    },
  },
];

export const taskHandlers: Record<string, Function> = {
  listTasks: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const tasks = await listTasks({
      userId,
      projectId: args.projectId,
      date: args.date,
      status: args.status,
      bucket: args.bucket,
    });

    const taskIds = tasks.map((t) => t.id);
    const deps = await listTaskDependenciesForTasks(taskIds);

    return tasks.map((t) => {
      const blockedByTitles = deps
        .filter((d) => d.taskId === t.id)
        .map((d) => {
          const pred = tasks.find((pt) => pt.id === d.predecessorId);
          return pred ? pred.title : "Unknown task";
        });

      const scheduledDateStr = t.scheduledDate
        ? new Date(t.scheduledDate * 86400000).toISOString().split("T")[0]
        : null;

      const deadlineStr = t.deadlineAt
        ? new Date(t.deadlineAt * 1000).toISOString().split("T")[0]
        : null;

      return {
        title: t.title,
        estimateMin: t.estimateMin,
        status: t.status,
        scheduledDate: scheduledDateStr,
        deadline: deadlineStr,
        blockedBy: blockedByTitles,
      };
    });
  },
  createTask: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const project = await findProjectById(args.projectId, userId);
    if (!project) throw new Error("Project not found");

    const newTaskId = randomUUID();
    const task = await createTask({
      id: newTaskId,
      userId,
      projectId: args.projectId,
      parentId: null,
      carriedFromId: null,
      title: args.title,
      estimateMin: args.estimateMin || 30,
      status: "pending",
      scheduledDate: args.scheduledDate || null,
      deadlineAt: project.deadlineAt,
      completedAt: null,
      deletedAt: null,
      recurrenceRule: null,
      recurrenceEndsAt: null,
      createdAt: nowSec(),
      updatedAt: nowSec(),
    });

    await insertTaskClosureSelf(newTaskId);
    return {
      success: true,
      title: task.title,
      estimateMin: task.estimateMin,
      status: task.status,
      scheduledDate: task.scheduledDate
        ? new Date(task.scheduledDate * 86400000).toISOString().split("T")[0]
        : null,
    };
  },
  updateTask: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const task = await findTaskById(args.id, userId);
    if (!task) throw new Error("Task not found");

    const updates: any = {};
    if (args.status !== undefined) updates.status = args.status;
    if (args.title !== undefined) updates.title = args.title;
    if (args.estimateMin !== undefined) updates.estimateMin = args.estimateMin;
    if (args.scheduledDate !== undefined)
      updates.scheduledDate = args.scheduledDate;

    if (args.status === "done") {
      updates.completedAt = nowSec();
    } else if (args.status === "pending") {
      updates.completedAt = null;
    }

    updates.updatedAt = nowSec();

    const updated = await updateTask(args.id, updates);
    return {
      success: true,
      title: updated.title,
      status: updated.status,
      estimateMin: updated.estimateMin,
      scheduledDate: updated.scheduledDate
        ? new Date(updated.scheduledDate * 86400000).toISOString().split("T")[0]
        : null,
    };
  },
  unscheduleToBucket: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const task = await findTaskById(args.id, userId);
    if (!task) throw new Error("Task not found");

    const { db } = await import("@/lib/db/client");
    const { tasks, taskDependencies } = await import("@/lib/db/models");
    const { inArray } = await import("drizzle-orm");

    const allSuccessorsToUnschedule: string[] = [];
    let currentLevelIds = [args.id];

    while (currentLevelIds.length > 0) {
      const depsRows = await db
        .select({ taskId: taskDependencies.taskId })
        .from(taskDependencies)
        .where(inArray(taskDependencies.predecessorId, currentLevelIds));

      const nextLevelIds = depsRows.map((r) => r.taskId);
      if (nextLevelIds.length === 0) break;

      const allNextSuccessors = await db
        .select({ id: tasks.id, date: tasks.scheduledDate })
        .from(tasks)
        .where(inArray(tasks.id, nextLevelIds));

      for (const s of allNextSuccessors) {
        if (s.date !== null) {
          allSuccessorsToUnschedule.push(s.id);
        }
      }

      currentLevelIds = allNextSuccessors.map((s) => s.id);
    }

    if (allSuccessorsToUnschedule.length > 0) {
      await db
        .update(tasks)
        .set({ scheduledDate: null, updatedAt: nowSec() })
        .where(inArray(tasks.id, allSuccessorsToUnschedule));
    }

    await updateTask(args.id, { scheduledDate: null, updatedAt: nowSec() });

    // Sync day log for the task's old date if any
    if (task.scheduledDate !== null) {
      const { syncDayLogStats } = await import("@/lib/storage");
      await syncDayLogStats(userId, task.scheduledDate);
    }

    return {
      success: true,
      unscheduledTask: args.id,
      unscheduledSuccessorsCount: allSuccessorsToUnschedule.length,
    };
  },
};
