import { auth } from "@clerk/nextjs/server";
import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { findDayLog, listDayLogs, updateDayLog } from "@/lib/storage";
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
  },
];

const enrichLog = (log: any) => {
  if (!log) return log;
  const assumedLoadMin = log.tasksAssigned * 30; // standard 30 min per task
  let loadStatus = "balanced";
  if (assumedLoadMin > log.availableMin * 1.1) loadStatus = "overload";
  else if (assumedLoadMin < log.availableMin * 0.6) loadStatus = "chill";

  return {
    ...log,
    dateStr: new Date(log.date * 86400000).toISOString().split("T")[0],
    loadStatus, // provides chill vs overload data
  };
};

export const dayLogHandlers: Record<string, Function> = {
  listDayLogs: async () => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const logs = await listDayLogs(userId, 0, 99999);
    return logs.map(enrichLog);
  },
  getDayLog: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const log = await findDayLog(userId, args.date);
    return enrichLog(log);
  },
  updateDayLog: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    return await updateDayLog(userId, args.date, {
      dayType: args.dayType,
      updatedAt: nowSec(),
    });
  },
};
