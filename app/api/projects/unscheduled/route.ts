import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { projects, tasks, schedulingStrategies } from "@/lib/db/models";
import { eq, and, ne, notExists, desc } from "drizzle-orm";

export async function GET(request: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const allProjects = await db.select({
    id: projects.id,
    name: projects.name,
    deadlineAt: projects.deadlineAt,
  })
  .from(projects)
  .where(eq(projects.userId, userId))
  .orderBy(desc(projects.createdAt));

  const projectTasks = await db.select({
    projectId: tasks.projectId,
    id: tasks.id,
    estimateMin: tasks.estimateMin,
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
  );

  const unscheduledProjects = allProjects.map(p => {
    const pTasks = projectTasks.filter(t => t.projectId === p.id);
    return {
      ...p,
      estimateMin: pTasks.reduce((acc, t) => acc + t.estimateMin, 0),
    };
  }).filter(p => p.estimateMin > 0);

  return Response.json(unscheduledProjects, { status: 200 });
}
