import { ChatCompletionTool } from "groq-sdk/resources/chat/completions";

import { projectTools, projectHandlers } from "./projects";
import { taskTools, taskHandlers } from "./tasks";
import { preferenceTools, preferenceHandlers } from "./preferences";
import { dayLogTools, dayLogHandlers } from "./dayLogs";
import { plannerTools, plannerHandlers } from "./planner";
import { uiTools, uiHandlers } from "./ui";

export const tools: ChatCompletionTool[] = [
  ...projectTools,
  ...taskTools,
  ...preferenceTools,
  ...dayLogTools,
  ...plannerTools,
  ...uiTools,
];

export const toolHandlers: Record<string, Function> = {
  ...projectHandlers,
  ...taskHandlers,
  ...preferenceHandlers,
  ...dayLogHandlers,
  ...plannerHandlers,
  ...uiHandlers,
};