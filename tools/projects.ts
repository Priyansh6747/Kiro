import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import {
  archiveProject,
  countActiveNonDefaultProjects,
  createProject,
  findProjectById,
  listActiveProjects,
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
        "Create a new project. Importance is 1-5. Type is critical, recurring, habit, or nicetohave.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          importance: { type: "integer", description: "Priority 1 to 5" },
          type: {
            type: "string",
            enum: ["critical", "recurring", "habit", "nicetohave"],
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
    const { findProjectByName } = await import("@/lib/storage");
    const project = await findProjectByName(args.name, userId);
    if (!project) throw new Error(`Project "${args.name}" not found`);
    await archiveProject(project.id);
    return { 
      preformattedUi: `✓ Project **${project.name}** archived successfully.`
    };
  },
};
