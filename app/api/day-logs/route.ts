/**
 * GET /api/day-logs
 *
 * Returns day logs for a date range.
 * Defaults to the last 7 days when no from/to query params are provided.
 */

import { auth } from "@clerk/nextjs/server";
import { findPrefsByUserId, listDayLogs } from "@/lib/storage";
import { todayUnixDay } from "@/lib/utils";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await findPrefsByUserId(userId);
  const todayDate = todayUnixDay(prefs?.timezone ?? "UTC");

  const sp  = request.nextUrl.searchParams;
  const from = sp.has("from") ? Number(sp.get("from")) : todayDate - 6;
  const to   = sp.has("to")   ? Number(sp.get("to"))   : todayDate;

  if (Number.isNaN(from) || Number.isNaN(to)) {
    return Response.json({ error: "from and to must be unix day integers" }, { status: 400 });
  }

  const rows = await listDayLogs(userId, from, to);
  return Response.json({ data: rows });
}
