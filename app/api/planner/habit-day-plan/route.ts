import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { placeHabitDayPlanBlock } from "@/lib/storage";

export async function POST(request: NextRequest): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { habit_id, plan_date, start_time } = body as {
    habit_id?: unknown;
    plan_date?: unknown;
    start_time?: unknown;
  };

  if (typeof habit_id !== "string") {
    return Response.json(
      { error: "habit_id is required and must be a string" },
      { status: 400 },
    );
  }

  const planDate = Number(plan_date);
  const startTime = Number(start_time);

  if (Number.isNaN(planDate) || Number.isNaN(startTime)) {
    return Response.json({ error: "plan_date and start_time must be numbers" }, { status: 400 });
  }

  try {
    await placeHabitDayPlanBlock(userId, habit_id, planDate, startTime);
    return Response.json({ data: "ok" }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
