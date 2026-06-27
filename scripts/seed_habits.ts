import { db } from "../lib/db/client";
import { habits, habitMarkers, recurringTasks } from "../lib/db/models";
import { todayUnixDay, nowSec } from "../lib/utils";

const USER_ID = "user_3FdmO5Rl8eEkW5bZIQ1fwCahd3r";
const today = todayUnixDay("UTC"); // Default to UTC
const now = nowSec();

async function main() {
  console.log("Seeding data for user:", USER_ID);

  // 1. Create Habits
  const newHabits = [
    {
      id: crypto.randomUUID(),
      userId: USER_ID,
      name: "Morning Jog",
      estimateMin: 30,
      cadence: "daily" as const,
      activeDays: "1,2,3,4,5,6,0",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      userId: USER_ID,
      name: "Read 30 mins",
      estimateMin: 30,
      cadence: "daily" as const,
      activeDays: "1,2,3,4,5,6,0",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      userId: USER_ID,
      name: "Meditate",
      estimateMin: 15,
      cadence: "daily" as const,
      activeDays: "1,2,3,4,5", // Weekdays only
      createdAt: now,
      updatedAt: now,
    }
  ];

  await db.insert(habits).values(newHabits);
  console.log("Created 3 habits.");

  // 2. Create Habit Markers
  // For the past 30 days, randomly mark them as done/missed/skipped
  const markersToInsert = [];
  
  for (const habit of newHabits) {
    for (let i = 0; i <= 30; i++) {
      const dateUnix = today - i;
      
      let status: "done" | "missed" | "pending" | "skipped" = "done";
      const rand = Math.random();
      
      if (habit.name === "Morning Jog") {
        if (rand > 0.8) status = "missed";
      } else if (habit.name === "Read 30 mins") {
        if (rand > 0.6) status = "missed";
      } else {
        if (rand > 0.4) status = "missed";
      }

      const d = new Date(dateUnix * 86400000);
      if (habit.name === "Meditate" && (d.getUTCDay() === 0 || d.getUTCDay() === 6)) {
        status = "skipped";
      }

      markersToInsert.push({
        id: crypto.randomUUID(),
        habitId: habit.id,
        userId: USER_ID,
        date: dateUnix,
        status,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  for (let i = 0; i < markersToInsert.length; i += 50) {
    await db.insert(habitMarkers).values(markersToInsert.slice(i, i + 50));
  }
  console.log("Created habit markers.");

  // 3. Create Recurring Tasks
  const newRecurringTasks = [
    {
      id: crypto.randomUUID(),
      userId: USER_ID,
      title: "Weekly Grocery Run",
      estimateMin: 60,
      cadence: "weekly" as const,
      recurrenceRule: "FREQ=WEEKLY;BYDAY=SU",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      userId: USER_ID,
      title: "Monthly Budget Review",
      estimateMin: 45,
      cadence: "custom" as const,
      recurrenceRule: "FREQ=MONTHLY;BYMONTHDAY=1",
      createdAt: now,
      updatedAt: now,
    }
  ];

  await db.insert(recurringTasks).values(newRecurringTasks);
  console.log("Created 2 recurring tasks.");
  console.log("Seeding complete!");
}

main().catch(console.error);
