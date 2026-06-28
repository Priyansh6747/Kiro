/**
 * GET /api/planner/today
 *
 * Returns today's scheduled tasks, capacity math, overload flag, and the
 * existing day_log row (if any). Read-only — does not write anything.
 */

import { auth } from "@clerk/nextjs/server";
import {
  autoRevertMissedProjectTasks,
  createTask,
  findDayLog,
  findTodayInstanceOfTemplate,
  getOrCreatePreferences,
  insertTaskClosureSelf,
  listDayPlansForDate,
  listHabitDayPlansForDate,
  listRecurringDayPlansForDate,
  listRecurringTemplateTasks,
  listTaskDependenciesForTasks,
  listTasks,
} from "@/lib/storage";
import { nowSec, todayUnixDay } from "@/lib/utils";

const DAY_ABBREV = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function ruleMatchesToday(rule: string, dateObj: Date): boolean {
  if (rule === "daily") return true;
  if (rule === "weekly") return dateObj.getUTCDay() === 1; // Default weekly to Monday

  const todayStr = DAY_ABBREV[dateObj.getUTCDay()];
  const days = rule.split(",").map((d) => d.trim().toUpperCase());
  return days.includes(todayStr);
}

export async function GET(req: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await getOrCreatePreferences(userId);

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const todayDate = dateParam
    ? parseInt(dateParam, 10)
    : todayUnixDay(prefs.timezone);
  const now = nowSec();

  // ── Auto-generate recurring instances for today ──────────────────────────
  const templates = await listRecurringTemplateTasks(userId);
  const dateObj = new Date(todayDate * 86400000);

  for (const t of templates) {
    if (t.taskRecurrenceEndsAt && now > t.taskRecurrenceEndsAt) {
      continue; // Recurrence expired
    }

    if (ruleMatchesToday(t.taskRecurrenceRule, dateObj)) {
      const existing = await findTodayInstanceOfTemplate(t.taskId, todayDate);
      if (!existing) {
        const newTaskId = crypto.randomUUID();
        await createTask({
          id: newTaskId,
          userId,
          projectId: t.projectId,
          parentId: null,
          carriedFromId: t.taskId, // Link to template
          title: t.taskTitle,
          estimateMin: t.taskEstimateMin,
          status: "pending",
          scheduledDate: todayDate,
          deadlineAt: null,
          completedAt: null,
          deletedAt: null,
          recurrenceRule: null, // Instance is one-off
          recurrenceEndsAt: null,
          createdAt: now,
          updatedAt: now,
        });
        await insertTaskClosureSelf(newTaskId);
      }
    }
  }

  // ── Auto-revert missed project tasks to bucket ────────────────────────────
  await autoRevertMissedProjectTasks(userId, todayDate);

  const scheduledTasks = await listTasks({ userId, date: todayDate });

  const totalEstimatedMin = scheduledTasks.reduce(
    (sum, t) => sum + t.estimateMin,
    0,
  );
  const availableMin = prefs.defaultAvailableMin;

  // Overloaded if estimated work exceeds 120% of available capacity
  const overloaded = totalEstimatedMin > availableMin * 1.2;

  const dayLog = await findDayLog(userId, todayDate);
  const dayPlans = await listDayPlansForDate(userId, todayDate);
  const habitDayPlans = await listHabitDayPlansForDate(userId, todayDate);
  const recurringDayPlans = await listRecurringDayPlansForDate(userId, todayDate);

  const taskIds = scheduledTasks.map((t) => t.id);
  const taskDependencies = await listTaskDependenciesForTasks(taskIds);

  return Response.json({
    data: {
      date: todayDate,
      tasks: scheduledTasks,
      totalEstimatedMin,
      availableMin,
      overloaded,
      dayLog: dayLog ?? null,
      dayPlans,
      habitDayPlans,
      recurringDayPlans,
      taskDependencies,
    },
  });
}
