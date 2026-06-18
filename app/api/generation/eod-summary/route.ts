/**
 * POST /api/generation/eod-summary
 *
 * Generates a 3–4 sentence end-of-day summary via Groq.
 *
 * Requires:
 *   - A confirmed day_log for today (plan must have been locked in)
 *   - Task data updated within the last 8 hours
 */

import { auth } from "@clerk/nextjs/server";
import { callGroq } from "@/lib/groq";
import {
  findDayLog,
  findPrefsByUserId,
  latestTaskUpdateForDay,
  listTasks,
} from "@/lib/storage";
import { buildEodSummaryPrompt, type EodSummaryPayload } from "@/lib/scoring";
import { nowSec, todayUnixDay } from "@/lib/utils";

const STALE_THRESHOLD_SEC = 8 * 3600; // 8 hours

export async function POST(): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await findPrefsByUserId(userId);
  if (!prefs) return Response.json({ error: "Preferences not found" }, { status: 404 });

  const todayDate = todayUnixDay(prefs.timezone);
  const now       = nowSec();

  // ── Staleness check ───────────────────────────────────────────────────────
  const latestUpdate = await latestTaskUpdateForDay(userId, todayDate);
  if (latestUpdate === null || now - latestUpdate > STALE_THRESHOLD_SEC) {
    return Response.json({ error: "Task data is stale." }, { status: 422 });
  }

  // ── Day log must exist (plan confirmed) ───────────────────────────────────
  const dayLog = await findDayLog(userId, todayDate);
  if (!dayLog) {
    return Response.json(
      { error: "Confirm today's plan before generating summary." },
      { status: 422 },
    );
  }

  // ── Fetch today's tasks ───────────────────────────────────────────────────
  const allTasks = await listTasks({ userId, date: todayDate });

  const doneTasks    = allTasks.filter((t) => t.status === "done");
  const missedTasks  = allTasks.filter(
    (t) => t.status === "missed" || t.status === "carried",
  );

  const payload: EodSummaryPayload = {
    assigned: allTasks.length,
    completed: doneTasks.length,
    missed: missedTasks.length,
    ratio: dayLog.ratio,
    doneTasks: doneTasks.map((t) => t.title),
    missedTasks: missedTasks.map((t) => t.title),
    day_type: dayLog.dayType,
  };

  // ── Build prompt and call Groq ───────────────────────────────────────────
  const prompt      = buildEodSummaryPrompt(payload);
  const summaryText = await callGroq(prompt, 300);

  return Response.json({ data: { summary: summaryText, stats: payload } });
}
