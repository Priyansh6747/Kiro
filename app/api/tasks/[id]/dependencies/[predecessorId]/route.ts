/**
 * DELETE /api/tasks/:id/dependencies/:predecessorId
 *
 * Remove a dependency edge between two tasks.
 * Validates that both tasks belong to the authenticated user before deleting.
 */

import { auth } from "@clerk/nextjs/server";
import { deleteTaskDependency, findTaskById } from "@/lib/storage";
import type { NextRequest } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; predecessorId: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, predecessorId } = await params;

  // Validate that both tasks belong to this user
  const [task, predecessor] = await Promise.all([
    findTaskById(id, userId),
    findTaskById(predecessorId, userId),
  ]);

  if (!task || !predecessor) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }

  await deleteTaskDependency(id, predecessorId);

  return Response.json({ data: "ok" });
}
