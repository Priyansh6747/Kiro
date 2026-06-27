import { auth } from "@clerk/nextjs/server";
import { listActiveHabits, createHabit, ensureHabitMarkersForDate, syncDayLogStats, getOrCreatePreferences } from "@/lib/storage";
import { randomUUID } from "crypto";
import { nowSec, todayUnixDay } from "@/lib/utils";

export async function GET(): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await listActiveHabits(userId);
  return Response.json({ data: rows });
}

export async function POST(req: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const habit = await createHabit({
    id: randomUUID(),
    userId,
    name: body.name,
    importance: 3,
    cadence: body.cadence,
    activeDays: body.activeDays || null,
    estimateMin: body.estimateMin || 30,
    createdAt: nowSec(),
    updatedAt: nowSec()
  });

  const prefs = await getOrCreatePreferences(userId);
  const today = todayUnixDay(prefs.timezone);
  await ensureHabitMarkersForDate(userId, today);
  await syncDayLogStats(userId, today);

  return Response.json({ data: habit });
}
