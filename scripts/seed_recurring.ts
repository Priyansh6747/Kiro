import { db } from "../lib/db/client";
import { recurringTasks, recurringMarkers } from "../lib/db/models";
import { todayUnixDay, nowSec } from "../lib/utils";
import { eq } from "drizzle-orm";

const USER_ID = "user_3FdmO5Rl8eEkW5bZIQ1fwCahd3r";
const today = todayUnixDay("UTC"); // Default to UTC
const now = nowSec();

async function main() {
  console.log("Seeding recurring markers for user:", USER_ID);

  // Fetch the recurring tasks we just created
  const tasks = await db.select().from(recurringTasks).where(eq(recurringTasks.userId, USER_ID));

  if (tasks.length === 0) {
    console.log("No recurring tasks found.");
    return;
  }

  const markersToInsert = [];

  for (const task of tasks) {
    // Generate markers for the past 60 days
    for (let i = 0; i <= 60; i++) {
      const dateUnix = today - i;
      
      const d = new Date(dateUnix * 86400000);
      
      let shouldSpawn = false;
      if (task.title === "Weekly Grocery Run" && d.getUTCDay() === 0) {
        shouldSpawn = true;
      } else if (task.title === "Monthly Budget Review" && d.getUTCDate() === 1) {
        shouldSpawn = true;
      }
      
      if (!shouldSpawn) continue;

      let status: "done" | "missed" | "pending" | "carried" = "done";
      
      if (Math.random() > 0.8) status = "missed";
      
      markersToInsert.push({
        id: crypto.randomUUID(),
        recurringTaskId: task.id,
        userId: USER_ID,
        date: dateUnix,
        status,
        createdAt: now,
      });
    }
  }

  if (markersToInsert.length > 0) {
    await db.insert(recurringMarkers).values(markersToInsert);
    console.log(`Created ${markersToInsert.length} recurring markers.`);
  } else {
    console.log("No markers to insert based on schedule.");
  }
}

main().catch(console.error);
