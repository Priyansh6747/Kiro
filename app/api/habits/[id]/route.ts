import { auth } from "@clerk/nextjs/server";
import { archiveHabit } from "@/lib/storage";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await archiveHabit(id);
  return Response.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  
  // NOTE: This relies on a new `updateHabit` function which we will add next
  const { updateHabit } = await import("@/lib/storage");
  const updated = await updateHabit(id, body);
  return Response.json(updated);
}
