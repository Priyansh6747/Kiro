/**
 * DELETE /api/planner/day-plan/[taskId]
 * 
 * Remove a task from the day plan timeline.
 */

import { auth } from "@clerk/nextjs/server";
import { removeDayPlanBlock } from "@/lib/storage";
import type { NextRequest } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await params;
  const taskId = resolvedParams.taskId;

  if (!taskId) {
    return Response.json({ error: "taskId is required" }, { status: 400 });
  }

  try {
    await removeDayPlanBlock(userId, taskId);
    return Response.json({ data: "ok" }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error removing day plan block:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
