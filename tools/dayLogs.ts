import { auth } from "@clerk/nextjs/server";
import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { findDayLog, listDayLogs, updateDayLog, listTasks } from "@/lib/storage";
import { nowSec } from "@/lib/utils";

export const dayLogTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "show_day_logs",
      description: "List and show all past daily reflections and logs.",
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
      name: "show_day_log",
      description: "Get and show the day log for a specific unix day date.",
      parameters: {
        type: "object",
        properties: {
          date: { type: ["number", "string"], description: "Unix day integer OR YYYY-MM-DD string" },
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
  show_day_logs: async () => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const logs = await listDayLogs(userId, 0, 99999);
    const enriched = logs.map(enrichLog);
    
    const rows = enriched.map((l) => [
      l.dateStr,
      l.dayType,
      l.loadStatus,
      `${l.tasksCompleted}/${l.tasksAssigned}`,
      `${l.habitsCompleted}/${l.habitsCompleted + l.habitsMissed}`,
      `${l.recurringsCompleted}/${l.recurringsCompleted + l.recurringsMissed}`
    ]);

    return {
      preformattedUi: `<ui:table>${JSON.stringify({ headers: ["Date", "Type", "Load", "Tasks", "Habits", "Recurring"], rows, caption: "Daily Logs" })}</ui:table>`
    };
  },
  show_day_log: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    
    let targetDate = args.date;
    if (typeof targetDate === "string") {
      const parts = targetDate.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        targetDate = Math.floor(d.getTime() / 86400000);
      } else {
        let parsed = Date.parse(targetDate);
        if (!isNaN(parsed)) {
          const d = new Date(parsed);
          if (d.getFullYear() === 2001) d.setFullYear(new Date().getFullYear());
          targetDate = Math.floor(d.getTime() / 86400000);
        }
      }
    }
    
    const log = await findDayLog(userId, targetDate);
    if (!log) {
      const tasksForDay = await listTasks({ userId, date: targetDate });
      if (tasksForDay.length === 0) {
         return { preformattedUi: `_No log or tasks found for that date._` };
      }
      
      let completed = 0;
      for (const t of tasksForDay) {
        if (t.status === "done") completed++;
      }
      const total = tasksForDay.length;
      
      const metrics = [
        `<ui:metrics>${JSON.stringify({ title: "Tasks Completed", value: completed, unit: `of ${total}` })}</ui:metrics>`,
        `<ui:metrics>${JSON.stringify({ title: "Load Status", value: "unrecorded", unit: "" })}</ui:metrics>`
      ].join('\n');

      const dateStr = new Date(targetDate * 86400000).toISOString().split("T")[0];
      return {
        preformattedUi: `**Log for ${dateStr}** (unrecorded day)\n${metrics}`
      };
    }
    
    const enriched = enrichLog(log);
    const metrics = [
      `<ui:metrics>${JSON.stringify({ title: "Tasks Completed", value: enriched.tasksCompleted, unit: `of ${enriched.tasksAssigned}` })}</ui:metrics>`,
      `<ui:metrics>${JSON.stringify({ title: "Habits Completed", value: enriched.habitsCompleted, unit: `of ${enriched.habitsCompleted + enriched.habitsMissed}` })}</ui:metrics>`,
      `<ui:metrics>${JSON.stringify({ title: "Recurrings Completed", value: enriched.recurringsCompleted, unit: `of ${enriched.recurringsCompleted + enriched.recurringsMissed}` })}</ui:metrics>`,
      `<ui:metrics>${JSON.stringify({ title: "Load Status", value: enriched.loadStatus, unit: "" })}</ui:metrics>`
    ].join('\n');

    return {
      preformattedUi: `**Log for ${enriched.dateStr}** (${enriched.dayType})\n${metrics}`
    };
  },
  updateDayLog: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    await updateDayLog(userId, args.date, {
      dayType: args.dayType,
      updatedAt: nowSec(),
    });
    return {
      preformattedUi: `✓ Updated day log type to **${args.dayType}**.`
    };
  },
};
