import { auth } from "@clerk/nextjs/server";
import { 
  listActiveHabits, 
  computeHabitStreak, 
  getHabitMarkersInRange,
  listActiveRecurringTasks,
  computeRecurringStreak,
  getRecurringMarkersInRange,
  getOrCreatePreferences
} from "@/lib/storage";
import { todayUnixDay } from "@/lib/utils";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  
  try {
    const prefs = await getOrCreatePreferences(userId);
    const today = todayUnixDay(prefs.timezone);
    
    // Fetch active habits
    const habits = await listActiveHabits(userId);
    
    // Compute streaks for all habits concurrently
    const streaks: Record<string, { current: number, best: number, rate7d: number, totalCompletions: number }> = {};
    const streaksData = await Promise.all(
      habits.map(h => computeHabitStreak(userId, h.id))
    );
    habits.forEach((h, i) => {
      streaks[h.id] = streaksData[i];
    });

    // Determine range for calendar + weekly tracker
    // Default to a 35-day window ending today
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");
    const from = fromStr ? parseInt(fromStr) : today - 35;
    const to = toStr ? parseInt(toStr) : today;

    const markers: Record<string, Record<number, string>> = {};
    
    // Fetch markers for the range concurrently
    const markersData = await Promise.all(
      habits.map(h => getHabitMarkersInRange(userId, h.id, from, to))
    );
    
    habits.forEach((h, i) => {
      const habitMarkers = markersData[i];
      markers[h.id] = {};
      habitMarkers.forEach(m => {
        markers[h.id][m.date] = m.status;
      });
    });

    // Fetch active recurring tasks
    const recurringTasks = await listActiveRecurringTasks(userId);
    const recurringStreaks: Record<string, { current: number, best: number, rate7d: number, totalCompletions: number }> = {};
    const recurringStreaksData = await Promise.all(
      recurringTasks.map(rt => computeRecurringStreak(userId, rt.id))
    );
    recurringTasks.forEach((rt, i) => {
      recurringStreaks[rt.id] = recurringStreaksData[i];
    });

    const recurringMarkersMap: Record<string, Record<number, string>> = {};
    const recurringMarkersData = await Promise.all(
      recurringTasks.map(rt => getRecurringMarkersInRange(userId, rt.id, from, to))
    );
    recurringTasks.forEach((rt, i) => {
      const markers = recurringMarkersData[i];
      recurringMarkersMap[rt.id] = {};
      markers.forEach(m => {
        recurringMarkersMap[rt.id][m.date] = m.status;
      });
    });

    return Response.json({ 
      data: {
        habits,
        streaks,
        markers,
        recurringTasks,
        recurringStreaks,
        recurringMarkers: recurringMarkersMap,
        today
      }
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
