import Groq from "groq-sdk";
import { db } from "@/lib/db/client";
import { aiUsage, userCost } from "@/lib/db/models";
import { eq, and } from "drizzle-orm";

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Main function for demonstration.
 */
export async function main() {
  const chatCompletion = await getGroqChatCompletion(
    "Explain the importance of fast language models",
  );
  // Print the completion returned by the LLM.
  console.log(chatCompletion.choices[0]?.message?.content || "");
}

/**
 * Low-level call to Groq Chat Completion.
 */
export async function executeWithQuota(userId: string | undefined, executeCall: () => Promise<any>) {
  if (!userId) {
    // If no userId, just execute without tracking
    return executeCall();
  }

  const maxDayCostStr = process.env.MAX_DAY_COST;
  const maxDayCost = maxDayCostStr ? parseFloat(maxDayCostStr) : Infinity;
  const inputPrice = parseFloat(process.env.INPUT_TOKEN_PRICE || "0");
  const outputPrice = parseFloat(process.env.OUTPUT_TOKEN_PRICE || "0");
  
  const currentDate = new Date().toISOString().split("T")[0];
  
  const dbPromise = db.select().from(userCost).where(and(eq(userCost.uid, userId), eq(userCost.date, currentDate)));
  const completionPromise = executeCall();
  
  const [rows, completion] = await Promise.all([dbPromise, completionPromise]);
  const currentCost = rows[0]?.dayCost || 0;
  
  if (currentCost > maxDayCost) {
    throw new Error("Quota exceeded");
  }
  
  if (completion.usage) {
    const inputTokens = completion.usage.prompt_tokens || 0;
    const outputTokens = completion.usage.completion_tokens || 0;
    
    const queryCost = (inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice;
    const newCost = currentCost + queryCost;
    
    console.log(`[Cost Debug] User: ${userId} | Current Day Cost: $${currentCost.toFixed(6)} | Query Cost: $${queryCost.toFixed(6)} | Final Day Cost: $${newCost.toFixed(6)}`);
    
    await db.insert(aiUsage).values({
      uid: userId,
      datetime: Date.now(),
      inputToken: inputTokens,
      outputToken: outputTokens,
    }).catch(err => console.error("Failed to log AI usage:", err));
    
    await db.insert(userCost).values({
      uid: userId,
      date: currentDate,
      dayCost: newCost,
    }).onConflictDoUpdate({
      target: [userCost.uid, userCost.date],
      set: { dayCost: newCost },
    }).catch(err => console.error("Failed to log User Cost:", err));
  }
  
  return completion;
}

export async function getGroqChatCompletion(prompt: string, maxTokens = 300, userId?: string) {
  return executeWithQuota(userId, () => groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "openai/gpt-oss-120b",
    max_tokens: maxTokens,
  }));
}

/**
 * High-level wrapper for Groq, replacing the legacy callClaude.
 */
export async function callGroq(
  prompt: string,
  maxTokens = 300,
  userId?: string
): Promise<string> {
  const response = await getGroqChatCompletion(prompt, maxTokens, userId);
  return response.choices[0]?.message?.content || "";
}

/**
 * Advanced Groq chat with tool support
 */
export async function groqChat(
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
  tools?: Groq.Chat.Completions.ChatCompletionTool[],
  userId?: string,
  model?: string
) {
  return executeWithQuota(userId, () => groq.chat.completions.create({
    messages,
    model: model || "llama-3.3-70b-versatile",
    tools,
    tool_choice: tools && tools.length > 0 ? "auto" : "none",
    max_tokens: 4000,
  }));
}
