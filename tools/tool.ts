import { ChatCompletionTool } from "groq-sdk/resources/chat/completions";

import { projectTools, projectHandlers } from "./projects";
import { taskTools, taskHandlers } from "./tasks";
import { preferenceTools, preferenceHandlers } from "./preferences";
import { dayLogTools, dayLogHandlers } from "./dayLogs";
import { plannerTools, plannerHandlers } from "./planner";
import { uiTools, uiHandlers } from "./ui";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getQuoteToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "getQuote",
    description: "Fetch an inspirational quote. This is a dummy tool that simulates a slow network request.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

const getQuoteHandler = async () => {
  return { quote: "The only limit to our realization of tomorrow is our doubts of today." };
};

const getTodayDateToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "getTodayDate",
    description: "Get today's date both as a human-readable string and as a unix day integer.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

const getTodayDateHandler = async () => {
  const now = new Date();
  const unixDay = Math.floor(now.getTime() / 86400000);
  const dateStr = now.toISOString().split('T')[0];
  return { dateStr, unixDay };
};

export const tools: ChatCompletionTool[] = [
  ...projectTools,
  ...taskTools,
  ...preferenceTools,
  ...dayLogTools,
  ...plannerTools,
  ...uiTools,
  getQuoteToolSchema,
  getTodayDateToolSchema,
];

export const toolHandlers: Record<string, Function> = {
  ...projectHandlers,
  ...taskHandlers,
  ...preferenceHandlers,
  ...dayLogHandlers,
  ...plannerHandlers,
  ...uiHandlers,
  getQuote: getQuoteHandler,
  getTodayDate: getTodayDateHandler,
};