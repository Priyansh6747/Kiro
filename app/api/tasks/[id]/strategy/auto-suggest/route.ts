import { auth } from "@clerk/nextjs/server";
import { callGroq } from "@/lib/groq";
import { db } from "@/lib/db/client";
import { tasks, projects, preferences } from "@/lib/db/models";
import { eq, and, desc } from "drizzle-orm";
import { todayUnixDay } from "@/lib/utils";
import { getMemoryBaselineForUser } from "@/lib/storage";
import type { DraftStrategy } from "@/lib/scheduling/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;

  // Fetch task, project, preferences
  const task = await db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))).get();
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });
  
  const project = await db.select().from(projects).where(eq(projects.id, task.projectId)).get();
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  
  const prefs = await db.select().from(preferences).where(eq(preferences.userId, userId)).get();
  const defaultAvailableMin = prefs?.defaultAvailableMin ?? 240;

  const baseline = await getMemoryBaselineForUser(userId);

  let minutesPerDay = Math.min(60, Math.floor(defaultAvailableMin * 0.25));
  let importance = project.importance;
  let activeDays = [1, 2, 3, 4, 5];

  if (baseline) {
    const daysRemaining = task.deadlineAt ? Math.floor((task.deadlineAt - Date.now()/1000) / 86400) : null;
    
    const prompt = `
Task: "${task.title}", estimate ${task.estimateMin} min.
Deadline: ${daysRemaining !== null ? daysRemaining + " days" : "none"}.
Project importance: ${project.importance}/5.
User's 14-day avg completion ratio: ${(baseline.rolling14dAvgRatio * 100).toFixed(0)}%.
Suggest: importance (1-5), minutesPerDay, activeDays (array of 1-7, Mon=1).
Respond ONLY with valid JSON: {"importance":N,"minutesPerDay":N,"activeDays":[...]}
    `;

    try {
      const groqResponse = await callGroq(prompt, 300, userId);
      const parsed = JSON.parse(groqResponse);
      if (parsed.importance) importance = Number(parsed.importance);
      if (parsed.minutesPerDay) minutesPerDay = Number(parsed.minutesPerDay);
      if (parsed.activeDays && Array.isArray(parsed.activeDays)) {
        activeDays = parsed.activeDays.map(Number).filter((n: number) => n >= 1 && n <= 7);
      }
    } catch (e) {
      console.error("Groq auto-suggest failed, falling back to defaults", e);
    }
  }

  // Clamp values
  importance = Math.max(1, Math.min(5, importance));
  minutesPerDay = Math.max(30, Math.min(defaultAvailableMin, minutesPerDay));
  if (activeDays.length === 0) activeDays = [1, 2, 3, 4, 5];

  const draft: DraftStrategy = {
    taskId,
    importance,
    minutesPerDay,
    activeDays,
    preferredStartDate: todayUnixDay(prefs?.timezone || "UTC"),
    deadlineAt: task.deadlineAt,
    isFlexible: false,
    suggestedBy: "auto",
  };

  return Response.json(draft, { status: 200 });
}
