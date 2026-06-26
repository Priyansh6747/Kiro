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
