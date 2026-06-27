import { auth } from "@clerk/nextjs/server";
import { listActiveRecurringTasks, createRecurringTask, ensureRecurringMarkersForDate, syncDayLogStats, getOrCreatePreferences } from "@/lib/storage";
import { randomUUID } from "crypto";
import { nowSec, todayUnixDay } from "@/lib/utils";

export async function GET(): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await listActiveRecurringTasks(userId);
  return Response.json({ data: rows });
}

export async function POST(req: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const rt = await createRecurringTask({
    id: randomUUID(),
    userId,
    title: body.title,
    projectId: body.projectId || null,
    importance: 3,
    cadence: body.cadence,
    activeDays: body.activeDays || null,
    recurrenceRule: body.recurrenceRule || null,
    estimateMin: body.estimateMin || 30,
    createdAt: nowSec(),
    updatedAt: nowSec()
  });

  const prefs = await getOrCreatePreferences(userId);
  const today = todayUnixDay(prefs.timezone);
  await ensureRecurringMarkersForDate(userId, today);
  await syncDayLogStats(userId, today);

  return Response.json({ data: rt });
}
