/**
 * GET  /api/tasks  — list tasks (filterable by project_id, date, status, bucket)
 * POST /api/tasks  — create a new task
 */

import { auth } from "@clerk/nextjs/server";
import {
  createTask,
  findProjectById,
  findTaskById,
  insertTaskClosureSelf,
  listTasks,
  propagateTaskClosure,
} from "@/lib/storage";
import { nowSec } from "@/lib/utils";
import type { NextRequest } from "next/server";

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const projectId = sp.get("project_id") ?? undefined;
  const statusVal = sp.get("status") ?? undefined;
  const bucketVal = sp.get("bucket");

  let date: number | undefined;
  const dateParam = sp.get("date");
  if (dateParam !== null) {
    date = Number(dateParam);
    if (Number.isNaN(date)) {
      return Response.json({ error: "date must be a unix day integer" }, { status: 400 });
    }
  }

  const bucket = bucketVal === "true";

  const rows = await listTasks({ userId, projectId, date, status: statusVal, bucket });
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

  const { project_id, title, estimate_min, scheduled_date, deadline_at, parent_id } =
    body as {
      project_id?: unknown;
      title?: unknown;
      estimate_min?: unknown;
      scheduled_date?: unknown;
      deadline_at?: unknown;
      parent_id?: unknown;
    };

  // ── Required field validation ─────────────────────────────────────────────
  if (!title || typeof title !== "string" || title.trim() === "") {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (!project_id || typeof project_id !== "string") {
    return Response.json({ error: "project_id is required" }, { status: 400 });
  }

  // ── Project must belong to user ───────────────────────────────────────────
  const project = await findProjectById(project_id, userId);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  // ── Deadline validation ───────────────────────────────────────────────────
  let deadlineAt: number | null = null;

  if (deadline_at !== undefined && deadline_at !== null) {
    deadlineAt = Number(deadline_at);
    if (Number.isNaN(deadlineAt)) {
      return Response.json({ error: "deadline_at must be a unix timestamp" }, { status: 400 });
    }
    if (project.deadlineAt !== null && deadlineAt > project.deadlineAt) {
      return Response.json(
        { error: "Task deadline exceeds project deadline" },
        { status: 422 },
      );
    }
  } else if (project.deadlineAt !== null) {
    // Inherit project deadline
    deadlineAt = project.deadlineAt;
  }

  // ── Optional numeric fields ───────────────────────────────────────────────
  let estimateMin: number = 30;
  if (estimate_min !== undefined && estimate_min !== null) {
    estimateMin = Number(estimate_min);
    if (!Number.isInteger(estimateMin) || estimateMin <= 0) {
      return Response.json({ error: "estimate_min must be a positive integer" }, { status: 400 });
    }
  }

  let scheduledDate: number | null = null;
  if (scheduled_date !== undefined && scheduled_date !== null) {
    scheduledDate = Number(scheduled_date);
    if (Number.isNaN(scheduledDate)) {
      return Response.json({ error: "scheduled_date must be a unix day integer" }, { status: 400 });
    }
  }

  // ── Parent task validation ────────────────────────────────────────────────
  let parentId: string | null = null;
  if (parent_id !== undefined && parent_id !== null && typeof parent_id === "string") {
    const parent = await findTaskById(parent_id, userId);
    if (!parent) return Response.json({ error: "Parent task not found" }, { status: 404 });
    if (parent.projectId !== project_id) {
      return Response.json(
        { error: "Subtask must belong to same project" },
        { status: 422 },
      );
    }
    parentId = parent_id;
  }

  // ── Insert task + closure table ───────────────────────────────────────────
  const now       = nowSec();
  const newTaskId = crypto.randomUUID();

  const task = await createTask({
    id: newTaskId,
    userId,
    projectId: project_id,
    parentId,
    carriedFromId: null,
    title: title.trim(),
    estimateMin,
    status: "pending",
    scheduledDate,
    deadlineAt,
    completedAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  // Self-reference in closure table (depth 0)
  await insertTaskClosureSelf(newTaskId);

  // Propagate ancestors from parent
  if (parentId) {
    await propagateTaskClosure(newTaskId, parentId);
  }

  return Response.json({ data: task }, { status: 201 });
}
