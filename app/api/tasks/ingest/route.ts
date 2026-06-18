import { auth } from "@clerk/nextjs/server";
import {
  createTask,
  findProjectById,
  insertTaskClosureSelf,
  propagateTaskClosure,
} from "@/lib/storage";
import { nowSec } from "@/lib/utils";
import type { NextRequest } from "next/server";

interface IngestTaskItem {
  id?: string;
  title: string;
  estimate_min?: number;
  deadline?: string;
  subtasks?: IngestTaskItem[];
  depends_on?: string[];
}

function validateTasksInput(list: any[]): void {
  for (const item of list) {
    if (!item || typeof item !== "object") {
      throw new Error("Each task in the array must be an object");
    }
    if (!item.title || typeof item.title !== "string" || item.title.trim() === "") {
      throw new Error("Each task must have a non-empty string title");
    }
    if (
      item.estimate_min !== undefined &&
      (typeof item.estimate_min !== "number" || item.estimate_min <= 0)
    ) {
      throw new Error(`Task "${item.title}" estimate_min must be a positive number`);
    }
    if (item.deadline && Number.isNaN(new Date(item.deadline).getTime())) {
      throw new Error(`Task "${item.title}" has an invalid deadline format (use YYYY-MM-DD)`);
    }
    if (item.subtasks) {
      if (!Array.isArray(item.subtasks)) {
        throw new Error(`Task "${item.title}" subtasks must be an array`);
      }
      validateTasksInput(item.subtasks);
    }
    if (item.depends_on && !Array.isArray(item.depends_on)) {
      throw new Error(`Task "${item.title}" depends_on must be an array of ids`);
    }
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { project_id, tasks, scheduled_date } = body as {
    project_id?: unknown;
    tasks?: unknown;
    scheduled_date?: unknown;
  };

  if (!project_id || typeof project_id !== "string") {
    return Response.json({ error: "project_id is required" }, { status: 400 });
  }

  if (!tasks || !Array.isArray(tasks)) {
    return Response.json({ error: "tasks must be an array" }, { status: 400 });
  }

  // ── Project must belong to user ───────────────────────────────────────────
  const project = await findProjectById(project_id, userId);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  // ── Validate entire JSON structure before writing to DB ───────────────────
  try {
    validateTasksInput(tasks);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  // ── Optional scheduled date ───────────────────────────────────────────────
  let scheduledDate: number | null = null;
  if (scheduled_date !== undefined && scheduled_date !== null) {
    scheduledDate = Number(scheduled_date);
    if (Number.isNaN(scheduledDate)) {
      return Response.json({ error: "scheduled_date must be a unix day integer" }, { status: 400 });
    }
  }

  // ── Recursive Ingest & DB Insertions ──────────────────────────────────────
  const createdTasks: any[] = [];
  const idMap = new Map<string, string>(); // JSON id -> DB newTaskId
  const dependencyQueue: { taskId: string; dependsOn: string[] }[] = [];

  const insertImportedTasks = async (
    list: IngestTaskItem[],
    parentId: string | null = null,
  ) => {
    for (const item of list) {
      const now = nowSec();
      const newTaskId = crypto.randomUUID();

      let deadlineAt: number | null = null;
      if (item.deadline) {
        const d = new Date(item.deadline);
        if (!Number.isNaN(d.getTime())) {
          deadlineAt = Math.floor(d.getTime() / 1000);
        }
      } else if (project.deadlineAt !== null) {
        deadlineAt = project.deadlineAt;
      }

      const estimateMin =
        typeof item.estimate_min === "number" && item.estimate_min > 0
          ? item.estimate_min
          : 30;

      const task = await createTask({
        id: newTaskId,
        userId,
        projectId: project_id,
        parentId,
        carriedFromId: null,
        title: item.title.trim(),
        estimateMin,
        status: "pending",
        scheduledDate,
        deadlineAt,
        completedAt: null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      createdTasks.push(task);

      await insertTaskClosureSelf(newTaskId);

      if (parentId) {
        await propagateTaskClosure(newTaskId, parentId);
      }

      if (item.subtasks && Array.isArray(item.subtasks)) {
        await insertImportedTasks(item.subtasks, newTaskId);
      }
      
      // Store the mapping from JSON id to DB id
      if (item.id) {
        idMap.set(item.id, newTaskId);
      }
      
      // Keep track of dependencies to resolve after all insertions
      if (item.depends_on && Array.isArray(item.depends_on)) {
        dependencyQueue.push({ taskId: newTaskId, dependsOn: item.depends_on });
      }
    }
  };

  try {
    await insertImportedTasks(tasks as IngestTaskItem[]);
    
    // Resolve dependencies
    const { insertTaskDependency } = await import("@/lib/storage");
    for (const { taskId, dependsOn } of dependencyQueue) {
      for (const depId of dependsOn) {
        const mappedId = idMap.get(depId);
        if (mappedId) {
          await insertTaskDependency(taskId, mappedId);
        }
      }
    }
    
    return Response.json({ data: createdTasks }, { status: 201 });
  } catch (dbError) {
    console.error("[JSON Ingest Error] Database insertion failed:", dbError);
    return Response.json(
      {
        error: "Failed to import tasks due to a database error",
        details: dbError instanceof Error ? dbError.message : String(dbError),
      },
      { status: 500 },
    );
  }
}
