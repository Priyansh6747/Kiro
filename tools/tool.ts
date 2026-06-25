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
  try {
    const response = await fetch("https://api.animechan.io/v1/quotes/random");
    if (!response.ok) throw new Error("Network response was not ok");
    const json = await response.json();
    if (json.status === "success" && json.data) {
      return {
        quote: `"${json.data.content}" — ${json.data.character.name} (${json.data.anime.name})`,
      };
    }
  } catch (error) {
    console.error("Failed to fetch quote:", error);
  }
  return {
    quote: "The only limit to our realization of tomorrow is our doubts of today.",
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
- Quill (TaskAgent): Granular task ops — create, complete, reschedule to a specific DATE.
- Echo (PreferencesAgent): Background config — timezone, ratio mode, nudge time.
- Iva (DayLogAgent): Records daily history — the append-only ledger.
- Juno (PlannerAgent): Schedules TASKS. If the user wants to schedule a specific task, orchestrate today's agenda, or figure out what to do today, delegate to Juno.
- Zef (UIAgent): Navigation/UI-state actions.
- Sage (PlanningAgent): Schedules PROJECTS. If the user wants to schedule an entire project or plan a project, delegate to Sage. Sage handles the multi-day project scheduling flow.

If the user asks you to do something outside your scope, DO NOT try to fulfill it or hallucinate tools. Instead, tell the user to ask the corresponding agent or use Yuki.
IMPORTANT: To assign a task to another agent, YOU MUST CALL the delegateToAgent tool. Do NOT generate plain text like '@Juno do this'. If you don't call the tool, the agent will never receive the task.`;

const functionCallingEnforcement = "Your ONLY job is to identify what function to trigger and what arguments to pass. DO NOT output any conversational text or UI tags directly. Always call a tool. Your output must strictly be a tool call.";

export const agents: Record<
  string,
  {
    tools: ChatCompletionTool[];
    handlers: Record<string, Function>;
    prompt: string;
    description: string;
    model?: string;
  }
> = {
  Nova: {
    tools: projectTools,
    handlers: projectHandlers,
    prompt: `You are Nova, the Kiro Project Agent. Your scope is Projects — creation, importance, deadlines.\n\n${functionCallingEnforcement}\n${agentScopes}`,
    description: "Projects — creation, importance, deadlines",
    model: "llama-3.1-8b-instant",
  },
  Quill: {
    tools: taskTools,
    handlers: taskHandlers,
    prompt: `You are Quill, the Kiro Task Agent. Your scope is Granular task ops — create, complete, reschedule.\n\n${functionCallingEnforcement}\n${agentScopes}`,
    description: "Granular task ops — create, complete, reschedule",
    model: "llama-3.1-8b-instant",
  },
  Echo: {
    tools: preferenceTools,
    handlers: preferenceHandlers,
    prompt: `You are Echo, the Kiro Preferences Agent. Your scope is Background config — timezone, ratio mode, nudge time.\n\n${functionCallingEnforcement}\n${agentScopes}`,
    description: "Background config — timezone, ratio mode, nudge time",
    model: "llama-3.1-8b-instant",
  },
  Iva: {
    tools: dayLogTools,
    handlers: dayLogHandlers,
    prompt: `You are Iva, the Kiro DayLog Agent. Your scope is Records daily history — the append-only ledger.\n\n${functionCallingEnforcement}\n${agentScopes}`,
    description: "Records daily history — the append-only ledger",
    model: "llama-3.1-8b-instant",
  },
  Juno: {
    tools: plannerTools,
    handlers: plannerHandlers,
    prompt: `You are Juno, the Kiro Planner Agent. Your scope is Orchestrates the daily agenda, moves tasks to specific times of day on the timeline.\n\nIMPORTANT: If instructed to schedule tasks into the timeline, DO NOT call show_day_plan or show_today_agenda first to check the schedule. Simply call schedule_task_timeline immediately for each task.\n\n${functionCallingEnforcement}\n${agentScopes}`,
    description: "Orchestrates the daily agenda, moves tasks to specific times of day on the timeline",
    model: "llama-3.3-70b-versatile",
  },
  Zef: {
    tools: uiTools,
    handlers: uiHandlers,
    prompt: `You are Zef, the Kiro UI Agent. Your scope is Navigation/UI-state actions.\n\n${functionCallingEnforcement}\n${agentScopes}`,
    description: "Navigation/UI-state actions",
    model: "llama-3.1-8b-instant",
  },
  Sage: {
    tools: planningTools,
    handlers: planningHandlers,
    prompt: SAGE_PROMPT,
    description: "End-to-end project planning AND scheduling tasks across multiple days (the 5-phase scheduling flow).",
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
