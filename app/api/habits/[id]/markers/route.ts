import { auth } from "@clerk/nextjs/server";
import { getHabitMarkersInRange } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");

  if (!fromStr || !toStr) {
    return Response.json({ error: "Missing from/to params" }, { status: 400 });
  }

  try {
    const { id } = await params;
    const markers = await getHabitMarkersInRange(userId, id, parseInt(fromStr), parseInt(toStr));
    return Response.json({ data: markers });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
