/**
 * POST /api/planner/carry
 *
 * Morning carry flow. Finds yesterday's unresolved pending tasks and either:
 *   - Clones them into today (carry) via a new task row
 *   - Marks them missed / soft-deletes them (drop)
 *
 * Idempotent: safe to call multiple times per day.
 */

import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import {
  createTask,
  getOrCreatePreferences,
  insertTaskClosureSelf,
  listUnresolvedTasksForDay,
  syncDayLogStats,
  updateTask,
} from "@/lib/storage";
import { nowSec, todayUnixDay } from "@/lib/utils";

export async function POST(request: NextRequest): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { task_ids_to_carry?: string[]; task_ids_to_drop?: string[] } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const toCarry = new Set<string>(body.task_ids_to_carry ?? []);
  const toDrop = new Set<string>(body.task_ids_to_drop ?? []);

  const prefs = await getOrCreatePreferences(userId);

  const todayDate = todayUnixDay(prefs.timezone);
  const yesterdayDate = todayDate - 1;

  const unresolved = await listUnresolvedTasksForDay(userId, yesterdayDate);

  const carriedIds: string[] = [];
  const droppedIds: string[] = [];

  const now = nowSec();

  for (const task of unresolved) {
    if (toCarry.has(task.id)) {
      // ── Carry: clone as a new task row ─────────────────────────────────
      const newId = crypto.randomUUID();

      await createTask({
        id: newId,
        userId,
        projectId: task.projectId,
        parentId: task.parentId ?? null,
        carriedFromId: task.id,
        title: task.title,
        estimateMin: task.estimateMin,
        status: "carried",
        scheduledDate: todayDate,
        deadlineAt: task.deadlineAt ?? null,
        completedAt: null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      // Self-reference for the clone in the closure table
      await insertTaskClosureSelf(newId);

      // Mark the original as "carried"
      await updateTask(task.id, { status: "carried", updatedAt: now });

      carriedIds.push(newId);
    } else if (toDrop.has(task.id)) {
      // ── Drop ──────────────────────────────────────────────────────────
      if (task.isDefault || task.carriedFromId !== null) {
        // Task from the default Todo project or a recurring instance: soft-delete and mark missed
        await updateTask(task.id, {
          deletedAt: now,
          status: "missed",
          updatedAt: now,
        });
      } else {
        // Project task: back to bucket (clear scheduled_date)
        await updateTask(task.id, {
          status: "pending",
          scheduledDate: null,
          updatedAt: now,
        });
      }
      droppedIds.push(task.id);
    }
    // Tasks in neither list are ignored (left as-is for re-running idempotently)
  }

  // ── Recalculate yesterday's day_log ───────────────────────────────────────
  await syncDayLogStats(userId, yesterdayDate);

  return Response.json({
    data: {
      carried: carriedIds,
      dropped: droppedIds,
    },
  });
}
