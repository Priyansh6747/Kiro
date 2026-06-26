import { auth } from "@clerk/nextjs/server";
import { computeHabitStreak } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const streak = await computeHabitStreak(userId, id);
  return Response.json({ data: streak });
}
