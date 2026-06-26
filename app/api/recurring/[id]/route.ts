import { auth } from "@clerk/nextjs/server";
import { archiveRecurringTask } from "@/lib/storage";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await archiveRecurringTask(id);
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
  
  // NOTE: This relies on a new `updateRecurringTask` function which we will add next
  const { updateRecurringTask } = await import("@/lib/storage");
  const updated = await updateRecurringTask(id, body);
  return Response.json(updated);
}
