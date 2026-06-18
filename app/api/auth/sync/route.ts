/**
 * POST /api/auth/sync
 *
 * Clerk webhook. Fires on user.created and user.updated.
 * Signature is verified with svix before any processing.
 */

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/models";
import {
  createPreferences,
  createProject,
  createUser,
  findUserById,
  updateUser,
} from "@/lib/storage";
import { nowSec } from "@/lib/utils";

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

/** Extract the primary email from the Clerk payload using primary_email_address_id. */
function parsePrimaryEmail(
  data: Record<string, unknown>,
  userId: string,
): string {
  const emailAddresses =
    (data.email_addresses as ClerkEmailAddress[] | null) ?? [];
  const primaryId = data.primary_email_address_id as string | null;

  if (primaryId) {
    const match = emailAddresses.find((e) => e.id === primaryId);
    if (match?.email_address) return match.email_address;
  }

  // Fallback: first address in the list
  if (emailAddresses[0]?.email_address) {
    return emailAddresses[0].email_address;
  }

  // Placeholder email to satisfy database UNIQUE & NOT NULL constraint
  return `${userId}@noemail.clerk.kiro`;
}

/** Generate a unique username based on Clerk payload, falling back to name/email-prefix/id, and suffixing if it already exists in DB. */
async function generateUniqueUsername(
  data: Record<string, unknown>,
  userId: string,
): Promise<string> {
  let base = "";
  if (
    data.username &&
    typeof data.username === "string" &&
    data.username.trim() !== ""
  ) {
    base = data.username.trim();
  } else {
    const email = parsePrimaryEmail(data, userId);
    if (email && !email.includes("noemail.clerk.kiro")) {
      base = email.split("@")[0];
    } else {
      const firstName = (data.first_name as string | null) ?? "";
      const lastName = (data.last_name as string | null) ?? "";
      base = `${firstName} ${lastName}`.trim();
    }
  }

  // Clean the base name: lowercase, alphanumeric and underscores only
  let cleanBase = base.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!cleanBase) {
    cleanBase = "user";
  }

  // Ensure length limit
  if (cleanBase.length > 20) {
    cleanBase = cleanBase.slice(0, 20);
  }

  let username = cleanBase;
  let counter = 1;

  while (true) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existing.length === 0) {
      return username;
    }

    const suffix = counter.toString();
    const baseToUse = cleanBase.slice(0, 25 - suffix.length);
    username = `${baseToUse}${suffix}`;
    counter++;
  }
}

/** Extract display name and other non-unique fields from a Clerk user payload. */
function parseUserFields(
  data: Record<string, unknown>,
  email: string,
  username: string,
) {
  const firstName = (data.first_name as string | null) ?? "";
  const lastName = (data.last_name as string | null) ?? "";
  const name = `${firstName} ${lastName}`.trim() || username;
  const avatarUrl = (data.image_url as string | null) ?? null;
  return { email, username, name, avatarUrl };
}

export async function POST(request: NextRequest): Promise<Response> {
  // ── Svix signature verification ─────────────────────────────────────────
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id") ?? "";
  const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
  const svixSignature = request.headers.get("svix-signature") ?? "";

  console.log("[Webhook Debug] Verification inputs:", {
    hasSecret: !!secret,
    svixId,
    svixTimestamp,
    svixSignature,
    bodyLength: rawBody.length,
  });

  let payload: Record<string, unknown>;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as Record<string, unknown>;
    console.log(
      "[Webhook Debug] Verification successful. Event type:",
      payload.type,
    );
  } catch (error) {
    console.error("[Webhook Debug] Verification failed:", error);
    return Response.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  const eventType = payload.type as string;
  const data = payload.data as Record<string, unknown>;

  // ── user.created ─────────────────────────────────────────────────────────
  if (eventType === "user.created") {
    const userId = data.id as string;

    // Resilience to Clerk webhook retries: check if user already exists
    const existingUser = await findUserById(userId);
    if (existingUser) {
      console.log(
        `[Webhook] User ${userId} already exists, skipping creation.`,
      );
      return Response.json({ data: "ok" });
    }

    const email = parsePrimaryEmail(data, userId);
    const username = await generateUniqueUsername(data, userId);
    const { name, avatarUrl } = parseUserFields(data, email, username);
    const now = nowSec();

    try {
      await createUser({
        id: userId,
        email,
        username,
        name,
        avatarUrl,
        createdAt: now,
        updatedAt: now,
      });

      await createPreferences({
        id: crypto.randomUUID(),
        userId,
        timezone: "UTC",
        defaultAvailableMin: 240,
        ratioMode: "cumulative",
        morningNudgeTime: "08:00",
        createdAt: now,
        updatedAt: now,
      });

      await createProject({
        id: crypto.randomUUID(),
        userId,
        name: "Todo",
        importance: 3,
        type: "nicetohave",
        deadlineAt: null,
        isDefault: true,
        createdAt: now,
        archivedAt: null,
      });
    } catch (dbError) {
      console.error(
        "[Webhook Error] Database insertion failed during user creation:",
        dbError,
      );
      return Response.json(
        {
          error: "Failed to create user record",
          details: dbError instanceof Error ? dbError.message : String(dbError),
        },
        { status: 500 },
      );
    }
  }

  // ── user.updated ─────────────────────────────────────────────────────────
  if (eventType === "user.updated") {
    const userId = data.id as string;

    // Fetch existing user to preserve email/username if Clerk sends null or empty
    const existingUser = await findUserById(userId);

    const email = parsePrimaryEmail(data, userId);
    let username = "";
    if (
      data.username &&
      typeof data.username === "string" &&
      data.username.trim() !== ""
    ) {
      username = data.username.trim();
    } else if (existingUser?.username) {
      username = existingUser.username;
    } else {
      username = await generateUniqueUsername(data, userId);
    }

    // Keep existing email if the newly parsed email is a placeholder and we already have a real one
    const emailToUse =
      email.includes("noemail.clerk.kiro") &&
      existingUser?.email &&
      !existingUser.email.includes("noemail.clerk.kiro")
        ? existingUser.email
        : email;

    const { name, avatarUrl } = parseUserFields(data, emailToUse, username);

    try {
      await updateUser(userId, {
        email: emailToUse,
        username,
        name,
        avatarUrl,
        updatedAt: nowSec(),
      });
    } catch (dbError) {
      console.error(
        "[Webhook Error] Database update failed during user update:",
        dbError,
      );
      return Response.json(
        {
          error: "Failed to update user record",
          details: dbError instanceof Error ? dbError.message : String(dbError),
        },
        { status: 500 },
      );
    }
  }

  return Response.json({ data: "ok" });
}
