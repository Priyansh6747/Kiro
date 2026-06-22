import { auth } from "@clerk/nextjs/server";
import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { listDayPlansForDate, listTasks } from "@/lib/storage";

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
    return { agenda, bucket };
  },
};
