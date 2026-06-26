import { db } from "@/lib/db/client";
import { users } from "@/lib/db/models";
import { closeDayForUser, getOrCreatePreferences } from "@/lib/storage";
import { todayUnixDay } from "@/lib/utils";

// This cron job should be called either by an external trigger (like Vercel Cron)
// or internally by Kiro's agents at the end of the day.
export async function GET(request: Request) {
  // Simple auth check for cron
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allUsers = await db.select().from(users);
    const results = [];

    for (const u of allUsers) {
      try {
        const prefs = await getOrCreatePreferences(u.id);
        const today = todayUnixDay(prefs.timezone);
        await closeDayForUser(u.id, today);
        results.push({ userId: u.id, status: "success", dateProcessed: today });
      } catch (err: any) {
        results.push({ userId: u.id, status: "error", message: err.message });
      }
    }

    return Response.json({ success: true, results });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
