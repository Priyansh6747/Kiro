/**
 * PATCH  /api/projects/:id  — update a project
 * DELETE /api/projects/:id  — archive a project (soft-delete)
 */

import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { archiveProject, findProjectById, updateProject } from "@/lib/storage";

const VALID_TYPES = ["critical", "nicetohave"] as const;
type ProjectType = (typeof VALID_TYPES)[number];

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const project = await findProjectById(id, userId);
  if (!project)
    return Response.json({ error: "Project not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Partial<{
    name: string;
    importance: number;
    type: ProjectType;
    deadlineAt: number | null;
  }> = {};

  // ── Validate optional fields ──────────────────────────────────────────────
  if ("name" in body) {
    const name = body.name;
    if (!name || typeof name !== "string" || name.trim() === "") {
      return Response.json(
        { error: "name must be a non-empty string" },
        { status: 400 },
      );
    }
    updates.name = name.trim();
  }

  if ("importance" in body) {
    const importanceNum = Number(body.importance);
    if (
      !Number.isInteger(importanceNum) ||
      importanceNum < 1 ||
      importanceNum > 5
    ) {
      return Response.json(
        { error: "importance must be an integer 1–5" },
        { status: 400 },
      );
    }
    updates.importance = importanceNum;
  }

  if ("type" in body) {
    if (!VALID_TYPES.includes(body.type as ProjectType)) {
      return Response.json(
        { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    updates.type = body.type as ProjectType;
  }

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
      updates.deadlineAt = deadlineAt;
    }
  }

  const updated = await updateProject(id, updates);
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

  const project = await findProjectById(id, userId);
  if (!project)
    return Response.json({ error: "Project not found" }, { status: 404 });

  if (project.isDefault) {
    return Response.json(
      { error: "Cannot archive the default Todo project" },
      { status: 422 },
    );
  }

  await archiveProject(id);

  // Tasks in this project remain in the DB; they are no longer scheduled.
  // The spec says they become accessible as bucket items (scheduled_date stays
  // as-is — this is intentional: future reads filter by project_id).

  return Response.json({ data: "ok" });
}
