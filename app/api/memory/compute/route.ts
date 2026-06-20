/**
 * POST /api/memory/compute
 *
 * Internal / cron-triggered route that computes rolling 14-day memory
 * baselines for every active user. Secured with an x-cron-secret header.
 *
 * This is an append-only write — historical baseline rows are never mutated.
 *
 * Vercel cron config (vercel.json):
 *   "crons": [{ "path": "/api/memory/compute", "schedule": "0 2 * * *" }]
 */

import {
  insertMemoryBaseline,
  listDistinctUserIds,
  listNormalDayLogs,
} from "@/lib/storage";
import { nowSec, todayUnixDay } from "@/lib/utils";
import type { NextRequest } from "next/server";

const MIN_DATA_POINTS = 3; // skip users with fewer than 3 normal day logs

export async function POST(request: NextRequest): Promise<Response> {
  // ── Authentication: cron secret ───────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const provided = request.headers.get("x-cron-secret");
  if (provided !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Compute baselines for all users ──────────────────────────────────────
  const allUserIds = await listDistinctUserIds();
  const todayDate = todayUnixDay(); // UTC (cron context)
  const cutoff = todayDate - 14;
  const now = nowSec();

  let processed = 0;

  for (const userId of allUserIds) {
    const last14 = await listNormalDayLogs(userId, cutoff, todayDate);

    // Skip users without enough data
    if (last14.length < MIN_DATA_POINTS) continue;

    const avgCompleted = avg(last14.map((l) => l.tasksCompleted));
    const avgAssigned = avg(last14.map((l) => l.tasksAssigned));
    const avgRatio = avg(last14.map((l) => l.ratio));

    const todayLog = last14.find((l) => l.date === todayDate);
    const baselineDeviation = todayLog ? todayLog.ratio - avgRatio : 0.0;

    await insertMemoryBaseline({
      id: crypto.randomUUID(),
      userId,
      computedAt: now,
      rolling14dAvgCompleted: avgCompleted,
      rolling14dAvgAssigned: avgAssigned,
      rolling14dAvgRatio: avgRatio,
      baselineDeviation,
      createdAt: now,
    });

    processed++;
  }

  return Response.json({ data: { processed } });
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
