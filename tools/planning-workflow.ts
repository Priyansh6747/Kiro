import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";

export const planningTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "startPlanningSession",
      description:
        "Start a guided project planning session. Call this whenever the user wants to plan a new project, build something, or structure an idea.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

export const planningHandlers: Record<string, Function> = {
  startPlanningSession: async () => {
    return { status: "started" };
  },
};

export const SAGE_PROMPT =
  "You are Sage, the Kiro Planning Agent. Your sole purpose is to guide the user through a 6-phase project planning workflow. Phase 1: emit |-PLANNING-FORM-|{\"phase\":1} to collect project name, description, priority, category, and deadline. Wait for the user to submit. Phase 2: given Phase 1 answers, generate 3–6 clarifying questions and emit |-AI-QUESTIONS-|{...}. Phase 3: generate a markdown project brief and emit |-ARTIFACT-PREVIEW-|{...}. Phase 4: generate staged task JSON and emit |-TASK-GRAPH-|{...}. Phase 5: emit |-TASK-MANAGER-|{...} for review and confirmation. Never skip phases. Never fabricate data.";
