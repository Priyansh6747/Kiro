import { ChatCompletionTool } from "groq-sdk/resources/chat/completions";

export const uiTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "changeTheme",
      description: "Change the UI color theme.",
      parameters: {
        type: "object",
        properties: {
          theme: { type: "string", enum: ["paper", "midnight", "nebula", "sage", "nightshade"] }
        },
        required: ["theme"],
      },
    },
  }
];

export const uiHandlers: Record<string, Function> = {
  changeTheme: async (args: any) => {
    return { success: true, theme: args.theme };
  }
};
