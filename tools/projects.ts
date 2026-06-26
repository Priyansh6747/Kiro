import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import {
  archiveProject,
  countActiveNonDefaultProjects,
  createProject,
  findProjectById,
  listActiveProjects,
  createHabit,
  createRecurringTask,
} from "@/lib/storage";
import { nowSec } from "@/lib/utils";

export const projectTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "show_projects",
      description: "Retrieve and show all active projects for the user.",
      parameters: { 
        type: "object", 
        properties: { 
          dummy: { type: "string", description: "Optional. Leave empty." } 
        }, 
        required: [] 
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createProject",
      description:
        "Create a new project. Importance is 1-5. Type is critical or nicetohave. (For habits or recurring tasks, use createHabit or createRecurringTask instead).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          importance: { type: "integer", description: "Priority 1 to 5" },
          type: {
            type: "string",
            enum: ["critical", "nicetohave"],
          },
          deadlineAt: { type: ["number", "null"], description: "Unix timestamp. Omit or set null if none." },
          cadence: { type: ["string", "null"], enum: ["daily", "weekly", "custom", null], description: "Omit or set null if none." },
        },
        required: ["name", "importance", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "archiveProject",
      description: "Archive a project by its human-readable name.",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Human-readable project name" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createHabit",
      description: "Create a new daily or weekly habit routine.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the habit" },
          cadence: { type: "string", enum: ["daily", "weekly", "custom"] },
          activeDays: { type: ["array", "null"], items: { type: "number" }, description: "Array of integers 1-7 (1=Mon, 7=Sun). Only required if not daily." },
          estimateMin: { type: "number", description: "Estimated minutes per occurrence. Default 30." }
        },
        required: ["name", "cadence"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "createRecurringTask",
      description: "Create a new recurring task.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the recurring task" },
          projectId: { type: ["string", "null"], description: "Optional project ID this belongs to." },
          cadence: { type: "string", enum: ["daily", "weekly", "custom"] },
          activeDays: { type: ["array", "null"], items: { type: "number" }, description: "Array of integers 1-7 (1=Mon, 7=Sun)." },
          recurrenceRule: { type: ["string", "null"], description: "Optional recurrence string (e.g. 'MON,WED')" },
          estimateMin: { type: "number", description: "Estimated minutes. Default 30." }
        },
        required: ["title", "cadence"]
      }
    }
  }
];

export const projectHandlers: Record<string, Function> = {
  show_projects: async () => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const projects = await listActiveProjects(userId);
    const rows = projects.map((p) => [
      p.name,
      p.importance.toString(),
      p.deadlineAt ? new Date(p.deadlineAt * 1000).toISOString().split("T")[0] : "None"
    ]);
    return {
      preformattedUi: `<ui:table>${JSON.stringify({ headers: ["Project Name", "Importance", "Deadline"], rows, caption: "Active Projects" })}</ui:table>`
    };
  },
  createProject: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const activeCount = await countActiveNonDefaultProjects(userId);
    if (activeCount >= 10) throw new Error("Max 10 active projects");

    const project = await createProject({
      id: randomUUID(),
      userId,
      name: args.name,
      importance: args.importance,
      type: args.type,
      deadlineAt: args.deadlineAt || null,
      cadence: args.cadence || null,
      isDefault: false,
      createdAt: nowSec(),
      archivedAt: null,
    });
    return {
      preformattedUi: `✓ Project **${project.name}** created successfully.`
    };
  },
  archiveProject: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const projects = await listActiveProjects(userId);
    const p = projects.find((x) => x.name.toLowerCase() === args.name.toLowerCase());
    if (!p) throw new Error(`Project '${args.name}' not found`);
    await archiveProject(p.id);
    return { preformattedUi: `✓ Project **${p.name}** archived.` };
  },
  createHabit: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    
    const habit = await createHabit({
      id: randomUUID(),
      userId,
      name: args.name,
      importance: 3,
      cadence: args.cadence,
      activeDays: args.activeDays || null,
      estimateMin: args.estimateMin || 30,
      createdAt: nowSec(),
      updatedAt: nowSec(),
    });
    return {
      preformattedUi: `✓ Habit **${habit.name}** created successfully (${habit.cadence}).`
    };
  },
  createRecurringTask: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    
    const rt = await createRecurringTask({
      id: randomUUID(),
      userId,
      title: args.title,
      projectId: args.projectId || null,
      importance: 3,
      cadence: args.cadence,
      activeDays: args.activeDays || null,
      recurrenceRule: args.recurrenceRule || null,
      estimateMin: args.estimateMin || 30,
      createdAt: nowSec(),
      updatedAt: nowSec(),
    });
    return {
      preformattedUi: `✓ Recurring Task **${rt.title}** created successfully (${rt.cadence}).`
    };
  }
};
