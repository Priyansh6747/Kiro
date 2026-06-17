/**
 * GET /api/planner/today
 *
 * Returns today's scheduled tasks, capacity math, overload flag, and the
 * existing day_log row (if any). Read-only — does not write anything.
 */

import { auth } from "@clerk/nextjs/server";
import { findDayLog, findPrefsByUserId, listTasks } from "@/lib/storage";
import { todayUnixDay } from "@/lib/utils";

export async function GET(): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await findPrefsByUserId(userId);
  if (!prefs) return Response.json({ error: "Preferences not found" }, { status: 404 });

  const todayDate = todayUnixDay(prefs.timezone);

  const scheduledTasks = await listTasks({ userId, date: todayDate });

  const totalEstimatedMin = scheduledTasks.reduce(
    (sum, t) => sum + t.estimateMin,
    0,
  );
  const availableMin = prefs.defaultAvailableMin;

  // Overloaded if estimated work exceeds 120% of available capacity
  const overloaded = totalEstimatedMin > availableMin * 1.2;

  const dayLog = await findDayLog(userId, todayDate);

  return Response.json({
    data: {
      date: todayDate,
      tasks: scheduledTasks,
      totalEstimatedMin,
      availableMin,
      overloaded,
      dayLog: dayLog ?? null,
    },
  });
}
