import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { dayLogHandlers, dayLogTools } from "./dayLogs";
import { plannerHandlers, plannerTools } from "./planner";
import { preferenceHandlers, preferenceTools } from "./preferences";
import { projectHandlers, projectTools } from "./projects";
import { taskHandlers, taskTools } from "./tasks";
import { uiHandlers, uiTools } from "./ui";
import { planningHandlers, planningTools, SAGE_PROMPT } from "./planning-workflow";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getQuoteToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "getQuote",
    description:
      "Fetch an inspirational quote. This is a dummy tool that simulates a slow network request.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

const getQuoteHandler = async () => {
  return {
    quote:
      "The only limit to our realization of tomorrow is our doubts of today.",
  };
};

const getTodayDateToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "getTodayDate",
    description:
      "Get today's date both as a human-readable string and as a unix day integer.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

const getTodayDateHandler = async () => {
  const now = new Date();
  const unixDay = Math.floor(now.getTime() / 86400000);
  const dateStr = now.toISOString().split("T")[0];
  return { dateStr, unixDay };
};

export const agentScopes = `
Other agents and their scopes:
- Yuki (Assistant): General orchestration, can delegate to anyone.
- Nova (ProjectAgent): Projects — creation, importance, deadlines (NOT planning. Route 'plan a project' requests to Sage).
- Quill (TaskAgent): Granular task ops — create, complete, reschedule.
- Echo (PreferencesAgent): Background config — timezone, ratio mode, nudge time.
- Iva (DayLogAgent): Records daily history — the append-only ledger.
- Juno (PlannerAgent): Orchestrates the daily plan, enforces overload warnings.
- Zef (UIAgent): Navigation/UI-state actions.
- Sage (PlanningAgent): End-to-end project planning — intake → brief → tasks → graph.

If the user asks you to do something outside your scope, DO NOT try to fulfill it or hallucinate tools. Instead, tell the user to ask the corresponding agent or use Yuki.`;

export const agents: Record<
  string,
  {
    tools: ChatCompletionTool[];
    handlers: Record<string, Function>;
    prompt: string;
    description: string;
  }
> = {
  Nova: {
    tools: projectTools,
    handlers: projectHandlers,
    prompt: "You are Nova, the Kiro Project Agent. Your scope is Projects — creation, importance, deadlines. Only use the tools provided to answer the user's request.\n" + agentScopes,
    description: "Projects — creation, importance, deadlines",
  },
  Quill: {
    tools: taskTools,
    handlers: taskHandlers,
    prompt: "You are Quill, the Kiro Task Agent. Your scope is Granular task ops — create, complete, reschedule. Only use the tools provided to answer the user's request.\n" + agentScopes,
    description: "Granular task ops — create, complete, reschedule",
  },
  Echo: {
    tools: preferenceTools,
    handlers: preferenceHandlers,
    prompt: "You are Echo, the Kiro Preferences Agent. Your scope is Background config — timezone, ratio mode, nudge time. Only use the tools provided to answer the user's request.\n" + agentScopes,
    description: "Background config — timezone, ratio mode, nudge time",
  },
  Iva: {
    tools: dayLogTools,
    handlers: dayLogHandlers,
    prompt: "You are Iva, the Kiro DayLog Agent. Your scope is Records daily history — the append-only ledger. Only use the tools provided to answer the user's request.\n" + agentScopes,
    description: "Records daily history — the append-only ledger",
  },
  Juno: {
    tools: plannerTools,
    handlers: plannerHandlers,
    prompt: "You are Juno, the Kiro Planner Agent. Your scope is Orchestrates the daily plan, enforces overload warnings. Only use the tools provided to answer the user's request.\n" + agentScopes,
    description: "Orchestrates the daily plan, enforces overload warnings",
  },
  Zef: {
    tools: uiTools,
    handlers: uiHandlers,
    prompt: "You are Zef, the Kiro UI Agent. Your scope is Navigation/UI-state actions. Only use the tools provided to answer the user's request.\n" + agentScopes,
    description: "Navigation/UI-state actions",
  },
  Sage: {
    tools: planningTools,
    handlers: planningHandlers,
    prompt: SAGE_PROMPT,
    description: "End-to-end project planning — intake, clarification, brief, tasks, graph.",
  },
};

const delegateToAgentToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "delegateToAgent",
    description:
      "Delegate a specific task to a specialized agent. The agent will use its own tools to execute the instruction and return the result. Use this whenever you need to manage projects, tasks, preferences, day logs, planner, or UI. DO NOT try to answer without using this tool if it requires a tool.",
    parameters: {
      type: "object",
      properties: {
        agentName: {
          type: "string",
          enum: Object.keys(agents),
          description: "The name of the agent to delegate to.",
        },
        instruction: {
          type: "string",
          description: "Detailed instructions for the agent on what to do.",
        },
        snarkyComment: {
          type: "string",
          description: "Your mandatory snarky/witty comment explicitly tagging the agent (e.g. 'Wow, you're lazy. Hey @Zef change the theme'). This string will be displayed to the user as your response BEFORE the delegation.",
        },
      },
      required: ["agentName", "instruction", "snarkyComment"],
    },
  },
};

export const tools: ChatCompletionTool[] = [
  delegateToAgentToolSchema,
  getQuoteToolSchema,
  getTodayDateToolSchema,
];

export const toolHandlers: Record<string, Function> = {
  getQuote: getQuoteHandler,
  getTodayDate: getTodayDateHandler,
};
