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
      name: "listProjects",
      description: "Retrieve all active projects for the user.",
      parameters: { type: "object", properties: {}, required: [] },
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
          deadlineAt: { type: "number", description: "Unix timestamp" },
          cadence: { type: "string", enum: ["daily", "weekly", "custom"] },
        },
        required: ["name", "importance", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "archiveProject",
      description: "Archive a project.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
];

export const projectHandlers: Record<string, Function> = {
  listProjects: async () => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const projects = await listActiveProjects(userId);
    return projects.map((p) => ({
      name: p.name,
      importance: p.importance,
      type: p.type,
      deadline: p.deadlineAt
        ? new Date(p.deadlineAt * 1000).toISOString().split("T")[0]
        : null,
      cadence: p.cadence,
    }));
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
      success: true,
      name: project.name,
      importance: project.importance,
      type: project.type,
    };
  },
  archiveProject: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const project = await findProjectById(args.id, userId);
    if (!project) throw new Error("Project not found");
    await archiveProject(args.id);
    return { success: true, archivedProject: project.name };
  },
};
