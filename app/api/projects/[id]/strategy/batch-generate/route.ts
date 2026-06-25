import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { tasks, taskDependencies, projects, preferences } from "@/lib/db/models";
import { eq, and, ne, notExists, inArray } from "drizzle-orm";
import { batchGenerateSchedule } from "@/lib/scheduling/generator";
import { schedulingStrategies } from "@/lib/db/models";
import type { DraftStrategy } from "@/lib/scheduling/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const body = await request.json();
  const strategy: DraftStrategy = body;

  const userPrefs = await db.select().from(preferences).where(eq(preferences.userId, userId)).get();
  const defaultAvailableMin = userPrefs?.defaultAvailableMin ?? 120;

  // Fetch unscheduled tasks for this project
  const projectTasks = await db.select({
    id: tasks.id,
    title: tasks.title,
    estimateMin: tasks.estimateMin,
  })
  .from(tasks)
  .where(
    and(
      eq(tasks.userId, userId),
      eq(tasks.projectId, projectId),
      ne(tasks.status, "done"),
      notExists(
        db.select().from(schedulingStrategies).where(eq(schedulingStrategies.taskId, tasks.id))
      )
    )
  );

  if (projectTasks.length === 0) {
    return Response.json({ error: "No unscheduled tasks found in project" }, { status: 400 });
  }

  const taskIds = projectTasks.map(t => t.id);

  const deps = await db.select({
    taskId: taskDependencies.taskId,
    predecessorId: taskDependencies.predecessorId,
  })
  .from(taskDependencies)
  .where(inArray(taskDependencies.taskId, taskIds));

  const taskPredecessors: Record<string, string[]> = {};
  for (const d of deps) {
    if (!taskPredecessors[d.taskId]) taskPredecessors[d.taskId] = [];
    taskPredecessors[d.taskId].push(d.predecessorId);
  }

  // Topologically sort the tasks
  const sortedTasks: typeof projectTasks = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(taskId: string) {
    if (visited.has(taskId)) return;
    if (visiting.has(taskId)) throw new Error("Cycle detected");
    visiting.add(taskId);
    
    const preds = taskPredecessors[taskId] || [];
    for (const p of preds) {
      if (taskIds.includes(p)) visit(p);
    }
    
    visiting.delete(taskId);
    visited.add(taskId);
    const task = projectTasks.find(t => t.id === taskId);
    if (task) sortedTasks.push(task);
  }

  for (const id of taskIds) visit(id);

  try {
    const result = await batchGenerateSchedule(
      userId,
      strategy,
      sortedTasks,
      taskPredecessors,
      defaultAvailableMin
    );
    return Response.json(result, { status: 200 });
  } catch (err: any) {
    console.error("Batch generate error:", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
