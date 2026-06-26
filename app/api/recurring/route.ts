import { auth } from "@clerk/nextjs/server";
import { listActiveRecurringTasks } from "@/lib/storage";

export async function GET(): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await listActiveRecurringTasks(userId);
  return Response.json({ data: rows });
}
