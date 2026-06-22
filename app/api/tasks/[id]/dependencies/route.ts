/**
 * POST /api/tasks/:id/dependencies
 *
 * Add a dependency edge: task `:id` depends on `predecessor_id`.
 * Guards against cross-project dependencies and circular dependency cycles.
 */

import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import {
  findTaskById,
  insertTaskDependency,
  isCyclicDependency,
} from "@/lib/storage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await findTaskById(id, userId);
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { predecessor_id } = body as { predecessor_id?: unknown };
  if (!predecessor_id || typeof predecessor_id !== "string") {
    return Response.json(
      { error: "predecessor_id is required" },
      { status: 400 },
    );
  }

  const predecessor = await findTaskById(predecessor_id, userId);
  if (!predecessor)
    return Response.json(
      { error: "Predecessor task not found" },
      { status: 404 },
    );

  // Dependencies must be intra-project
  if (task.projectId !== predecessor.projectId) {
    return Response.json(
      { error: "Dependencies must be intra-project" },
      { status: 422 },
    );
  }

  // Cycle detection: would adding predecessor_id → id create a cycle?
  // Check if `id` is already an ancestor of `predecessor_id` in task_closure.
  const cyclic = await isCyclicDependency(id, predecessor_id);
  if (cyclic) {
    return Response.json(
      { error: "Circular dependency detected" },
      { status: 422 },
    );
  }

  // Insert (idempotent via ON CONFLICT DO NOTHING)
  await insertTaskDependency(id, predecessor_id);

  return Response.json({ data: "ok" }, { status: 201 });
}
