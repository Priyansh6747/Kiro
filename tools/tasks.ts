import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import {
  createTask,
  findProjectByName,
  findTaskByTitle,
  findTaskById,
  insertTaskClosureSelf,
  listActiveProjects,
  listTaskDependenciesForTasks,
  listTasks,
  updateTask,
} from "@/lib/storage";
import { nowSec } from "@/lib/utils";

export const taskTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "show_tasks",
      description:
        "List and show tasks. Can filter by projectName (human-readable project name), date (unix day integer OR YYYY-MM-DD string), status (pending, done, missed, carried, adjusted), or bucket (true to see unscheduled backlog).",
      parameters: {
        type: "object",
        properties: {
          projectName: {
            type: "string",
            description: "Human-readable project name to filter by. Leave empty to list across all projects.",
          },
          date: { type: ["number", "string"], description: "Unix day integer or YYYY-MM-DD string" },
          status: { type: "string", enum: ["pending", "done", "missed", "carried", "adjusted"] },
          bucket: { type: "boolean", description: "Set true to list the unscheduled backlog" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createTask",
      description: "Create a new task under a project, referenced by its human-readable name.",
      parameters: {
        type: "object",
        properties: {
          projectName: { type: "string", description: "Human-readable project name" },
          title: { type: "string" },
          estimateMin: { type: "integer", description: "Duration in minutes" },
          scheduledDate: { type: "number", description: "Unix day integer" },
        },
        required: ["projectName", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateTask",
      description:
        "Update a task's properties (e.g. mark as 'done', change scheduledDate, update estimate). Identify the task by its title and optional projectName.",
      parameters: {
        type: "object",
        properties: {
          taskTitle: { type: "string", description: "The current title of the task to update" },
          projectName: { type: "string", description: "Project name to disambiguate if multiple tasks share the same title" },
          status: {
            type: "string",
            enum: ["pending", "done", "missed", "carried", "adjusted", "deleted"],
          },
          title: { type: "string", description: "New title (to rename the task)" },
          estimateMin: { type: "integer" },
          scheduledDate: { type: "number", description: "Unix day integer" },
        },
        required: ["taskTitle"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "unscheduleToBucket",
      description:
        "Unschedule a task (by title + optional projectName), returning it to the bucket. Also unschedules all dependent tasks.",
      parameters: {
        type: "object",
        properties: {
          taskTitle: { type: "string", description: "Title of the task to unschedule" },
          projectName: { type: "string", description: "Project name to disambiguate" },
        },
        required: ["taskTitle"],
      },
    },
  },
];

export const taskHandlers: Record<string, Function> = {
  show_tasks: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    let projectId: string | undefined;
    if (args.projectName) {
      const project = await findProjectByName(args.projectName, userId);
      if (!project) {
        // Give helpful list of valid names
        const all = await listActiveProjects(userId);
        return {
          preformattedUi: `Project "${args.projectName}" not found. Available: ${all.map((p) => p.name).join(", ")}`,
        };
      }
      projectId = project.id;
    }

    let targetDate = args.date;
    if (typeof targetDate === "string") {
      const parts = targetDate.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        targetDate = Math.floor(d.getTime() / 86400000);
      }
    }

    const taskRows = await listTasks({
      userId,
      projectId,
      date: targetDate,
      status: args.status,
      bucket: args.bucket,
    });

    const taskIds = taskRows.map((t) => t.id);
    const deps = await listTaskDependenciesForTasks(taskIds);

    // Build project map for display
    const allProjects = await listActiveProjects(userId);
    const projectMap = Object.fromEntries(allProjects.map((p) => [p.id, p.name]));

    const uiTasks = taskRows.map((t) => {
      const blockedByTitles = deps
        .filter((d) => d.taskId === t.id)
        .map((d) => {
          const pred = taskRows.find((pt) => pt.id === d.predecessorId);
          return pred ? pred.title : "Unknown task";
        });

      const dateStr = t.scheduledDate ? new Date(t.scheduledDate * 86400000).toISOString().split("T")[0] : null;

      return `<ui:task>${JSON.stringify({
        title: t.title,
        projectName: projectMap[t.projectId] ?? "Unknown",
        estimateMin: t.estimateMin,
        status: t.status,
        scheduledDate: dateStr
      })}</ui:task>`;
    });

    return {
      preformattedUi: uiTasks.length > 0 ? uiTasks.join("\n") : "_No tasks found._",
    };
  },

  createTask: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const project = await findProjectByName(args.projectName, userId);
    if (!project) {
      const all = await listActiveProjects(userId);
      return {
        preformattedUi: `Project "${args.projectName}" not found. Available: ${all.map((p) => p.name).join(", ")}`,
      };
    }

    const newTaskId = randomUUID();
    const task = await createTask({
      id: newTaskId,
      userId,
      projectId: project.id,
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
    const dateStr = task.scheduledDate ? new Date(task.scheduledDate * 86400000).toISOString().split("T")[0] : null;
    return {
      preformattedUi: `✓ Created task **${task.title}**\n<ui:task>${JSON.stringify({
        title: task.title,
        projectName: project.name,
        estimateMin: task.estimateMin,
        status: task.status,
        scheduledDate: dateStr
      })}</ui:task>`
    };
  },

  updateTask: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    let projectId: string | undefined;
    if (args.projectName) {
      const project = await findProjectByName(args.projectName, userId);
      if (!project) {
        const all = await listActiveProjects(userId);
        return {
          preformattedUi: `Project "${args.projectName}" not found. Available: ${all.map((p) => p.name).join(", ")}`,
        };
      }
      projectId = project.id;
    }

    const task = await findTaskByTitle(args.taskTitle, userId, projectId);
    if (!task) {
      // Fallback: check if it's a habit or recurring task
      const { listActiveHabits, listActiveRecurringTasks, markHabit, markRecurring, getOrCreatePreferences } = await import("@/lib/storage");
      const { todayUnixDay } = await import("@/lib/utils");
      
      const [habits, recurring] = await Promise.all([
        listActiveHabits(userId),
        listActiveRecurringTasks(userId)
      ]);
      
      const lowerTitle = args.taskTitle.toLowerCase();
      const habit = habits.find(h => h.name.toLowerCase() === lowerTitle || lowerTitle.includes(h.name.toLowerCase()));
      if (habit) {
        let hStatus = args.status;
        if (hStatus === "deleted") hStatus = "skipped";
        if (hStatus !== "done" && hStatus !== "pending" && hStatus !== "missed" && hStatus !== "skipped") {
           hStatus = "done"; // default to done if ambiguous
        }
        const prefs = await getOrCreatePreferences(userId);
        const todayDate = todayUnixDay(prefs.timezone);
        await markHabit(habit.id, todayDate, hStatus as any);
        return {
          preformattedUi: `✓ Marked habit **${habit.name}** as ${hStatus} for today.`
        };
      }
      
      const rec = recurring.find(r => r.title.toLowerCase() === lowerTitle || lowerTitle.includes(r.title.toLowerCase()));
      if (rec) {
        let rStatus = args.status;
        if (rStatus === "deleted") rStatus = "missed";
        if (rStatus !== "done" && rStatus !== "pending" && rStatus !== "missed" && rStatus !== "carried") {
           rStatus = "done";
        }
        const prefs = await getOrCreatePreferences(userId);
        const todayDate = todayUnixDay(prefs.timezone);
        await markRecurring(rec.id, todayDate, rStatus as any);
        return {
          preformattedUi: `✓ Marked recurring task **${rec.title}** as ${rStatus} for today.`
        };
      }

      throw new Error(`Task "${args.taskTitle}" not found. No matching standard task, habit, or recurring task was found.`);
    }

    const updates: any = {};
    if (args.status !== undefined) updates.status = args.status;
    if (args.title !== undefined) updates.title = args.title;
    if (args.estimateMin !== undefined) updates.estimateMin = args.estimateMin;
    if (args.scheduledDate !== undefined) updates.scheduledDate = args.scheduledDate;

    if (args.status === "done") {
      updates.completedAt = nowSec();
    } else if (args.status === "pending") {
      updates.completedAt = null;
    }

    updates.updatedAt = nowSec();

    const updated = await updateTask(task.id, updates);
    const dateStr = updated.scheduledDate ? new Date(updated.scheduledDate * 86400000).toISOString().split("T")[0] : null;
    return {
      preformattedUi: `✓ Updated task **${updated.title}**\n<ui:task>${JSON.stringify({
        title: updated.title,
        projectName: args.projectName || "Unknown",
        estimateMin: updated.estimateMin,
        status: updated.status,
        scheduledDate: dateStr
      })}</ui:task>`
    };
  },

  unscheduleToBucket: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    let projectId: string | undefined;
    if (args.projectName) {
      const project = await findProjectByName(args.projectName, userId);
      if (project) projectId = project.id;
    }

    const task = await findTaskByTitle(args.taskTitle, userId, projectId);
    if (!task) throw new Error(`Task "${args.taskTitle}" not found.`);

    const { db } = await import("@/lib/db/client");
    const { tasks, taskDependencies } = await import("@/lib/db/models");
    const { inArray } = await import("drizzle-orm");

    const allSuccessorsToUnschedule: string[] = [];
    let currentLevelIds = [task.id];

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
        if (s.date !== null) allSuccessorsToUnschedule.push(s.id);
      }

      currentLevelIds = allNextSuccessors.map((s) => s.id);
    }

    if (allSuccessorsToUnschedule.length > 0) {
      await db
        .update(tasks)
        .set({ scheduledDate: null, updatedAt: nowSec() })
        .where(inArray(tasks.id, allSuccessorsToUnschedule));
    }

    await updateTask(task.id, { scheduledDate: null, updatedAt: nowSec() });

    if (task.scheduledDate !== null) {
      const { syncDayLogStats } = await import("@/lib/storage");
      await syncDayLogStats(userId, task.scheduledDate);
    }

    return {
      preformattedUi: `✓ Unscheduled **${task.title}**${allSuccessorsToUnschedule.length > 0 ? ` and ${allSuccessorsToUnschedule.length} dependent tasks.` : '.'}`
    };
  },
};
