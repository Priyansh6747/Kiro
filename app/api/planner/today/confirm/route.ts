/**
 * POST /api/planner/today/confirm
 *
 * Locks in the user's plan for today by creating or updating the day_log row
 * with declared capacity and the current scheduled-task count.
 */

import { auth } from "@clerk/nextjs/server";
import { findPrefsByUserId, listTasks, upsertDayLog } from "@/lib/storage";
import { nowSec, todayUnixDay } from "@/lib/utils";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await findPrefsByUserId(userId);
  if (!prefs) return Response.json({ error: "Preferences not found" }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const todayDate = todayUnixDay(prefs.timezone);

  // Optional available_min override
  let availableMin = prefs.defaultAvailableMin;
  if (body.available_min !== undefined && body.available_min !== null) {
    availableMin = Number(body.available_min);
    if (!Number.isInteger(availableMin) || availableMin <= 0 || availableMin > 1440) {
      return Response.json(
        { error: "available_min must be a positive integer ≤ 1440" },
        { status: 400 },
      );
    }
  }

  const scheduledTasks = await listTasks({ userId, date: todayDate });
  const tasksAssigned  = scheduledTasks.length;
  const now            = nowSec();

  const dayLog = await upsertDayLog({
    id: crypto.randomUUID(),
    userId,
    date: todayDate,
    availableMin,
    tasksAssigned,
    tasksCompleted: 0,
    tasksMissed: 0,
    tasksCarried: 0,
    ratio: 0.0,
    penalty: 0.0,
    dayType: "normal",
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({ data: dayLog });
}
