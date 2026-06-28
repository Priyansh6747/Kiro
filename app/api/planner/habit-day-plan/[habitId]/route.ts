import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { removeHabitDayPlanBlock } from "@/lib/storage";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const planDate = Number(searchParams.get("date"));
  const { habitId } = await params;

  if (Number.isNaN(planDate)) {
    return Response.json({ error: "date must be a valid number" }, { status: 400 });
  }

  try {
    await removeHabitDayPlanBlock(userId, habitId, planDate);
    return Response.json({ data: "ok" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
