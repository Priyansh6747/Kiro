/**
 * GET   /api/day-logs/:date  — fetch a single day log
 * PATCH /api/day-logs/:date  — update day_type (normal | adjusted | break)
 */

import { auth } from "@clerk/nextjs/server";
import { findDayLog, updateDayLog } from "@/lib/storage";
import { nowSec } from "@/lib/utils";
import type { NextRequest } from "next/server";

const VALID_DAY_TYPES = ["normal", "adjusted", "break"] as const;
type DayType = (typeof VALID_DAY_TYPES)[number];

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { date: dateStr } = await params;
  const date = Number(dateStr);
  if (Number.isNaN(date)) {
    return Response.json({ error: "date must be a unix day integer" }, { status: 400 });
  }

  const row = await findDayLog(userId, date);
  if (!row) return Response.json({ error: "Day log not found" }, { status: 404 });

  return Response.json({ data: row });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { date: dateStr } = await params;
  const date = Number(dateStr);
  if (Number.isNaN(date)) {
    return Response.json({ error: "date must be a unix day integer" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { day_type } = body as { day_type?: unknown };

  if (!day_type || !VALID_DAY_TYPES.includes(day_type as DayType)) {
    return Response.json(
      { error: `day_type must be one of: ${VALID_DAY_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const existing = await findDayLog(userId, date);
  if (!existing) return Response.json({ error: "Day log not found" }, { status: 404 });

  const updated = await updateDayLog(userId, date, {
    dayType: day_type as DayType,
    updatedAt: nowSec(),
  });

  return Response.json({ data: updated });
}
