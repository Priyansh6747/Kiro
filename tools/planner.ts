import { auth } from "@clerk/nextjs/server";
import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { listDayPlansForDate, listTasks } from "@/lib/storage";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/models";
import { eq } from "drizzle-orm";

export const plannerTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getDayPlan",
      description:
        "Get the day plan for a specific date (the scheduled blocks/order).",
      parameters: {
        type: "object",
        properties: {
          date: { type: "number", description: "Unix day integer" },
        },
        required: ["date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTodayAgenda",
      description:
        "Get today's agenda including unconfirmed tasks, as well as the 'bucket' (pending tasks without a scheduled date).",
      parameters: {
        type: "object",
        properties: {
          date: { type: "number", description: "Unix day integer for today" },
        },
        required: ["date"],
      },
    },
  },
];

export const plannerHandlers: Record<string, Function> = {
  getDayPlan: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    return await listDayPlansForDate(userId, args.date);
  },
  getTodayAgenda: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const agenda = await listTasks({ userId, date: args.date });
    const bucket = await listTasks({
      userId,
      bucket: true,
      todayDate: args.date,
    });
    
    const userProjects = await db.select().from(projects).where(eq(projects.userId, userId));
    const projectMap = Object.fromEntries(userProjects.map(p => [p.id, p.name]));
    
    const enrich = (t: any) => {
      const copy = { ...t };
      copy.projectName = projectMap[t.projectId] || t.projectId;
      delete copy.projectId; // Prevent LLM from seeing the raw UUID
      return copy;
    };

    return { 
      agenda: agenda.map(enrich), 
      bucket: bucket.map(enrich) 
    };
  },
};
