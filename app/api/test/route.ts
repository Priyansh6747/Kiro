// app/api/debug/create-user/route.ts

import { db } from "@/lib/db/client";
import { users } from "@/lib/db/models";

export async function GET() {
  const now = Date.now();

  const user = {
    id: crypto.randomUUID(),
    email: "test@test.com",
    username: "testuser",
    name: "Test User",
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.insert(users).values(user).returning();

  return Response.json(result);
}
