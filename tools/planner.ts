import { auth } from "@clerk/nextjs/server";
import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { listDayPlansForDate, listTasks, getDailyHabitBlocks, markHabit, markRecurring } from "@/lib/storage";
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
  {
    type: "function",
    function: {
      name: "schedule_task_timeline",
      description:
        "Schedule a task into a specific time block on the daily timeline.",
      parameters: {
        type: "object",
        properties: {
          taskTitle: { type: "string", description: "Title of the task to schedule" },
          projectName: { type: "string", description: "Project name to disambiguate" },
          date: { type: ["number", "string"], description: "Unix day integer OR YYYY-MM-DD string" },
          timeOfDay: { type: "string", description: "Time of day in HH:MM format (24-hour) local time" },
        },
        required: ["taskTitle", "date", "timeOfDay"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_habit",
      description: "Mark a habit as done, skipped, or missed for today.",
      parameters: {
        type: "object",
        properties: {
          habitId: { type: "string" },
          status: { type: "string", enum: ["done", "skipped", "missed", "pending"] },
        },
        required: ["habitId", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_recurring",
      description: "Mark a recurring task as done, carried, or missed for today.",
      parameters: {
        type: "object",
        properties: {
          recurringTaskId: { type: "string" },
          status: { type: "string", enum: ["done", "carried", "missed", "pending"] },
        },
        required: ["recurringTaskId", "status"],
      },
    },
  },
];

export const plannerHandlers: Record<string, Function> = {
  show_day_plan: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    
    let targetDate = args.date;
    if (targetDate === "today" || targetDate === "now") {
      const { getOrCreatePreferences } = await import("@/lib/storage");
      const { todayUnixDay } = await import("@/lib/utils");
      const prefs = await getOrCreatePreferences(userId);
      targetDate = todayUnixDay(prefs.timezone);
    } else if (typeof targetDate === "string") {
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
    
    // Add Habits and Recurring Tasks (Phase 5)
    const { habits, recurring } = await getDailyHabitBlocks(userId, todayDate);
    
    habits.forEach((h: any) => {
      let displayStatus = "⬜ Pending";
      if (h.status === "done") displayStatus = "✅ Done";
      else if (h.status === "missed") displayStatus = "❌ Missed";
      else if (h.status === "skipped") displayStatus = "⏭️ Skipped";
      
      rows.push([displayStatus, `✦ ${h.name} (Habit)`, "Habits", h.estimateMin ? h.estimateMin + ' min' : '-']);
    });
    
    recurring.forEach((rt: any) => {
      let displayStatus = "⬜ Pending";
      if (rt.status === "done") displayStatus = "✅ Done";
      else if (rt.status === "missed") displayStatus = "❌ Missed";
      else if (rt.status === "carried") displayStatus = "➡️ Carried";
      
      rows.push([displayStatus, `↻ ${rt.title} (Recurring)`, "Recurring", rt.estimateMin ? rt.estimateMin + ' min' : '-']);
    });
    
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
  schedule_task_timeline: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    let targetDate = args.date;
    if (targetDate === "today" || targetDate === "now") {
      const { getOrCreatePreferences } = await import("@/lib/storage");
      const { todayUnixDay } = await import("@/lib/utils");
      const prefs = await getOrCreatePreferences(userId);
      targetDate = todayUnixDay(prefs.timezone);
    } else if (typeof targetDate === "string") {
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

    const { findProjectByName, findTaskByTitle, placeDayPlanBlock, OverlapConflictError, getOrCreatePreferences } = await import("@/lib/storage");
    
    let projectId: string | undefined;
    if (args.projectName) {
      const project = await findProjectByName(args.projectName, userId);
      if (project) projectId = project.id;
    }
    
    const task = await findTaskByTitle(args.taskTitle, userId, projectId);
    if (!task) return { preformattedUi: `Task "${args.taskTitle}" not found. Stop trying to schedule this task.` };

    let timeStr = args.timeOfDay.toLowerCase().replace(/\s+/g, '');
    let isPM = timeStr.includes("pm");
    let isAM = timeStr.includes("am");
    timeStr = timeStr.replace(/[a-z]/g, '');
    
    const timeParts = timeStr.split(":");
    let hh = parseInt(timeParts[0] || "0", 10);
    let mm = parseInt(timeParts[1] || "0", 10);
    
    if (isPM && hh < 12) hh += 12;
    if (isAM && hh === 12) hh = 0;

    const prefs = await getOrCreatePreferences(userId);
    const tz = prefs.timezone;

    const utcDate = new Date(targetDate * 86400000);
    const isoStr = `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth()+1).padStart(2, '0')}-${String(utcDate.getUTCDate()).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
    const approxDate = new Date(isoStr + 'Z'); 
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    
    const parts = formatter.formatToParts(approxDate);
    const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value;
    
    let offsetMs = 0;
    if (offsetPart && offsetPart.startsWith('GMT')) {
      const sign = offsetPart.includes('+') ? 1 : -1;
      const match = offsetPart.match(/\d+:\d+/);
      if (match) {
        const [oH, oM] = match[0].split(':').map(Number);
        offsetMs = sign * (oH * 3600000 + oM * 60000);
      }
    }
    
    const exactTimeMs = approxDate.getTime() - offsetMs;
    const startTime = Math.floor(exactTimeMs / 1000);

    try {
      const { updateTask } = await import("@/lib/storage");
      await placeDayPlanBlock(userId, task.id, targetDate, startTime);
      await updateTask(task.id, { scheduledDate: targetDate });
      return {
        preformattedUi: `Task **${task.title}** has been scheduled successfully for ${args.timeOfDay} on ${args.date}.`
      };
    } catch (e: any) {
      if (e instanceof OverlapConflictError) {
        return { preformattedUi: `⚠️ Cannot schedule **${task.title}** at ${args.timeOfDay} due to an overlap conflict with another task.` };
      }
      return { preformattedUi: `❌ Failed to schedule: ${e.message}` };
    }
  },
  mark_habit: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const { getOrCreatePreferences, markHabit } = await import("@/lib/storage");
    const { todayUnixDay } = await import("@/lib/utils");
    const prefs = await getOrCreatePreferences(userId);
    const todayDate = todayUnixDay(prefs.timezone);
    
    await markHabit(args.habitId, todayDate, args.status);
    return {
      preformattedUi: `✓ Habit marked as **${args.status}** for today.`
    };
  },
  mark_recurring: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const { getOrCreatePreferences, markRecurring } = await import("@/lib/storage");
    const { todayUnixDay } = await import("@/lib/utils");
    const prefs = await getOrCreatePreferences(userId);
    const todayDate = todayUnixDay(prefs.timezone);
    
    await markRecurring(args.recurringTaskId, todayDate, args.status);
    return {
      preformattedUi: `✓ Recurring task marked as **${args.status}** for today.`
    };
  }
};
