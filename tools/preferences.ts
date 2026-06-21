import { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { auth } from "@clerk/nextjs/server";
import { getOrCreatePreferences, updatePreferences } from "@/lib/storage";
import { nowSec } from "@/lib/utils";

export const preferenceTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getPreferences",
      description: "Get user preferences like timezone, working hours, ratio mode, etc.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "updatePreferences",
      description: "Update user preferences (e.g. timezone, morning_nudge_time, ratio_mode, default_available_min).",
      parameters: {
        type: "object",
        properties: {
          timezone: { type: "string" },
          morningNudgeTime: { type: "string", description: "HH:MM format" },
          ratioMode: { type: "string", enum: ["cumulative", "streak"] },
          defaultAvailableMin: { type: "integer" }
        },
        required: [],
      },
    },
  }
];

export const preferenceHandlers: Record<string, Function> = {
  getPreferences: async () => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    return await getOrCreatePreferences(userId);
  },
  updatePreferences: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    
    const updates: any = {};
    if (args.timezone) updates.timezone = args.timezone;
    if (args.morningNudgeTime) updates.morningNudgeTime = args.morningNudgeTime;
    if (args.ratioMode) updates.ratioMode = args.ratioMode;
    if (args.defaultAvailableMin) updates.defaultAvailableMin = args.defaultAvailableMin;
    updates.updatedAt = nowSec();

    return await updatePreferences(userId, updates);
  }
};
