import { auth } from "@clerk/nextjs/server";
import { createProject, createTask, insertTaskDependency, updateArtifact } from "@/lib/storage";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { stages, projectName, artifactId } = await req.json();

  try {
    const project = await createProject({
      name: projectName,
      userId,
      importance: 3,
    });

    const dbIdMap = new Map<string, string>(); // planId -> dbId

    // Create tasks
    for (const stage of stages) {
      for (const task of stage.tasks) {
        if (task.selected !== false) {
          const dbTask = await createTask({
            userId,
            projectId: project.id,
            title: task.title,
            estimateMin: task.estimate_min || 30,
          });
          dbIdMap.set(task.id, dbTask.id);
        }
      }
    }

    // Create dependencies
    for (const stage of stages) {
      for (const task of stage.tasks) {
        if (task.selected !== false && dbIdMap.has(task.id) && Array.isArray(task.depends_on)) {
          for (const depId of task.depends_on) {
            const dbPredecessorId = dbIdMap.get(depId);
            if (dbPredecessorId) {
              await insertTaskDependency(dbIdMap.get(task.id)!, dbPredecessorId);
            }
          }
        }
      }
    }

    await updateArtifact(artifactId, { type: "plan_complete" });

    return Response.json({ success: true, projectId: project.id });
  } catch (error: any) {
    console.error("Failed to finalize planning:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
