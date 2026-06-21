import { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { auth } from "@clerk/nextjs/server";
import {
  listTasks,
  createTask,
  findProjectById,
  insertTaskClosureSelf,
  propagateTaskClosure,
  listTaskDependenciesForTasks,
} from "@/lib/storage";
import { nowSec } from "@/lib/utils";
import { randomUUID } from "crypto";

export const taskTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "listTasks",
      description: "List tasks. Can filter by projectId, date (unix day), status (pending, completed, missed, archived), or bucket (true/false). Returns tasks with a 'blockedBy' array of predecessor IDs.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          date: { type: "number", description: "Unix day integer" },
          status: { type: "string" },
          bucket: { type: "boolean" }
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
  }
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
    
    const taskIds = tasks.map(t => t.id);
    const deps = await listTaskDependenciesForTasks(taskIds);
    
    return tasks.map(t => {
      const blockedByTitles = deps
        .filter(d => d.taskId === t.id)
        .map(d => {
          const pred = tasks.find(pt => pt.id === d.predecessorId);
          return pred ? pred.title : d.predecessorId;
        });
        
      const scheduledDateStr = t.scheduledDate 
        ? new Date(t.scheduledDate * 86400000).toISOString().split('T')[0] 
        : null;
        
      const deadlineStr = t.deadlineAt
        ? new Date(t.deadlineAt * 1000).toISOString().split('T')[0]
        : null;

      return { 
        ...t, 
        blockedBy: blockedByTitles,
        scheduledDateStr,
        deadlineStr
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
    return task;
  }
};
