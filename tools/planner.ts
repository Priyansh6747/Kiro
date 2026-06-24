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
      name: "show_day_plan",
      description:
        "Get and show the day plan for a specific date (the scheduled blocks/order).",
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
      name: "show_today_agenda",
      description:
        "Get and show today's agenda including unconfirmed tasks, as well as the 'bucket' (pending tasks without a scheduled date).",
      parameters: { 
        type: "object", 
        properties: { 
          dummy: { type: "string", description: "Optional. Leave empty." } 
        }, 
        required: [] 
      },
    },
  },
];

export const plannerHandlers: Record<string, Function> = {
  show_day_plan: async (args: any) => {
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
    
    const plans = await listDayPlansForDate(userId, targetDate);
    
    if (plans.length === 0) return { preformattedUi: `_No day plan found for this date._` };
    
    const rows = plans.map((p) => [
      p.taskId.substring(0, 8) + "...",
      new Date(p.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      new Date(p.planDate).toLocaleDateString()
    ]);

    return {
      preformattedUi: `<ui:table>${JSON.stringify({ headers: ["Task ID", "Start Time", "Plan Date"], rows, caption: "Day Plan" })}</ui:table>`
    };
  },
  show_today_agenda: async (args: any) => {
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
    const projectMap = Object.fromEntries(userProjects.map((p: any) => [p.id, p.name]));
    
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

    const enrichedAgenda = agenda.map(enrich);
    const enrichedBucket = bucket.map(enrich);

    const rows: string[][] = [];
    
    enrichedAgenda.forEach((t: any) => {
      rows.push([t.scheduledDate || 'Unscheduled', t.title, t.projectName, t.estimateMin ? t.estimateMin + ' min' : '-']);
    });
    
    enrichedBucket.forEach((t: any) => {
      rows.push(['Unscheduled', t.title, t.projectName, t.estimateMin ? t.estimateMin + ' min' : '-']);
    });

    let markdown = "Here's your agenda for today:\n";
    if (rows.length === 0) {
      markdown = "Your agenda and bucket are completely empty for today!";
    } else {
      const tableData = {
        headers: ["Time / Status", "Title", "Project", "Estimate"],
        rows: rows,
      };
      markdown += `\n<ui:table>${JSON.stringify(tableData)}</ui:table>`;
    }

    return { 
      agenda: enrichedAgenda, 
      bucket: enrichedBucket,
      preformattedUi: markdown
    };
  },
};
