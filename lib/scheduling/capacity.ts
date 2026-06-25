import { getDayPlanRowsForDateRange, getRecurringTasksForUser } from "@/lib/storage";
import type { DailyCapacity } from "./types";

/** Unix day (days since epoch) -> ISO date string */
export function unixDayToISODate(unixDay: number): string {
  return new Date(unixDay * 86_400_000).toISOString().slice(0, 10);
}

/** ISO date string -> unix day */
export function isoDateToUnixDay(iso: string): number {
  return Math.floor(new Date(iso + 'T00:00:00Z').getTime() / 86_400_000);
}

/** Get day-of-week: 1=Mon..7=Sun */
export function unixDayOfWeek(unixDay: number): number {
  const d = new Date(unixDay * 86_400_000).getUTCDay(); // 0=Sun
  return d === 0 ? 7 : d;
}

/**
 * Returns true if a recurring task/project is expected to run on the given unixDay.
 */
export function matchesRecurrenceRule(
  rule: string | null,
  cadence: string | null,
  projectType: string,
  unixDay: number,
  scheduledDate?: number | null,
): boolean {
  const dow = unixDayOfWeek(unixDay); // 1-7
  
  // Daily: task has "daily" rule, or is a habit project with daily cadence
  if (rule === "daily" || (projectType === "habit" && cadence === "daily")) return true;
  
  // Weekly: matches the anchor day-of-week
  if (rule === "weekly" || cadence === "weekly") {
    const anchorDay = scheduledDate ? unixDayOfWeek(scheduledDate) : 1;
    return dow === anchorDay;
  }
  
  // Comma-sep abbrevs: "MON,THU"
  if (rule && rule !== "daily" && rule !== "weekly") {
    const abbrevMap: Record<string, number> = { MON:1, TUE:2, WED:3, THU:4, FRI:5, SAT:6, SUN:7 };
    const days = rule.split(',').map(a => abbrevMap[a.trim().toUpperCase()]).filter(Boolean);
    if (days.length > 0) return days.includes(dow);
  }
  
  // Recurring project with custom cadence: treat as weekdays
  if (projectType === "recurring" && cadence === "custom") return dow <= 5;
  
  return false;
}

/**
 * Projects recurring/habit task occurrences onto dates in dateRange.
 * Returns a Map<unixDay, projectedReservedMin>.
 */
export async function projectRecurringOccurrences(
  userId: string,
  dateRange: number[],
  excludeTaskId: string | null,
  existingConcrete: Map<string, Set<number>>,
): Promise<Map<number, number>> {
  const recurringTasks = excludeTaskId ? await getRecurringTasksForUser(userId, excludeTaskId) : await getRecurringTasksForUser(userId, "DUMMY");
  const result = new Map<number, number>();
  
  for (const unixDay of dateRange) {
    let projected = 0;
    for (const t of recurringTasks) {
      // Skip if already in concrete reservations for this day
      if (existingConcrete.get(t.id)?.has(unixDay)) continue;
      
      // Skip if recurrenceEndsAt is set and this day is past it
      if (t.recurrenceEndsAt && unixDay * 86400 > t.recurrenceEndsAt) continue;
      
      if (matchesRecurrenceRule(t.recurrenceRule, t.cadence, t.projectType, unixDay)) {
        projected += t.estimateMin;
      }
    }
    if (projected > 0) result.set(unixDay, projected);
  }
  
  return result;
}

/**
 * Builds a complete daily capacity map for the given dates.
 */
export async function buildCapacityMap(
  userId: string,
  dates: number[],
  excludeTaskId: string | null,
  defaultAvailableMin: number,
  inFlightBlocks: { planDate: number; durationMin: number }[] = []
): Promise<Map<number, DailyCapacity>> {
  if (dates.length === 0) return new Map();
  
  const fromDate = Math.min(...dates);
  const toDate = Math.max(...dates);
  
  // Fetch concrete reservations
  const concreteRows = excludeTaskId ? await getDayPlanRowsForDateRange(userId, fromDate, toDate, excludeTaskId) : await getDayPlanRowsForDateRange(userId, fromDate, toDate, "DUMMY_ID_TO_NOT_EXCLUDE");
  
  // Build existingConcrete map for projection dedup
  const existingConcrete = new Map<string, Set<number>>();
  const concreteByDate = new Map<number, number>();
  
  for (const row of concreteRows) {
    if (!existingConcrete.has(row.taskId)) existingConcrete.set(row.taskId, new Set());
    existingConcrete.get(row.taskId)!.add(row.planDate);
    concreteByDate.set(row.planDate, (concreteByDate.get(row.planDate) ?? 0) + row.durationMin);
  }

  // Add in-flight blocks to concrete reservations
  for (const block of inFlightBlocks) {
    concreteByDate.set(block.planDate, (concreteByDate.get(block.planDate) ?? 0) + block.durationMin);
  }
  
  // Get projected recurring occurrences
  const projected = await projectRecurringOccurrences(userId, dates, excludeTaskId, existingConcrete);
  
  // Build capacity map
  const capacityMap = new Map<number, DailyCapacity>();
  for (const d of dates) {
    const reservedMin = (concreteByDate.get(d) ?? 0) + (projected.get(d) ?? 0);
    capacityMap.set(d, {
      date: d,
      totalAvailableMin: defaultAvailableMin,
      reservedMin,
      remainingMin: Math.max(0, defaultAvailableMin - reservedMin),
    });
  }
  
  return capacityMap;
}
