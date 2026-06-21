import { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { auth } from "@clerk/nextjs/server";
import {
  findDayLog,
  listDayLogs,
  updateDayLog,
} from "@/lib/storage";
import { nowSec } from "@/lib/utils";

export const dayLogTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "listDayLogs",
      description: "List all past daily reflections and logs.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "getDayLog",
      description: "Get the day log for a specific unix day date.",
      parameters: {
        type: "object",
        properties: { date: { type: "number", description: "Unix day integer" } },
        required: ["date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateDayLog",
      description: "Update the dayType for a day log.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "number", description: "Unix day integer" },
          dayType: { type: "string", enum: ["normal", "adjusted", "break"] },
        },
        required: ["date", "dayType"],
      },
    },
  }
];

export const dayLogHandlers: Record<string, Function> = {
  listDayLogs: async () => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const logs = await listDayLogs(userId, 0, 99999);
    return logs.map(l => ({
      ...l,
      dateStr: new Date(l.date * 86400000).toISOString().split('T')[0]
    }));
  },
  getDayLog: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    return await findDayLog(userId, args.date);
  },
  updateDayLog: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    return await updateDayLog(userId, args.date, {
      dayType: args.dayType,
      updatedAt: nowSec(),
    });
  }
};
