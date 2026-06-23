import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { listTaskDependenciesForProject } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deps = await listTaskDependenciesForProject(id);
  return Response.json({ data: deps });
}
