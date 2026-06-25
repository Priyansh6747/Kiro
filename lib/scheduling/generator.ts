import { buildCapacityMap, unixDayOfWeek } from "./capacity";
import type { DraftStrategy, GeneratedBlock, GeneratedSchedule } from "./types";

const UNIX_DAY_SECS = 86_400;
const DAY_START_OFFSET_SECS = 9 * 3600; // 9 AM UTC
const BREAK_SECS = 15 * 60; // 15 min break between blocks

export async function generateSchedule(
  userId: string,
  strategy: DraftStrategy,
  task: { id: string; estimateMin: number; title: string },
  predecessorCompletionDay: number,
  defaultAvailableMin: number,
): Promise<GeneratedSchedule> {
  const deadlineUnixDay = strategy.deadlineAt
    ? Math.floor(strategy.deadlineAt / UNIX_DAY_SECS)
    : strategy.preferredStartDate + 90;
  
  const effectiveStart = Math.max(strategy.preferredStartDate, predecessorCompletionDay > 0 ? predecessorCompletionDay + 1 : 0);
  
  // Build date range: effectiveStart to deadline + 30 overflow days
  const rangeEnd = deadlineUnixDay + 30;
  const allDates: number[] = [];
  for (let d = effectiveStart; d <= rangeEnd; d++) {
    if (strategy.activeDays.includes(unixDayOfWeek(d))) allDates.push(d);
  }
  
  const capacityMap = await buildCapacityMap(userId, allDates, task.id, defaultAvailableMin);
  
  let remainingTaskMin = task.estimateMin;
  let deficitCarry = 0;
  const blocks: GeneratedBlock[] = [];
  const dailyBlocks = new Map<number, GeneratedBlock[]>();
  
  const surplusDays: { day: number; surplus: number }[] = [];
  
  // First pass: allocate primary blocks
  for (const d of allDates) {
    if (remainingTaskMin <= 0) break;
    const cap = capacityMap.get(d)!;
    const isOverflow = d > deadlineUnixDay;
    const allocate = Math.min(strategy.minutesPerDay, cap.remainingMin, remainingTaskMin);
    if (allocate <= 0) continue;
    
    const startTime = d * UNIX_DAY_SECS + DAY_START_OFFSET_SECS;
    const block: GeneratedBlock = {
      planDate: d,
      startTime,
      durationMin: allocate,
      sessionType: isOverflow ? "overflow" : "focused",
    };
    blocks.push(block);
    if (!dailyBlocks.has(d)) dailyBlocks.set(d, []);
    dailyBlocks.get(d)!.push(block);
    remainingTaskMin -= allocate;
    
    // Track deficit days
    if (allocate < strategy.minutesPerDay && cap.remainingMin < strategy.minutesPerDay) {
      deficitCarry += strategy.minutesPerDay - allocate;
    }
    // Track surplus days (cap has more remaining than we used)
    if (cap.remainingMin > strategy.minutesPerDay + 10) {
      surplusDays.push({ day: d, surplus: cap.remainingMin - allocate });
    }
  }
  
  // Second pass: distribute deficitCarry onto surplus days as makeup blocks
  if (deficitCarry > 0 && remainingTaskMin <= 0) {
    deficitCarry = 0;
  }
  if (deficitCarry > 0) {
    for (const { day, surplus } of surplusDays) {
      if (deficitCarry <= 0) break;
      const makeupMin = Math.min(surplus, deficitCarry, remainingTaskMin);
      if (makeupMin <= 0) continue;
      
      const existingOnDay = dailyBlocks.get(day) ?? [];
      const lastEnd = existingOnDay.reduce((acc, b) => Math.max(acc, b.startTime + b.durationMin * 60), day * UNIX_DAY_SECS + DAY_START_OFFSET_SECS);
      const makeupBlock: GeneratedBlock = {
        planDate: day,
        startTime: lastEnd + BREAK_SECS,
        durationMin: makeupMin,
        sessionType: "makeup",
      };
      blocks.push(makeupBlock);
      if (!dailyBlocks.has(day)) dailyBlocks.set(day, []);
      dailyBlocks.get(day)!.push(makeupBlock);
      remainingTaskMin -= makeupMin;
      deficitCarry -= makeupMin;
    }
  }
  
  // Risk flags
  const riskFlags: string[] = [];
  const overflowBlocks = blocks.filter(b => b.planDate > deadlineUnixDay);
  if (overflowBlocks.length > 0) {
    const overflowMin = overflowBlocks.reduce((s, b) => s + b.durationMin, 0);
    riskFlags.push(`Task extends ${Math.ceil(overflowMin / 60 * 10) / 10} hrs past deadline`);
  }
  if (blocks.length > 0) {
    const lastBlock = blocks.reduce((a, b) => a.planDate >= b.planDate ? a : b);
    if (lastBlock.planDate >= deadlineUnixDay - 1 && lastBlock.planDate <= deadlineUnixDay) {
      riskFlags.push("Tight deadline buffer — last session is on or near the deadline");
    }
  }
  let streak = 0;
  for (const d of allDates) {
    const cap = capacityMap.get(d);
    if (cap && cap.reservedMin + strategy.minutesPerDay > defaultAvailableMin * 0.9) {
      streak++;
      if (streak >= 3) { riskFlags.push("High load streak — 3+ consecutive packed days"); break; }
    } else { streak = 0; }
  }
  
  const totalMinutes = blocks.reduce((s, b) => s + b.durationMin, 0);
  const completionDate = blocks.length > 0
    ? blocks.reduce((a, b) => a.planDate >= b.planDate ? a : b).planDate
    : effectiveStart;
  
  return { taskId: task.id, blocks, totalMinutes, completionDate, riskFlags };
}
