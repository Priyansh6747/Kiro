import { NextRequest, NextResponse } from "next/server";
import { groqChat } from "@/lib/groq";
import { tools, toolHandlers } from "@tools/tool";

export async function POST(req: NextRequest) {
  let debugInfo: any = {};
  try {
    const { messages } = await req.json();
    debugInfo.initialPrompt = JSON.parse(JSON.stringify(messages));
    
    // Call Groq with messages and tools
    let response = await groqChat(messages, tools);
    let responseMessage = response.choices[0]?.message;
    debugInfo.firstLlmResponse = responseMessage;

    let iterations = 0;
    const MAX_ITERATIONS = 10;

    // Handle tool calls if any (loop to support multiple consecutive tool calls)
    while (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0 && iterations < MAX_ITERATIONS) {
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
      response = await groqChat(messages, tools);
      responseMessage = response.choices[0]?.message;
      iterations++;
    }

    debugInfo.finalLlmResponse = responseMessage;

    return NextResponse.json({ message: responseMessage, debug: debugInfo });
  } catch (error: any) {
    console.error("Chat API error:", error);
    
    // Attempt to parse Groq's tool_use_failed JSON string inside the message
    let friendlyMessage = "The AI encountered an error.";
    try {
      // Groq sometimes throws an error with a stringified JSON body in error.message
      // Example: 400 {"error": {"message": "Failed to call a function...", "failed_generation": "..."}}
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
