/**
 * Scoring module — pure functions only. No DB calls, no side effects.
 *
 * Used by generation routes to rank projects and build LLM prompts.
 */

import { todayUnixDay } from "./utils";

// ---------------------------------------------------------------------------
// Project scoring
// ---------------------------------------------------------------------------

export interface ProjectStats {
  id: string;
  name: string;
  importance: number;
  type: string;
  deadlineAt: number | null; // unix seconds
  lastCompletedAt: number | null; // unix seconds
  todayCount: number;
}

export interface ScoredProject extends ProjectStats {
  deadlineProximity: number;
  neglectScore: number;
  totalScore: number;
  daysUntilDeadline: number | null;
  daysSinceLastCompleted: number | null;
}

/**
 * Score a single project.
 *
 * deadlineProximity = importance * (1 / max(daysUntilDeadline, 1))
 * neglectScore      = daysSince(lastCompletedAt)  — 0 if never completed
 * totalScore        = deadlineProximity + neglectScore
 */
export function scoreProject(
  project: ProjectStats,
  nowSec: number,
  timezone: string,
): ScoredProject {
  const todayDay = todayUnixDay(timezone);

  let daysUntilDeadline: number | null = null;
  let deadlineProximity = 0;

  if (project.deadlineAt !== null) {
    // Convert deadline unix-seconds to unix-day
    const deadlineDay = Math.floor(project.deadlineAt / 86_400);
    daysUntilDeadline = Math.max(deadlineDay - todayDay, 0);
    deadlineProximity =
      project.importance * (1 / Math.max(daysUntilDeadline, 1));
  }

  let daysSinceLastCompleted: number | null = null;
  let neglectScore = 0;

  if (project.lastCompletedAt !== null) {
    // daysSince in whole days
    const completedDay = Math.floor(project.lastCompletedAt / 86_400);
    daysSinceLastCompleted = Math.max(todayDay - completedDay, 0);
    neglectScore = daysSinceLastCompleted;
  }

  return {
    ...project,
    deadlineProximity,
    neglectScore,
    totalScore: deadlineProximity + neglectScore,
    daysUntilDeadline,
    daysSinceLastCompleted,
  };
}

/**
 * Score all projects and return the top N by totalScore descending.
 */
export function topScoredProjects(
  projects: ProjectStats[],
  n: number,
  nowSec: number,
  timezone: string,
): ScoredProject[] {
  return projects
    .map((p) => scoreProject(p, nowSec, timezone))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, n);
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

export interface MorningNudgePayload {
  top2: ScoredProject[];
  todayDate: number;
  timezone: string;
}

export function buildMorningNudgePrompt(payload: MorningNudgePayload): string {
  return `You are a focused productivity assistant. Your job is to motivate the user at the start of their day.

Context (JSON):
${JSON.stringify(
  {
    today_unix_day: payload.todayDate,
    user_timezone: payload.timezone,
    top_projects: payload.top2.map((p) => ({
      name: p.name,
      type: p.type,
      importance: p.importance,
      days_until_deadline: p.daysUntilDeadline,
      days_since_last_completed: p.daysSinceLastCompleted,
      tasks_scheduled_today: p.todayCount,
      score: Number(p.totalScore.toFixed(2)),
    })),
  },
  null,
  2,
)}

Write a 2–3 sentence morning nudge in plain English. Be encouraging and specific about why these projects need attention today. Do not use bullet points or headers. Output only the nudge text.`;
}

export interface EodSummaryPayload {
  assigned: number;
  completed: number;
  missed: number;
  ratio: number;
  doneTasks: string[];
  missedTasks: string[];
  habitsCompleted: number;
  habitsMissed: number;
  recurringsCompleted: number;
  recurringsMissed: number;
  day_type: string;
}

export function buildEodSummaryPrompt(payload: EodSummaryPayload): string {
  return `You are a reflective productivity assistant. Summarise the user's day objectively and kindly.

Stats (JSON):
${JSON.stringify(payload, null, 2)}

Write a 3–4 sentence plain English end-of-day summary. Acknowledge what was completed, note what was missed without harsh judgment, and end with a brief forward-looking thought. Output only the summary text.`;
}
