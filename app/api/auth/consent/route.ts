import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/models";
import { eq } from "drizzle-orm";
import { nowSec } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ consent: false }, { status: 401 });
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    const user = result[0];

    return NextResponse.json({ consent: !!user?.consent, agreedOn: user?.agreedOn });
  } catch (error) {
    return NextResponse.json({ consent: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (body.consent) {
      await db
        .update(users)
        .set({
          consent: true,
          agreedOn: nowSec(),
        })
        .where(eq(users.id, userId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
