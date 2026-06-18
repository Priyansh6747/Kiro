/**
 * PATCH  /api/tasks/:id  — update a task
 * DELETE /api/tasks/:id  — soft-delete (Todo project tasks only)
 */

import { auth } from "@clerk/nextjs/server";
import {
  findProjectById,
  findTaskById,
  findTaskWithProject,
  softDeleteTask,
  updateTask,
  syncDayLogStats,
} from "@/lib/storage";
import { nowSec } from "@/lib/utils";
import type { NextRequest } from "next/server";

const VALID_STATUSES = ["pending", "done", "missed", "carried", "adjusted", "deleted"] as const;
type TaskStatus = (typeof VALID_STATUSES)[number];

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await findTaskById(id, userId);
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Parameters<typeof updateTask>[1] = {};

  // ── title ──────────────────────────────────────────────────────────────────
  if ("title" in body) {
    const title = body.title;
    if (!title || typeof title !== "string" || title.trim() === "") {
      return Response.json({ error: "title must be a non-empty string" }, { status: 400 });
    }
    updates.title = title.trim();
  }

  // ── estimate_min ───────────────────────────────────────────────────────────
  if ("estimate_min" in body) {
    const estimateMin = Number(body.estimate_min);
    if (!Number.isInteger(estimateMin) || estimateMin <= 0) {
      return Response.json({ error: "estimate_min must be a positive integer" }, { status: 400 });
    }
    updates.estimateMin = estimateMin;
  }

  // ── status ─────────────────────────────────────────────────────────────────
  if ("status" in body) {
    if (!VALID_STATUSES.includes(body.status as TaskStatus)) {
      return Response.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }
    updates.status = body.status as TaskStatus;

    // Mark completed_at on first transition to "done"
    if (body.status === "done" && !task.completedAt) {
      updates.completedAt = nowSec();
    }
  }

  // ── scheduled_date ─────────────────────────────────────────────────────────
  if ("scheduled_date" in body) {
    if (body.scheduled_date === null) {
      updates.scheduledDate = null;
    } else {
      const scheduledDate = Number(body.scheduled_date);
      if (Number.isNaN(scheduledDate)) {
        return Response.json({ error: "scheduled_date must be a unix day integer" }, { status: 400 });
      }
      updates.scheduledDate = scheduledDate;
    }
  }

  // ── deadline_at ────────────────────────────────────────────────────────────
  if ("deadline_at" in body) {
    if (body.deadline_at === null) {
      updates.deadlineAt = null;
    } else {
      const deadlineAt = Number(body.deadline_at);
      if (Number.isNaN(deadlineAt)) {
        return Response.json({ error: "deadline_at must be a unix timestamp" }, { status: 400 });
      }

      // Validate against project deadline
      const project = await findProjectById(task.projectId, userId);
      if (project?.deadlineAt && deadlineAt > project.deadlineAt) {
        return Response.json(
          { error: "Task deadline exceeds project deadline" },
          { status: 422 },
        );
      }
      updates.deadlineAt = deadlineAt;
    }
  }

  updates.updatedAt = nowSec();

  const updated = await updateTask(id, updates);

  // Sync day log if task is scheduled for a date
  const oldDate = task.scheduledDate;
  const newDate = updates.scheduledDate !== undefined ? updates.scheduledDate : task.scheduledDate;
  if (oldDate !== null) await syncDayLogStats(userId, oldDate);
  if (newDate !== null && newDate !== oldDate) await syncDayLogStats(userId, newDate);

  return Response.json({ data: updated });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await findTaskWithProject(id, userId);
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  if (!task.isDefault) {
    return Response.json({ error: "Only Todo tasks can be deleted" }, { status: 422 });
  }

  await softDeleteTask(id);

  if (task.scheduledDate !== null) {
    await syncDayLogStats(userId, task.scheduledDate);
  }

  return Response.json({ data: "ok" });
}
