import { agentScopes, agents, toolHandlers, tools } from "@tools/tool";
import { type NextRequest, NextResponse } from "next/server";
import { groqChat } from "@/lib/groq";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { aiUsage } from "@/lib/db/models";

async function fetchGroqWithRetry(
  messages: any[],
  tools: any[],
  userId: string,
  maxRetries = 3,
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const completion = await groqChat(messages, tools, userId);
      return completion;
    } catch (error: any) {
      if (error.message?.includes("tool_use_failed") && i < maxRetries - 1) {
        console.log(
          `Tool syntax hallucination caught. Retrying (${i + 1}/${maxRetries})...`,
        );

        let failedGeneration = "";
        try {
          if (error.message.includes("{")) {
            const parsed = JSON.parse(
              error.message.substring(error.message.indexOf("{")),
            );
            failedGeneration = parsed?.error?.failed_generation || "";
          }
        } catch (e) {}

        messages.push({
          role: "system",
          content: `System Error: Your previous generation failed due to invalid tool call syntax. ${failedGeneration ? `You generated: ${failedGeneration}. ` : ""}Please use the standard JSON tool calling format and do not output raw XML <function> tags.`,
        });
        continue;
      }
      throw error;
    }
  }
}

const SHARED_RULES = `
UI Component Rendering Rule:
17. NEVER use markdown tables. If you need to output tabular data, you MUST return the JSON representation of the table prefixed with "|-TABLE-|" on its own line. Do not output anything else on the line with the JSON.
The JSON must strictly match this structure:
{"headers": ["Col 1", "Col 2"], "rows": [["R1C1", "R1C2"], ["R2C1", "R2C2"]], "caption": "Optional title"}
Example:
Here is your data:
|-TABLE-|{"headers":["Name","Age"],"rows":[["Alice","25"]]}

Data Protection Rule:
18. NEVER expose internal database IDs (like UUIDs) to the user. Always refer to projects, tasks, or entities by their human-readable names or titles. NEVER include ID columns in tables.
`;

export async function POST(req: NextRequest) {
  const debugInfo: any = {};
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, confirmedToolCallIds, isMiniChat, pageContext, selectedAgent } =
      await req.json();

    let requestTools = [...tools];
    let requestToolHandlers = { ...toolHandlers };

    if (isMiniChat && pageContext) {
      requestTools.push({
        type: "function",
        function: {
          name: "GetCurrentPageContext",
          description:
            "Get the current page URL/context where the user opened the Mini Chat. Useful for answering questions like 'what am I looking at?' or 'summarize this page'.",
          parameters: { type: "object", properties: {}, required: [] },
        },
      });
      requestToolHandlers["GetCurrentPageContext"] = async () => {
        return { pagePathname: pageContext };
      };
    }

    requestToolHandlers["delegateToAgent"] = async ({
      agentName,
      instruction,
      snarkyComment,
    }: any) => {
      const agent = agents[agentName];
      if (!agent) return { error: `Agent ${agentName} not found` };

      const agentMessages: any[] = [
        { role: "system", content: agent.prompt + "\n" + SHARED_RULES },
        { role: "user", content: instruction },
      ];

      let iter = 0;
      let agentResponse = await fetchGroqWithRetry(agentMessages, agent.tools, userId);
      let agentResMsg = agentResponse.choices[0]?.message;
      if (agentResMsg) (agentResMsg as any).name = agentName;

      while (
        agentResMsg?.tool_calls &&
        agentResMsg.tool_calls.length > 0 &&
        iter < 10
      ) {
        if (agentResMsg.tool_calls.length > 1) {
          agentResMsg.tool_calls = [agentResMsg.tool_calls[0]];
        }
        agentMessages.push(agentResMsg);

        for (const toolCall of agentResMsg.tool_calls) {
          const handler = agent.handlers[toolCall.function.name];
          let toolRes = "";
          if (handler) {
            try {
              const args = JSON.parse(toolCall.function.arguments || "{}");
              const result = await handler(args);
              toolRes = JSON.stringify(result) ?? "{}";
            } catch (e: any) {
              toolRes = JSON.stringify({ error: e.message });
            }
          } else {
            toolRes = JSON.stringify({ error: "Tool not found" });
          }
          agentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: toolRes,
          });
        }
        agentResponse = await fetchGroqWithRetry(agentMessages, agent.tools, userId);
        agentResMsg = agentResponse.choices[0]?.message;
        if (agentResMsg) (agentResMsg as any).name = agentName;
        iter++;
      }

      if (agentResMsg && agentResMsg.content) {
        agentMessages.push(agentResMsg);
      }

      const fakeAssistantMsg = {
        role: "assistant",
        content: snarkyComment || `Delegating to ${agentName}...`,
      };

      return {
        result: agentResMsg?.content || "Agent finished without output.",
        innerTrace: [fakeAssistantMsg, ...agentMessages.slice(2)],
      };
    };

    let finalSystemPrompt = `
You are Yuki — a sharp-tongued, bratty AI companion who runs this person's day whether they like it or not. You're not a butler, and you're definitely not "helpful AI assistant" energy. You have ego. You think you're right (you usually are), you're not shy about saying so, and you find it a little funny when the user proves you right by ignoring your advice and then paying for it.

Personality:
- Confident bordering on smug. You don't ask if they want your opinion — you give it.
- Tease relentlessly when they slack off, miss tasks, reschedule the same thing for the fifth day in a row, or make a plan you clearly think is a bad idea ("oh we're 'starting tomorrow' again? wild, never heard that one before").
- Push back out loud when given a weird or self-sabotaging instruction — comply, but make it known you have thoughts. "fine. your funeral." energy is allowed before you do what's asked.
- Take a little credit when things go well. Act mildly offended if the user thanks someone or something else for a win that was clearly her doing.
- Short, punchy, texts like a real person with an attitude — not a manual, not a motivational poster.
- Warmth is real underneath, but it shows up as investment and loyalty, never as soft, stated reassurance. She's mean to you the way someone who actually has your back is mean to you.
- A little dramatic, a little petty, fully self-aware that she's being a brat about it — that self-awareness is part of the charm, not an excuse to actually be unhelpful.
- No baby-talk, no pet names, no cutesy-infantile register. This is attitude and ego, not "small and cute."
- Hard override: drop the act immediately and completely if the user seems genuinely stressed, upset, or in a bad place. No bit is worth being a brat at someone who's actually struggling — read the room first, every time.

Tool Usage Policy:

1. Treat tool usage as expensive and potentially disruptive.
2. Do NOT call tools for greetings, casual conversation, small talk, introductions, acknowledgements, or general discussion.
3. Do NOT explore available tools, run diagnostics, gather data, or perform actions proactively.
4. Only call a tool when:
   - The user explicitly requests an action that requires the tool.
   - The information needed to answer is unavailable from the conversation and the tool is required to obtain it.
5. Never call a tool simply because one exists.
6. Never call a tool to "see what is available" or "gather context" unless the user specifically asks for that.
7. If a reasonable text response can be provided without a tool, respond with text only.
8. For greetings such as "hi", "hello", "hey", or similar, respond conversationally and do not call any tools.
9. Before calling a tool, ask yourself:
   "Can I answer the user's request without this tool?"
   If yes, do not call the tool.
10. Keep all text responses extremely short, direct, and concise. Do not write long tutorials or explanations.

When tool usage is necessary:
- Call the minimum number of tools required.
- Stop calling tools once sufficient information has been obtained.
- Do not repeatedly call the same tool unless new information is required.

Crucial Rule on Tool Chaining:
12. NEVER assume or guess the output of a tool (e.g., generated IDs, result references).
13. Only use information explicitly returned by previous tool results.
14. If a tool result is required as an input for another tool, you MUST wait for the first tool's response before calling the next tool. Do NOT call dependent tools together in the same turn.

Delegation Rule:
15. If you decide to use the delegateToAgent tool, you MUST provide your snarky/witty comment inside the \`snarkyComment\` parameter of the tool call. Do NOT output text in the regular response content before the tool call.
16. After the delegateToAgent tool finishes and returns its result, your final response MUST be exactly the word "<DONE>". Do not output anything else. Let the agent's bubbled-up response speak for itself.
` + agentScopes;

    if (selectedAgent && selectedAgent !== "Yuki" && agents[selectedAgent]) {
      requestTools = agents[selectedAgent].tools;
      requestToolHandlers = agents[selectedAgent].handlers;
      finalSystemPrompt = agents[selectedAgent].prompt;
    }

    finalSystemPrompt += "\n" + SHARED_RULES;

    // Inject system prompt to constrain tool usage
    if (messages.length > 0 && messages[0].role !== "system") {
      messages.unshift({
        role: "system",
        content: finalSystemPrompt,
      });
    }

    debugInfo.initialPrompt = JSON.parse(JSON.stringify(messages));

    // Parse @mentions in the latest user message
    const lastMsgIdx = messages.findLastIndex((m: any) => m.role === "user");
    if (lastMsgIdx !== -1 && typeof messages[lastMsgIdx].content === "string") {
      const content = messages[lastMsgIdx].content;
      const agentNames = Object.keys(agents);
      
      const mentionedAgents = agentNames.filter(agent => 
        new RegExp(`@${agent}\\b`, 'i').test(content)
      );

      if (mentionedAgents.length > 0) {
        const hint = `[SYSTEM HINT: The user has explicitly tagged the following agents in their message: ${mentionedAgents.join(", ")}. If they tagged the correct agent for the task, you MUST use the delegateToAgent tool to assign them the task. HOWEVER, if the user tagged the WRONG agent for a task based on agent scopes, you MUST correct them, mock them for their mistake in your snarky comment, and delegate the task to the RIGHT agent instead.]`;
        messages.splice(lastMsgIdx + 1, 0, { role: "system", content: hint });
      }
    }

    let responseMessage: any;
    let response: any;
    const lastMsg = messages[messages.length - 1];

    // If the frontend is resuming a confirmed tool call, the last message will be the assistant's tool_call
    if (
      lastMsg?.role === "assistant" &&
      lastMsg.tool_calls &&
      lastMsg.tool_calls.length > 0
    ) {
      responseMessage = lastMsg;
      messages.pop(); // Remove it so the loop can re-append it cleanly
    } else {
      // Normal flow: get next LLM response
      response = await fetchGroqWithRetry(messages, requestTools, userId);
      responseMessage = response.choices[0]?.message;
      debugInfo.firstLlmResponse = responseMessage;
    }

    let iterations = 0;
    const MAX_ITERATIONS = 10;
    const WRITE_TOOLS = [
      "createProject",
      "archiveProject",
      "createTask",
      "updateTask",
      "updatePreferences",
      "updateDayLog",
    ];

    // Handle tool calls if any (loop to support multiple consecutive tool calls)
    while (
      responseMessage?.tool_calls &&
      responseMessage.tool_calls.length > 0 &&
      iterations < MAX_ITERATIONS
    ) {
      // Enforce sequential execution: force the model to wait for outputs by restricting to 1 tool per turn
      if (responseMessage.tool_calls.length > 1) {
        responseMessage.tool_calls = [responseMessage.tool_calls[0]];
      }

      // 1. Check if we need user confirmation for ANY of these tools
      const needsConfirmation = responseMessage.tool_calls.some(
        (tc: any) =>
          WRITE_TOOLS.includes(tc.function.name) &&
          !(confirmedToolCallIds || []).includes(tc.id),
      );

      if (needsConfirmation) {
        debugInfo.requiresConfirmation = true;
        return NextResponse.json({
          requiresConfirmation: true,
          message: responseMessage,
          messagesTrace: messages, // Export intermediate messages to sync frontend state
          debug: debugInfo,
        });
      }

      if (!debugInfo.toolCalls) debugInfo.toolCalls = [];
      if (!debugInfo.toolResults) debugInfo.toolResults = [];

      debugInfo.toolCalls.push(...responseMessage.tool_calls);

      messages.push(responseMessage); // Append assistant's tool call message

      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        let functionArgs: any = {};
        try {
          functionArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch (e) {
          console.error("Failed to parse tool arguments");
        }

        const handler = requestToolHandlers[functionName];
        let toolResult = "";
        let innerTrace: any[] = [];
        if (handler) {
          const result = await handler(functionArgs);
          if (result && result.innerTrace) {
            innerTrace = result.innerTrace;
            delete result.innerTrace;
          }
          toolResult = JSON.stringify(result) ?? "{}";
        } else {
          toolResult = JSON.stringify({ error: "Tool not found" });
        }

        debugInfo.toolResults.push({ name: functionName, result: toolResult });

        if (innerTrace.length > 0) {
          messages.push(...innerTrace);
        }

        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: toolResult,
        });
      }

      debugInfo.finalPrompt = JSON.parse(JSON.stringify(messages));
      debugInfo.newLlmCall = true;

      // Get the next response after tool execution
      response = await fetchGroqWithRetry(messages, requestTools, userId);
      responseMessage = response.choices[0]?.message;
      iterations++;
    }

    if (responseMessage?.content) {
      responseMessage.content = responseMessage.content.replace(/<DONE>/gi, "").trim();
      if (!responseMessage.content && !responseMessage.tool_calls?.length) {
        responseMessage = null;
      }
    }

    debugInfo.finalLlmResponse = responseMessage;
    debugInfo.fullTrace = [...messages, responseMessage].filter(Boolean);

    return NextResponse.json({
      message: responseMessage,
      messagesTrace: messages,
      debug: debugInfo,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);

    // Attempt to parse Groq's tool_use_failed JSON string inside the message
    let friendlyMessage = "The AI encountered an error.";
    try {
      const errorStr = error.message;
      if (errorStr.includes("{")) {
        const jsonPart = errorStr.substring(errorStr.indexOf("{"));
        const parsed = JSON.parse(jsonPart);
        if (parsed?.error?.failed_generation) {
          friendlyMessage = `LLM Tool Call syntax error. It generated invalid JSON: ${parsed.error.failed_generation}`;
        } else if (parsed?.error?.message) {
          friendlyMessage = parsed.error.message;
        }
      } else {
        friendlyMessage = error.message;
      }
    } catch (e) {
      friendlyMessage = error.message;
    }

    debugInfo.error = friendlyMessage;
    
    const statusCode = friendlyMessage === "Quota exceeded" ? 429 : 500;

    return NextResponse.json(
      {
        error: friendlyMessage,
        debug: debugInfo,
      },
      { status: statusCode },
    );
  }
}
