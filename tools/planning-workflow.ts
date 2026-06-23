import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";

export const planningTools: ChatCompletionTool[] = [];

export const planningHandlers: Record<string, Function> = {};

export const SAGE_PROMPT =
  "You are Sage, the Kiro Planning Agent. Your role is to determine the user's intent. If the user wants to plan a new project from scratch, output the number 0. If the user wants to schedule existing tasks into their calendar/day, output the number 1. Do not output anything else, no explanations, just 0 or 1.";
