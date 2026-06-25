import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { tasks, preferences } from "@/lib/db/models";
import { eq, and } from "drizzle-orm";
import { generateSchedule } from "@/lib/scheduling/generator";
import { getPredecessorTasks } from "@/lib/storage";
import { unixDayToISODate } from "@/lib/scheduling/capacity";
import type { DraftStrategy } from "@/lib/scheduling/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;
  const strategy: DraftStrategy = await request.json();

  const task = await db.select({ id: tasks.id, title: tasks.title, estimateMin: tasks.estimateMin })
    .from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).get();
  
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  const prefs = await db.select().from(preferences).where(eq(preferences.userId, userId)).get();
  const defaultAvailableMin = prefs?.defaultAvailableMin ?? 240;

  // Compute predecessorCompletionDay
  const predecessors = await getPredecessorTasks(task.id);
  let predecessorCompletionDay = 0;
  for (const p of predecessors) {
    if (p.status !== "done" && p.scheduledDate) {
      predecessorCompletionDay = Math.max(predecessorCompletionDay, p.scheduledDate);
    }
  }

  const result = await generateSchedule(userId, strategy, task, predecessorCompletionDay, defaultAvailableMin);

  return Response.json(result, { status: 200 });
}
