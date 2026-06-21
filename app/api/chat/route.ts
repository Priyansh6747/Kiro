import { NextRequest, NextResponse } from "next/server";
import { groqChat } from "@/lib/groq";
import { tools, toolHandlers } from "@tools/tool";

async function fetchGroqWithRetry(messages: any[], tools: any[], maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await groqChat(messages, tools);
    } catch (error: any) {
      if (error.message?.includes("tool_use_failed") && i < maxRetries - 1) {
        console.log(`Tool syntax hallucination caught. Retrying (${i + 1}/${maxRetries})...`);
        
        let failedGeneration = "";
        try {
          if (error.message.includes("{")) {
            const parsed = JSON.parse(error.message.substring(error.message.indexOf("{")));
            failedGeneration = parsed?.error?.failed_generation || "";
          }
        } catch (e) {}

        messages.push({
          role: "system",
          content: `System Error: Your previous generation failed due to invalid tool call syntax. ${failedGeneration ? `You generated: ${failedGeneration}. ` : ""}Please use the standard JSON tool calling format and do not output raw XML <function> tags.`
        });
        continue;
      }
      throw error;
    }
  }
}

export async function POST(req: NextRequest) {
  let debugInfo: any = {};
  try {
    const { messages, confirmedToolCallIds } = await req.json();
    
    // Inject system prompt to constrain tool usage
    if (messages.length > 0 && messages[0].role !== "system") {
      messages.unshift({
        role: "system",
        content: `You are a helpful AI assistant.

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
11. NEVER expose internal database IDs (like UUIDs) to the user. Always refer to projects, tasks, or entities by their human-readable names or titles.

When tool usage is necessary:
- Call the minimum number of tools required.
- Stop calling tools once sufficient information has been obtained.
- Do not repeatedly call the same tool unless new information is required.

Crucial Rule on Tool Chaining:
12. NEVER assume or guess the output of a tool (e.g., generated IDs, result references).
13. Only use information explicitly returned by previous tool results.
14. If a tool result is required as an input for another tool, you MUST wait for the first tool's response before calling the next tool. Do NOT call dependent tools together in the same turn.`
      });
    }

    debugInfo.initialPrompt = JSON.parse(JSON.stringify(messages));
    
    let responseMessage: any;
    let response: any;
    const lastMsg = messages[messages.length - 1];
    
    // If the frontend is resuming a confirmed tool call, the last message will be the assistant's tool_call
    if (lastMsg?.role === "assistant" && lastMsg.tool_calls && lastMsg.tool_calls.length > 0) {
      responseMessage = lastMsg;
      messages.pop(); // Remove it so the loop can re-append it cleanly
    } else {
      // Normal flow: get next LLM response
      response = await fetchGroqWithRetry(messages, tools);
      responseMessage = response.choices[0]?.message;
      debugInfo.firstLlmResponse = responseMessage;
    }

    let iterations = 0;
    const MAX_ITERATIONS = 10;
    const WRITE_TOOLS = ["createProject", "archiveProject", "createTask", "updateTask", "updatePreferences", "updateDayLog"];

    // Handle tool calls if any (loop to support multiple consecutive tool calls)
    while (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0 && iterations < MAX_ITERATIONS) {
      // Enforce sequential execution: force the model to wait for outputs by restricting to 1 tool per turn
      if (responseMessage.tool_calls.length > 1) {
        responseMessage.tool_calls = [responseMessage.tool_calls[0]];
      }

      // 1. Check if we need user confirmation for ANY of these tools
      const needsConfirmation = responseMessage.tool_calls.some((tc: any) => 
        WRITE_TOOLS.includes(tc.function.name) && 
        !(confirmedToolCallIds || []).includes(tc.id)
      );

      if (needsConfirmation) {
        debugInfo.requiresConfirmation = true;
        return NextResponse.json({
            requiresConfirmation: true,
            message: responseMessage,
            messagesTrace: messages, // Export intermediate messages to sync frontend state
            debug: debugInfo
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
        
        const handler = toolHandlers[functionName];
        let toolResult = "";
        if (handler) {
            const result = await handler(functionArgs);
            toolResult = JSON.stringify(result);
        } else {
            toolResult = JSON.stringify({ error: "Tool not found" });
        }

        debugInfo.toolResults.push({ name: functionName, result: toolResult });

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
      response = await fetchGroqWithRetry(messages, tools);
      responseMessage = response.choices[0]?.message;
      iterations++;
    }

    debugInfo.finalLlmResponse = responseMessage;
    debugInfo.fullTrace = [...messages, responseMessage].filter(Boolean);

    return NextResponse.json({ message: responseMessage, messagesTrace: messages, debug: debugInfo });
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

    return NextResponse.json({ 
      error: friendlyMessage, 
      debug: debugInfo 
    }, { status: 500 });
  }
}
