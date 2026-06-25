import { db } from "@/lib/db/client";
import { messages, userContext } from "@/lib/db/models";
import { eq, desc } from "drizzle-orm";
import { groqChat } from "@/lib/groq";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { clerkClient } from "@clerk/nextjs/server";
import { findUserById, createUser, createPreferences, createProject } from "@/lib/storage";

const DEFAULT_PYRAMID = {
  level_0_basic_details: [],
  level_1_preferences: [],
  level_2_guidelines: [],
  level_3_recent_summary: "",
  level_4_running_theme: "",
};

export async function ensureUserExists(userId: string) {
  const existing = await findUserById(userId);
  if (existing) return;
  
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    
    const email = user.emailAddresses[0]?.emailAddress || `${userId}@noemail.clerk.kiro`;
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const name = `${firstName} ${lastName}`.trim() || user.username || "User";
    const username = user.username || email.split("@")[0] || `user_${Date.now()}`;
    const avatarUrl = user.imageUrl || null;
    const now = Math.floor(Date.now() / 1000);

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
  } catch (err) {
    console.error("Error ensuring user exists:", err);
  }
}

export async function getUserContext(userId: string) {
  await ensureUserExists(userId);
  let ctx = await db.select().from(userContext).where(eq(userContext.userId, userId)).get();
  if (!ctx) {
    // initialize
    ctx = await db.insert(userContext).values({
      userId,
      contextPyramid: DEFAULT_PYRAMID as any,
      updateDecay: 20,
      updatedAt: Math.floor(Date.now() / 1000),
    }).returning().get();
  }
  return ctx;
}

export async function pushMessageToDb(userId: string, role: "user" | "assistant" | "system", content: string, agentName?: string, metadata?: any) {
  await ensureUserExists(userId);
  return await db.insert(messages).values({
    id: crypto.randomUUID(),
    userId,
    role,
    agentName,
    content,
    metadata: metadata || null,
    createdAt: Math.floor(Date.now() / 1000),
  });
}

export async function processContextDecay(userId: string) {
  const ctx = await getUserContext(userId);
  
  if (ctx.updateDecay > 0) {
    await db.update(userContext).set({
      updateDecay: ctx.updateDecay - 1,
      updatedAt: Math.floor(Date.now() / 1000)
    }).where(eq(userContext.userId, userId));
    
    if (ctx.updateDecay - 1 === 0) {
      // Trigger rebuild asynchronously
      rebuildContextPyramid(userId).catch(console.error);
    }
  } else {
    // If it's 0 (meaning a previous rebuild failed or is mid-flight)
    // we try to rebuild again
    rebuildContextPyramid(userId).catch(console.error);
  }
}

export async function rebuildContextPyramid(userId: string) {
  const ctx = await getUserContext(userId);
  const pyramid = ctx.contextPyramid as any;

  // 1. Fetch last 25 messages
  const lastMessages = await db.select()
    .from(messages)
    .where(eq(messages.userId, userId))
    .orderBy(desc(messages.createdAt))
    .limit(25);
  
  // Re-order to chronological
  lastMessages.reverse();

  const chatText = lastMessages.map(m => `[${m.role}${m.agentName ? ` (${m.agentName})` : ''}]: ${m.content}`).join("\\n");

  // A. Recent summary (Level 3) via Groq (Llama 3 8B)
  const summaryMessages: any[] = [
    { role: "system", content: "You are a summarizing agent. Summarize the following chat log into a brief, dense summary of the most recent 25 messages. Focus on facts, decisions, and tasks." },
    { role: "user", content: chatText }
  ];
  
  let newLevel3 = "";
  try {
    const groqRes = await groqChat(summaryMessages, [], userId, "llama-3.1-8b-instant");
    newLevel3 = groqRes.choices[0]?.message?.content || "";
  } catch (e) {
    console.error("Groq Level 3 summary failed", e);
    return; // Halt rebuild so it retries next time
  }

  // B. Pyramid rebuild (Levels 0-2, and Level 4) via Gemini
  // Check if API key is present
  if (!process.env.GEMINI_API_KEY) {
    console.warn("No GEMINI_API_KEY found, skipping Level 0-2 & 4 rebuild");
    // Fallback: just update Level 3
    const newPyramid = { ...pyramid, level_3_recent_summary: newLevel3 };
    await db.update(userContext).set({
      contextPyramid: newPyramid,
      updateDecay: 20,
      updatedAt: Math.floor(Date.now() / 1000)
    }).where(eq(userContext.userId, userId));
    return;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite", generationConfig: { responseMimeType: "application/json" } });

  const geminiPrompt = `
You are rebuilding the Kiro Chat System Context Pyramid for a user.
Current Pyramid: ${JSON.stringify(pyramid)}
New Incoming Level 3 Summary (which replaces the old one): ${newLevel3}

Your tasks:
1. Append/update level_0_basic_details if new basic facts surfaced.
2. Append new level_1_preferences if the user explicitly stated a like/dislike.
3. Append new level_2_guidelines if the user gave explicit instructions on HOW to do things.
4. Blend the OUTGOING Level 3 Summary (\${pyramid.level_3_recent_summary}) into level_4_running_theme. Treat this as an exponentially smoothed update. Do NOT wholesale replace Level 4, just nudge it to include the vibe of the outgoing summary.

Return a JSON object exactly matching this schema:
{
  "level_0_basic_details": [{"key": "string", "value": "string", "source": "system|inferred"}],
  "level_1_preferences": [{"statement": "string", "added_at": "timestamp string"}],
  "level_2_guidelines": [{"statement": "string", "added_at": "timestamp string"}],
  "level_3_recent_summary": "string",
  "level_4_running_theme": "string"
}

IMPORTANT: "level_3_recent_summary" MUST be exactly the New Incoming Level 3 Summary provided above.
`;

  try {
    const result = await model.generateContent(geminiPrompt);
    const text = result.response.text();
    const rebuiltPyramid = JSON.parse(text);

    // Validate
    if (
      Array.isArray(rebuiltPyramid.level_0_basic_details) &&
      Array.isArray(rebuiltPyramid.level_1_preferences) &&
      Array.isArray(rebuiltPyramid.level_2_guidelines) &&
      typeof rebuiltPyramid.level_3_recent_summary === "string" &&
      typeof rebuiltPyramid.level_4_running_theme === "string"
    ) {
      // Commit
      await db.update(userContext).set({
        contextPyramid: rebuiltPyramid,
        updateDecay: 20,
        updatedAt: Math.floor(Date.now() / 1000)
      }).where(eq(userContext.userId, userId));
      console.log("Context Pyramid rebuilt successfully");
    } else {
      throw new Error("Validation failed");
    }
  } catch (e) {
    console.error("Gemini Pyramid rebuild failed", e);
    // Do not reset updateDecay so it retries on next message
  }
}
