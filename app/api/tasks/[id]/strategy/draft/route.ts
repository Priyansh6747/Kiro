import { auth } from "@clerk/nextjs/server";
import { todayUnixDay, localDateToUnixDay } from "@/lib/utils";
import type { DraftStrategy } from "@/lib/scheduling/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;
  const body = await request.json();
  const errors: Record<string, string> = {};

  const minutesPerDay = Number(body.minutesPerDay);
  if (isNaN(minutesPerDay) || minutesPerDay <= 0) {
    errors.minutesPerDay = "must be greater than 0";
  }

  const activeDays = body.activeDays as number[];
  if (!Array.isArray(activeDays) || activeDays.length === 0 || activeDays.some(d => d < 1 || d > 7)) {
    errors.activeDays = "must be a non-empty array of days (1-7)";
  }

  const preferredStartDate = Number(body.preferredStartDate);
  const today = todayUnixDay();
  if (isNaN(preferredStartDate) || preferredStartDate < today) {
    errors.preferredStartDate = "must not be in the past";
  }

  let deadlineAt: number | null = null;
  if (body.deadlineAt) {
    deadlineAt = Number(body.deadlineAt);
    if (isNaN(deadlineAt)) {
      errors.deadlineAt = "must be a valid timestamp";
    } else {
      const deadlineUnixDay = Math.floor(deadlineAt / 86400);
      if (deadlineUnixDay < preferredStartDate) {
        errors.deadlineAt = "must be after preferred start date";
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 });
  }

  const draft: DraftStrategy = {
    taskId,
    importance: Number(body.importance) || 3,
    minutesPerDay,
    activeDays,
    preferredStartDate,
    deadlineAt,
    isFlexible: Boolean(body.isFlexible),
    suggestedBy: "manual",
  };

  return Response.json(draft, { status: 200 });
}
