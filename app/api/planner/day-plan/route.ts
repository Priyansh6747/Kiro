/**
 * POST /api/planner/day-plan
 *
 * Upsert a task into the day plan.
 */

import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { OverlapConflictError, placeDayPlanBlock } from "@/lib/storage";

export async function POST(request: NextRequest): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { task_id, plan_date, start_time } = body as {
    task_id?: unknown;
    plan_date?: unknown;
    start_time?: unknown;
  };

  if (typeof task_id !== "string") {
    return Response.json(
      { error: "task_id is required and must be a string" },
      { status: 400 },
    );
  }

  const planDate = Number(plan_date);
  const startTime = Number(start_time);

  if (Number.isNaN(planDate)) {
    return Response.json(
      { error: "plan_date must be a number" },
      { status: 400 },
    );
  }
  if (Number.isNaN(startTime)) {
    return Response.json(
      { error: "start_time must be a number" },
      { status: 400 },
    );
  }

  try {
    await placeDayPlanBlock(userId, task_id, planDate, startTime);
    return Response.json({ data: "ok" }, { status: 200 });
  } catch (err) {
    if (err instanceof OverlapConflictError) {
      return Response.json({ error: "OVERLAP_CONFLICT" }, { status: 409 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Task not found") {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
