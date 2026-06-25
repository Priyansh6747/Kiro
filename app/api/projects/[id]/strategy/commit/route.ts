import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { commitSchedule } from "@/lib/storage";
import type { DraftStrategy, GeneratedSchedule } from "@/lib/scheduling/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const strategy: DraftStrategy = body.strategy;
  const schedules: GeneratedSchedule[] = body.schedules;

  if (!schedules || schedules.length === 0) {
    return Response.json({ error: "No schedules to commit" }, { status: 400 });
  }

  const committedTaskIds = [];

  try {
    // Commit sequentially. The generator already ensured they don't overlap by using inFlightBlocks.
    for (const schedule of schedules) {
      if (schedule.blocks.length === 0) continue;
      const firstBlockDate = schedule.blocks.reduce((a, b) => a.planDate <= b.planDate ? a : b).planDate;
      
      await commitSchedule(
        userId,
        schedule.taskId,
        {
          taskId: schedule.taskId,
          importance: strategy.importance,
          minutesPerDay: strategy.minutesPerDay,
          activeDays: strategy.activeDays,
          preferredStartDate: strategy.preferredStartDate,
          deadlineAt: strategy.deadlineAt,
          isFlexible: strategy.isFlexible,
          acceptedRisk: (strategy as any).acceptedRisk || false,
          suggestedBy: strategy.suggestedBy,
        },
        schedule.blocks,
        firstBlockDate
      );
      committedTaskIds.push(schedule.taskId);
    }
    
    return Response.json({ committedTaskIds }, { status: 200 });
  } catch (err: any) {
    console.error("Batch commit error:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
