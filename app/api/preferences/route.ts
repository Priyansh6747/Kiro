/**
 * GET   /api/preferences  — fetch the authenticated user's preferences
 * PATCH /api/preferences  — update one or more preference fields
 */

import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { getOrCreatePreferences, updatePreferences } from "@/lib/storage";
import { isValidHHMM, isValidTimezone, nowSec } from "@/lib/utils";

const VALID_RATIO_MODES = ["cumulative", "streak"] as const;
type RatioMode = (typeof VALID_RATIO_MODES)[number];

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await getOrCreatePreferences(userId);

  return Response.json({ data: prefs });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Parameters<typeof updatePreferences>[1] = {};

  // ── timezone ───────────────────────────────────────────────────────────────
  if ("timezone" in body) {
    const tz = body.timezone;
    if (typeof tz !== "string" || !isValidTimezone(tz)) {
      return Response.json(
        { error: "timezone must be a valid IANA timezone" },
        { status: 400 },
      );
    }
    updates.timezone = tz;
  }

  // ── default_available_min ──────────────────────────────────────────────────
  if ("default_available_min" in body) {
    const val = Number(body.default_available_min);
    if (!Number.isInteger(val) || val <= 0 || val > 1440) {
      return Response.json(
        { error: "default_available_min must be a positive integer ≤ 1440" },
        { status: 400 },
      );
    }
    updates.defaultAvailableMin = val;
  }

  // ── ratio_mode ─────────────────────────────────────────────────────────────
  if ("ratio_mode" in body) {
    if (!VALID_RATIO_MODES.includes(body.ratio_mode as RatioMode)) {
      return Response.json(
        { error: `ratio_mode must be one of: ${VALID_RATIO_MODES.join(", ")}` },
        { status: 400 },
      );
    }
    updates.ratioMode = body.ratio_mode as RatioMode;
  }

  // ── morning_nudge_time ─────────────────────────────────────────────────────
  if ("morning_nudge_time" in body) {
    const val = body.morning_nudge_time;
    if (typeof val !== "string" || !isValidHHMM(val)) {
      return Response.json(
        { error: "morning_nudge_time must be in HH:MM format (00:00–23:59)" },
        { status: 400 },
      );
    }
    updates.morningNudgeTime = val;
  }

  // ── streak_threshold ───────────────────────────────────────────────────────
  if ("streak_threshold" in body) {
    const val = Number(body.streak_threshold);
    if (!Number.isInteger(val) || val < 0 || val > 100) {
      return Response.json(
        { error: "streak_threshold must be an integer between 0 and 100" },
        { status: 400 },
      );
    }
    updates.streakThreshold = val;
  }

  updates.updatedAt = nowSec();

  const updated = await updatePreferences(userId, updates);
  return Response.json({ data: updated });
}
