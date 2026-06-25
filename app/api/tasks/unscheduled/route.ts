import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { tasks, schedulingStrategies } from "@/lib/db/models";
import { eq, and, ne, notExists, desc } from "drizzle-orm";

export async function GET(request: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Get tasks that are not done and don't have a scheduling strategy yet
  const unscheduledTasks = await db.select({
    id: tasks.id,
    title: tasks.title,
    estimateMin: tasks.estimateMin,
    deadlineAt: tasks.deadlineAt
  })
  .from(tasks)
  .where(
    and(
      eq(tasks.userId, userId),
      ne(tasks.status, "done"),
      notExists(
        db.select().from(schedulingStrategies).where(eq(schedulingStrategies.taskId, tasks.id))
      )
    )
  )
  .orderBy(desc(tasks.createdAt))
  .limit(20);

  return Response.json(unscheduledTasks, { status: 200 });
}
