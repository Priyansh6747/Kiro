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
        properties: {},
        required: [],
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
    
    const { getOrCreatePreferences } = await import("@/lib/storage");
    const { todayUnixDay } = await import("@/lib/utils");
    const prefs = await getOrCreatePreferences(userId);
    const todayDate = todayUnixDay(prefs.timezone);

    const agenda = await listTasks({ userId, date: todayDate });
    const bucket = await listTasks({
      userId,
      bucket: true,
      todayDate,
    });
    
    const userProjects = await db.select().from(projects).where(eq(projects.userId, userId));
    const projectMap = Object.fromEntries(userProjects.map(p => [p.id, p.name]));
    
    const enrich = (t: any) => {
      return {
        title: t.title,
        projectName: projectMap[t.projectId] || "Unknown",
        estimateMin: t.estimateMin,
        status: t.status,
        scheduledDate: t.scheduledDate
          ? new Date(t.scheduledDate * 86400000).toISOString().split("T")[0]
          : null,
        deadlineAt: t.deadlineAt
          ? new Date(t.deadlineAt * 1000).toISOString().split("T")[0]
          : null,
        completedAt: t.completedAt
          ? new Date(t.completedAt * 1000).toISOString().split("T")[0]
          : null,
      };
    };

    return { 
      agenda: agenda.map(enrich), 
      bucket: bucket.map(enrich) 
    };
  },
};
