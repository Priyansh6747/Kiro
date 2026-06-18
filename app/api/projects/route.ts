/**
 * GET  /api/projects  — list active projects for the authenticated user
 * POST /api/projects  — create a new project
 */

import { auth } from "@clerk/nextjs/server";
import {
  countActiveNonDefaultProjects,
  createProject,
  listActiveProjects,
} from "@/lib/storage";
import { nowSec } from "@/lib/utils";
import type { NextRequest } from "next/server";

const VALID_TYPES = ["critical", "recurring", "habit", "nicetohave"] as const;
type ProjectType = (typeof VALID_TYPES)[number];

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await listActiveProjects(userId);
  return Response.json({ data: rows });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, importance, type, deadline_at, cadence } = body as {
    name?: unknown;
    importance?: unknown;
    type?: unknown;
    deadline_at?: unknown;
    cadence?: unknown;
  };

  // ── Validation ────────────────────────────────────────────────────────────
  if (!name || typeof name !== "string" || name.trim() === "") {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  if (importance === undefined || importance === null) {
    return Response.json({ error: "importance is required" }, { status: 400 });
  }
  if (type === undefined || type === null) {
    return Response.json({ error: "type is required" }, { status: 400 });
  }

  const importanceNum = Number(importance);
  if (!Number.isInteger(importanceNum) || importanceNum < 1 || importanceNum > 5) {
    return Response.json({ error: "importance must be an integer 1–5" }, { status: 400 });
  }
  if (!VALID_TYPES.includes(type as ProjectType)) {
    return Response.json(
      { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  let deadlineAt: number | null = null;
  if (deadline_at !== undefined && deadline_at !== null) {
    deadlineAt = Number(deadline_at);
    if (Number.isNaN(deadlineAt)) {
      return Response.json({ error: "deadline_at must be a unix timestamp" }, { status: 400 });
    }
  }

  let finalCadence: "daily" | "weekly" | "custom" | null = null;
  if (cadence !== undefined && cadence !== null) {
    if (typeof cadence !== "string" || !["daily", "weekly", "custom"].includes(cadence)) {
      return Response.json({ error: "cadence must be daily, weekly, or custom" }, { status: 400 });
    }
    finalCadence = cadence as "daily" | "weekly" | "custom";
  }

  // ── Enforce project cap (max 10 non-default active) ──────────────────────
  const activeCount = await countActiveNonDefaultProjects(userId);
  if (activeCount >= 10) {
    return Response.json({ error: "Max 10 active projects" }, { status: 422 });
  }

  const now = nowSec();
  const project = await createProject({
    id: crypto.randomUUID(),
    userId,
    name: name.trim(),
    importance: importanceNum,
    type: type as ProjectType,
    deadlineAt,
    cadence: finalCadence,
    isDefault: false,
    createdAt: now,
    archivedAt: null,
  });

  return Response.json({ data: project }, { status: 201 });
}
