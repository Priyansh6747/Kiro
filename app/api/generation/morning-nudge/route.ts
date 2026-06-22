/**
 * POST /api/generation/morning-nudge
 *
 * Generates a 2–3 sentence motivational morning nudge via Groq.
 * Scores all active projects and surfaces the top 2 that need attention most.
 *
 * Guards against stale data (rejects if no task updated in the last 8 hours).
 */

import { auth } from "@clerk/nextjs/server";
import { callGroq } from "@/lib/groq";
import {
  buildMorningNudgePrompt,
  type ProjectStats,
  topScoredProjects,
} from "@/lib/scoring";
import {
  getOrCreatePreferences,
  latestTaskUpdateSec,
  listProjectsWithStats,
} from "@/lib/storage";
import { nowSec, todayUnixDay } from "@/lib/utils";

const STALE_THRESHOLD_SEC = 8 * 3600; // 8 hours

export async function POST(): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await getOrCreatePreferences(userId);

  const todayDate = todayUnixDay(prefs.timezone);
  const now = nowSec();

  // ── Staleness check ───────────────────────────────────────────────────────
  const latestUpdate = await latestTaskUpdateSec(userId);
  if (latestUpdate === null || now - latestUpdate > STALE_THRESHOLD_SEC) {
    return Response.json(
      { error: "Task data is stale. Update your tasks first." },
      { status: 422 },
    );
  }

  // ── Fetch projects with scoring inputs ────────────────────────────────────
  const rawProjects = await listProjectsWithStats(userId, todayDate);

  const projectStats: ProjectStats[] = rawProjects.map((p) => ({
    id: p.id,
    name: p.name,
    importance: p.importance,
    type: p.type,
    deadlineAt: p.deadlineAt,
    lastCompletedAt: p.lastCompletedAt,
    todayCount: p.todayCount,
  }));

  // ── Score and pick top 2 (pure functions — no DB) ─────────────────────────
  const top2 = topScoredProjects(projectStats, 2, now, prefs.timezone);

  // ── Build prompt and call Groq ───────────────────────────────────────────
  const prompt = buildMorningNudgePrompt({
    top2,
    todayDate,
    timezone: prefs.timezone,
  });
  const nudgeText = await callGroq(prompt, 200);

  return Response.json({ data: { nudge: nudgeText, projects: top2 } });
}
