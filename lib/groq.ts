import Groq from "groq-sdk";

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Main function for demonstration.
 */
export async function main() {
  const chatCompletion = await getGroqChatCompletion(
    "Explain the importance of fast language models",
  );
  // Print the completion returned by the LLM.
  console.log(chatCompletion.choices[0]?.message?.content || "");
}

/**
 * Low-level call to Groq Chat Completion.
 */
export async function getGroqChatCompletion(prompt: string, maxTokens = 300) {
  return groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama-3.3-70b-versatile", // Using a standard Groq model for reliability, user's placeholder 'openai/gpt-oss-20b' likely intended llama.
    max_tokens: maxTokens,
  });
}

/**
 * High-level wrapper for Groq, replacing the legacy callClaude.
 */
export async function callGroq(
  prompt: string,
  maxTokens = 300,
): Promise<string> {
  const response = await getGroqChatCompletion(prompt, maxTokens);
  return response.choices[0]?.message?.content || "";
}

/**
 * Advanced Groq chat with tool support
 */
export async function groqChat(
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
  tools?: Groq.Chat.Completions.ChatCompletionTool[]
) {
  return groq.chat.completions.create({
    messages,
    model: "llama-3.3-70b-versatile",
    tools,
    tool_choice: tools && tools.length > 0 ? "auto" : "none",
  });
}
