import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/models";
import { eq, and } from "drizzle-orm";
import { commitSchedule } from "@/lib/storage";
import type { DraftStrategy, GeneratedSchedule } from "@/lib/scheduling/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;
  const body = await request.json();
  const strategy: DraftStrategy = body.strategy;
  const schedule: GeneratedSchedule = body.schedule;

  const task = await db.select({ id: tasks.id })
    .from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).get();
  
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  if (schedule.blocks.length === 0) {
    return Response.json({ error: "No blocks to schedule" }, { status: 400 });
  }

  const firstBlockDate = schedule.blocks.reduce((a, b) => a.planDate <= b.planDate ? a : b).planDate;

  try {
    const { strategyId } = await commitSchedule(
      userId,
      taskId,
      {
        taskId,
        importance: strategy.importance,
        minutesPerDay: strategy.minutesPerDay,
        activeDays: strategy.activeDays,
        preferredStartDate: strategy.preferredStartDate,
        deadlineAt: strategy.deadlineAt,
        isFlexible: strategy.isFlexible,
        acceptedRisk: strategy.isFlexible ? false : true, // simplify logic for now, UI can pass explicitly
        suggestedBy: strategy.suggestedBy,
      },
      schedule.blocks,
      firstBlockDate
    );
    return Response.json({ strategyId }, { status: 200 });
  } catch (err: any) {
    if (err.message === "ALREADY_SCHEDULED") {
      return Response.json({ error: "This task is already scheduled. Use reschedule instead." }, { status: 409 });
    }
    console.error("Error committing schedule:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
