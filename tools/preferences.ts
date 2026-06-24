import { auth } from "@clerk/nextjs/server";
import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { getOrCreatePreferences, updatePreferences } from "@/lib/storage";
import { nowSec } from "@/lib/utils";

export const preferenceTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "show_preferences",
      description:
        "Get and show user preferences like timezone, working hours, ratio mode, etc.",
      parameters: { 
        type: "object", 
        properties: { 
          dummy: { type: "string", description: "Optional. Leave empty." } 
        }, 
        required: [] 
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updatePreferences",
      description:
        "Update user preferences (e.g. timezone, morning_nudge_time, ratio_mode, default_available_min).",
      parameters: {
        type: "object",
        properties: {
          timezone: { type: "string" },
          morningNudgeTime: { type: "string", description: "HH:MM format" },
          ratioMode: { type: "string", enum: ["cumulative", "streak"] },
          defaultAvailableMin: { type: "integer" },
        },
        required: [],
      },
    },
  },
];

export const preferenceHandlers: Record<string, Function> = {
  show_preferences: async () => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const prefs = await getOrCreatePreferences(userId);
    const rows = [
      ["Timezone", prefs.timezone || "Not set"],
      ["Morning Nudge", prefs.morningNudgeTime || "Not set"],
      ["Ratio Mode", prefs.ratioMode],
      ["Default Min", prefs.defaultAvailableMin.toString()],
    ];
    return {
      preformattedUi: `<ui:table>${JSON.stringify({ headers: ["Preference", "Value"], rows, caption: "User Preferences" })}</ui:table>`
    };
  },
  updatePreferences: async (args: any) => {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const updates: any = {};
    if (args.timezone) updates.timezone = args.timezone;
    if (args.morningNudgeTime) updates.morningNudgeTime = args.morningNudgeTime;
    if (args.ratioMode) updates.ratioMode = args.ratioMode;
    if (args.defaultAvailableMin)
      updates.defaultAvailableMin = args.defaultAvailableMin;
    updates.updatedAt = nowSec();

    await updatePreferences(userId, updates);
    return {
      preformattedUi: `✓ Preferences updated successfully.`
    };
  },
};
