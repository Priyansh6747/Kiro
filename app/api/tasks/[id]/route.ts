/**
 * PATCH  /api/tasks/:id  — update a task
 * DELETE /api/tasks/:id  — soft-delete (Todo project tasks only)
 */

import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import {
  findProjectById,
  findTaskById,
  findTaskWithProject,
  softDeleteTask,
  syncDayLogStats,
  updateTask,
} from "@/lib/storage";
import { nowSec } from "@/lib/utils";

const VALID_STATUSES = [
  "pending",
  "done",
  "missed",
  "carried",
  "adjusted",
  "deleted",
] as const;
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
      return Response.json(
        { error: "title must be a non-empty string" },
        { status: 400 },
      );
    }
    updates.title = title.trim();
  }

  // ── estimate_min ───────────────────────────────────────────────────────────
  if ("estimate_min" in body) {
    const estimateMin = Number(body.estimate_min);
    if (!Number.isInteger(estimateMin) || estimateMin <= 0) {
      return Response.json(
        { error: "estimate_min must be a positive integer" },
        { status: 400 },
      );
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
    if (body.status === "done") {
      // Enforce dependencies: check if all predecessors are "done"
      const { listTaskDependenciesForProject, listTasks } = await import(
        "@/lib/storage"
      );
      const deps = await listTaskDependenciesForProject(task.projectId);
      const myPredecessors = deps
        .filter((d) => d.taskId === id)
        .map((d) => d.predecessorId);

      if (myPredecessors.length > 0) {
        const allTasks = await listTasks({ userId, projectId: task.projectId });
        const predTasks = allTasks.filter((t) => myPredecessors.includes(t.id));
        const notDone = predTasks.filter((t) => t.status !== "done");

        if (notDone.length > 0) {
          return Response.json(
            {
              error: `Cannot complete task. Dependencies not satisfied: ${notDone.map((t) => t.title).join(", ")}`,
            },
            { status: 422 },
          );
        }
      }

      if (!task.completedAt) {
        updates.completedAt = nowSec();
      }
    } else {
      // If status is changed from "done" back to something else, clear completedAt
      updates.completedAt = null;
    }
  }

  const allSuccessorsToUnschedule: { id: string; date: number }[] = [];

  // ── scheduled_date ─────────────────────────────────────────────────────────
  if ("scheduled_date" in body) {
    if (body.scheduled_date === null) {
      updates.scheduledDate = null;

      // Unschedule all dependent tasks recursively
      const { db } = await import("@/lib/db/client");
      const { tasks, taskDependencies } = await import("@/lib/db/models");
      const { inArray } = await import("drizzle-orm");

      let currentLevelIds = [id];

      while (currentLevelIds.length > 0) {
        const depsRows = await db
          .select({ taskId: taskDependencies.taskId })
          .from(taskDependencies)
          .where(inArray(taskDependencies.predecessorId, currentLevelIds));

        const nextLevelIds = depsRows.map((r) => r.taskId);
        if (nextLevelIds.length === 0) break;

        const allNextSuccessors = await db
          .select({ id: tasks.id, date: tasks.scheduledDate })
          .from(tasks)
          .where(inArray(tasks.id, nextLevelIds));

        for (const s of allNextSuccessors) {
          if (s.date !== null) {
            allSuccessorsToUnschedule.push(s as { id: string; date: number });
          }
        }

        currentLevelIds = allNextSuccessors.map((s) => s.id);
      }

      if (allSuccessorsToUnschedule.length > 0) {
        const successorIds = allSuccessorsToUnschedule.map((s) => s.id);
        await db
          .update(tasks)
          .set({ scheduledDate: null, updatedAt: nowSec() })
          .where(inArray(tasks.id, successorIds));
      }
    } else {
      const scheduledDate = Number(body.scheduled_date);
      if (Number.isNaN(scheduledDate)) {
        return Response.json(
          { error: "scheduled_date must be a unix day integer" },
          { status: 400 },
        );
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
        return Response.json(
          { error: "deadline_at must be a unix timestamp" },
          { status: 400 },
        );
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
  const newDate =
    updates.scheduledDate !== undefined
      ? updates.scheduledDate
      : task.scheduledDate;

  const datesToSync = new Set<number>();
  if (oldDate !== null) datesToSync.add(oldDate);
  if (newDate !== null) datesToSync.add(newDate);

  for (const succ of allSuccessorsToUnschedule) {
    if (succ.date !== null) datesToSync.add(succ.date);
  }

  for (const d of datesToSync) {
    await syncDayLogStats(userId, d);
  }

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
    return Response.json(
      { error: "Only Todo tasks can be deleted" },
      { status: 422 },
    );
  }

  await softDeleteTask(id);

  if (task.scheduledDate !== null) {
    await syncDayLogStats(userId, task.scheduledDate);
  }

  return Response.json({ data: "ok" });
}
