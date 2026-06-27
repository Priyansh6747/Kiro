import { auth } from "@clerk/nextjs/server";
import { getRecurringMarkersInRange, markRecurring, getOrCreatePreferences, syncDayLogStats } from "@/lib/storage";
import { todayUnixDay } from "@/lib/utils";

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
    const markers = await getRecurringMarkersInRange(userId, id, parseInt(fromStr), parseInt(toStr));
    return Response.json({ data: markers });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    
    // date can be specified, or it defaults to today
    let date = body.date;
    if (date === undefined) {
      const prefs = await getOrCreatePreferences(userId);
      date = todayUnixDay(prefs.timezone);
    }
    
    const marker = await markRecurring(id, date, body.status);
    await syncDayLogStats(userId, date);
    return Response.json({ data: marker });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
