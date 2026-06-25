export interface DraftStrategy {
  taskId?: string;
  projectId?: string;
  importance: number; // 1-5
  minutesPerDay: number;
  activeDays: number[]; // 1=Mon..7=Sun
  preferredStartDate: number; // unix day
  deadlineAt: number | null;
  isFlexible: boolean;
  suggestedBy: "auto" | "manual";
}

export interface DailyCapacity {
  date: number; // unix day
  totalAvailableMin: number; // from preferences.defaultAvailableMin
  reservedMin: number; // concrete dayPlan rows + projected recurring/habit occurrences
  remainingMin: number;
}

export interface FeasibilityResult {
  isFeasible: boolean;
  requiredMin: number;
  availableMin: number;
  shortfallMin: number | null;
  dependencyBlocked: boolean; // true if predecessors can't complete in time
  dependencyDetails?: { predecessorId: string; status: string }[];
  suggestions: {
    adjustedMinutesPerDay?: number;
    adjustedActiveDays?: number[];
    recommendedDeadlineExtensionDays?: number;
  } | null;
}

export interface GeneratedBlock {
  planDate: number; // unix day
  startTime: number; // unix timestamp
  durationMin: number;
  sessionType: "focused" | "overflow" | "makeup";
}

export interface GeneratedSchedule {
  taskId: string;
  blocks: GeneratedBlock[];
  totalMinutes: number;
  completionDate: number; // unix day
  riskFlags: string[];
}
