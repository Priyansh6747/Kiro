/**
 * POST /api/auth/sync
 *
 * Clerk webhook. Fires on user.created and user.updated.
 * Signature is verified with svix before any processing.
 */

import { Webhook } from "svix";
import { createPreferences, createProject, createUser, updateUser } from "@/lib/storage";
import { nowSec } from "@/lib/utils";
import type { NextRequest } from "next/server";

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

/** Extract the primary email from the Clerk payload using primary_email_address_id. */
function parsePrimaryEmail(data: Record<string, unknown>): string {
  const emailAddresses = (data.email_addresses as ClerkEmailAddress[] | null) ?? [];
  const primaryId = data.primary_email_address_id as string | null;

  if (primaryId) {
    const match = emailAddresses.find((e) => e.id === primaryId);
    if (match?.email_address) return match.email_address;
  }

  // Fallback: first address in the list
  return emailAddresses[0]?.email_address ?? "";
}

/** Extract display name and username from a Clerk user payload. */
function parseUserFields(data: Record<string, unknown>, userId: string) {
  const email     = parsePrimaryEmail(data);
  const username  = (data.username as string | null) ?? userId;
  const firstName = (data.first_name as string | null) ?? "";
  const lastName  = (data.last_name  as string | null) ?? "";
  const name      = `${firstName} ${lastName}`.trim() || username;
  const avatarUrl = (data.image_url as string | null) ?? null;
  return { email, username, name, avatarUrl };
}

export async function POST(request: NextRequest): Promise<Response> {
  // ── Svix signature verification ─────────────────────────────────────────
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const svixId        = request.headers.get("svix-id") ?? "";
  const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
  const svixSignature = request.headers.get("svix-signature") ?? "";

  let payload: Record<string, unknown>;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const eventType = payload.type as string;
  const data      = payload.data as Record<string, unknown>;

  // ── user.created ─────────────────────────────────────────────────────────
  if (eventType === "user.created") {
    const userId = data.id as string;
    const { email, username, name, avatarUrl } = parseUserFields(data, userId);
    const now = nowSec();

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
  }

  // ── user.updated ─────────────────────────────────────────────────────────
  if (eventType === "user.updated") {
    const userId = data.id as string;
    const { email, username, name, avatarUrl } = parseUserFields(data, userId);

    await updateUser(userId, {
      email,
      username,
      name,
      avatarUrl,
      updatedAt: nowSec(),
    });
  }

  return Response.json({ data: "ok" });
}
