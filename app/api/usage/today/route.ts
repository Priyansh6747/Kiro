import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { userCost } from "@/lib/db/models";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentDate = new Date().toISOString().split("T")[0];
  const maxDayCostStr = process.env.MAX_DAY_COST;
  const maxCost = maxDayCostStr ? parseFloat(maxDayCostStr) : Infinity;

  const rows = await db.select().from(userCost).where(and(eq(userCost.uid, userId), eq(userCost.date, currentDate)));
  const dayCost = rows[0]?.dayCost || 0;

  return NextResponse.json({
    data: {
      dayCost,
      maxCost
    }
  });
}
