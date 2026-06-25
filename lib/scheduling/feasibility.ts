import { getPredecessorTasks } from "@/lib/storage";
import { buildCapacityMap, unixDayOfWeek } from "./capacity";
import type { DraftStrategy, FeasibilityResult } from "./types";

const UNIX_DAY_SECS = 86_400;

export async function checkFeasibility(
  userId: string,
  strategy: DraftStrategy,
  task: { id: string; estimateMin: number },
  defaultAvailableMin: number,
): Promise<FeasibilityResult> {
  // Deadline as unix day
  const deadlineUnixDay = strategy.deadlineAt
    ? Math.floor(strategy.deadlineAt / UNIX_DAY_SECS)
    : strategy.preferredStartDate + 90;
  
  // Build date range (active days only)
  const allDates: number[] = [];
  for (let d = strategy.preferredStartDate; d <= deadlineUnixDay; d++) {
    if (strategy.activeDays.includes(unixDayOfWeek(d))) allDates.push(d);
  }
  
  const capacityMap = await buildCapacityMap(userId, allDates, task.id, defaultAvailableMin);
  
  // Available capacity
  let availableMin = 0;
  for (const cap of capacityMap.values()) availableMin += cap.remainingMin;
  
  const requiredMin = task.estimateMin;
  
  // Dependency check
  const predecessors = await getPredecessorTasks(task.id);
  const blockedPreds = predecessors.filter(
    p => p.status !== 'done' && (p.scheduledDate === null || p.scheduledDate >= strategy.preferredStartDate)
  );
  const dependencyBlocked = blockedPreds.length > 0;
  
  const capacityInsufficient = availableMin < requiredMin;
  const isFeasible = !capacityInsufficient && !dependencyBlocked;
  const shortfallMin = capacityInsufficient ? requiredMin - availableMin : null;
  
  // Compute suggestions when infeasible
  let suggestions: FeasibilityResult['suggestions'] = null;
  if (!isFeasible) {
    const activeDaysInRange = allDates.length;
    const adjustedMinutesPerDay = activeDaysInRange > 0 
      ? Math.ceil(requiredMin / activeDaysInRange)
      : strategy.minutesPerDay;
    
    // Find deadline extension: add 7-day increments until feasible
    let extensionDays = 0;
    if (capacityInsufficient) {
      let extCapacity = availableMin;
      let extDate = deadlineUnixDay;
      while (extCapacity < requiredMin && extensionDays < 365) {
        // Add one more week
        extensionDays += 7;
        const newEnd = deadlineUnixDay + extensionDays;
        for (let d = extDate + 1; d <= newEnd; d++) {
          if (strategy.activeDays.includes(unixDayOfWeek(d))) {
            extCapacity += Math.max(0, defaultAvailableMin - 0); // simplified
          }
        }
        extDate = newEnd;
      }
    }
    
    suggestions = {
      adjustedMinutesPerDay: Math.min(adjustedMinutesPerDay, defaultAvailableMin),
      recommendedDeadlineExtensionDays: extensionDays > 0 ? extensionDays : undefined,
    };
  }
  
  return {
    isFeasible,
    requiredMin,
    availableMin,
    shortfallMin,
    dependencyBlocked,
    dependencyDetails: blockedPreds.map(p => ({ predecessorId: p.id, status: p.status })),
    suggestions,
  };
}
