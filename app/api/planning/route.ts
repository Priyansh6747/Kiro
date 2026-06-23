import { auth } from "@clerk/nextjs/server";
import { groqChat } from "@/lib/groq";
import { type NextRequest } from "next/server";
import { createArtifact, updateArtifact } from "@/lib/storage";

const encoder = new TextEncoder();

function sseEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { phase, sessionId, phase1, phase2Answers, markdownContent } = body;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log(`[Planning API] Received phase ${phase} request. sessionId: ${sessionId}`);
        if (phase === 1) {
          console.log("[Planning API] Processing Phase 1: creating artifact...");
          const artifact = await createArtifact({
            userId,
            type: "plan_session",
            content: JSON.stringify({ phase: 1, ...phase1 }),
          });
          console.log("[Planning API] Artifact created:", artifact.id);
          controller.enqueue(sseEvent("chunk", `|-PLANNING-FORM-|{"phase":1}`));
          // Wait, the prompt says: Stream one chunk event containing { sessionId: artifact.id, tag: '|-PLANNING-FORM-|{"phase":1}' }
          // Ah, I need to send a JSON object with sessionId and tag! Let me fix this.
          // I will send: { sessionId: artifact.id, tag: '|-PLANNING-FORM-|{"phase":1}' }
          controller.enqueue(sseEvent("chunk", { sessionId: artifact.id, tag: `|-PLANNING-FORM-|{"phase":1}` }));
          controller.enqueue(sseEvent("done", {}));
          controller.close();
          console.log("[Planning API] Phase 1 stream closed.");
        } 
        else if (phase === 2) {
          console.log("[Planning API] Processing Phase 2. phase1 data:", phase1);
          const prompt = `Based on this project brief: ${JSON.stringify(phase1 || {})}, generate 3-6 clarifying questions to deeply understand the scope. Return them as a JSON array exactly matching this schema: [{ "id": "q1", "question": "string", "type": "text" | "choice", "choices": ["string"] }]`;
          
          let questions = [];
          let attempts = 0;
          while (attempts < 3) {
            const completion = await groqChat([{ role: "user", content: prompt }], [], userId);
            const rawContent = completion.choices[0]?.message?.content || "[]";
            
            try {
               const match = rawContent.match(/\[[\s\S]*\]/);
               questions = JSON.parse(match ? match[0] : rawContent);
               if (questions && Array.isArray(questions)) {
                 console.log("[Planning API] Phase 2 LLM output successfully parsed on attempt", attempts + 1);
                 break; // Success!
               }
            } catch(e) {
               console.error(`[Planning API] Failed to parse AI questions on attempt ${attempts + 1}:`, e);
               attempts++;
            }
          }
          
          if (sessionId) {
            await updateArtifact(sessionId, { 
              type: "plan_questions", 
              content: JSON.stringify({ questions }) 
            });
          }
          
          controller.enqueue(sseEvent("chunk", `|-AI-QUESTIONS-|${JSON.stringify({ artifactId: sessionId, questions })}`));
          controller.enqueue(sseEvent("done", {}));
          controller.close();
        }
        else if (phase === 3) {
           const prompt = `Given these project details: ${JSON.stringify(phase1)} and these clarifying answers: ${JSON.stringify(phase2Answers)}, write a detailed markdown project brief with the following sections: Overview, Goals, Scope, Technical Constraints, Key Decisions, Risks, Success Criteria. Output ONLY the markdown.`;
           
           const completion = await groqChat([{ role: "user", content: prompt }], [], userId);
           const markdown = completion.choices[0]?.message?.content || "";
           
           // Do not stream raw markdown chunks to avoid duplicate UI rendering.
           // The ArtifactPreview component handles displaying the markdown.
           
           if (sessionId) {
             await updateArtifact(sessionId, {
               type: "plan_markdown",
               content: JSON.stringify({ markdown })
             });
           }
           
           controller.enqueue(sseEvent("chunk", `|-ARTIFACT-PREVIEW-|${JSON.stringify({ artifactId: sessionId, markdown })}`));
           controller.enqueue(sseEvent("done", {}));
           controller.close();
        }
        else if (phase === 4) {
           const prompt = `You are a senior engineering project manager. Given this project brief, produce a complete JSON breakdown of stages and tasks. Each stage has: \`stage\` (number), \`stageName\` (string), \`tasks\` (array). Each task has: \`id\` (unique string), \`title\`, \`estimate_min\`, \`deadline\` (ISO or null), \`depends_on\` (array of task ids), optional \`subtasks\`. 
CRITICAL: Return ONLY a valid JSON array, starting with '[' and ending with ']'. Ensure all quotes inside strings are properly escaped. Do not include markdown code blocks or any other text.\nBrief:\n${markdownContent}`;
           
           let stages = [];
           let attempts = 0;
           while (attempts < 3) {
             const completion = await groqChat([{ role: "user", content: prompt }], [], userId);
             const rawContent = completion.choices[0]?.message?.content || "[]";
             
             try {
               const match = rawContent.match(/\[[\s\S]*\]/);
               stages = JSON.parse(match ? match[0] : rawContent);
               if (stages && Array.isArray(stages)) {
                 break; // Success!
               }
             } catch(e) {
               console.error(`[Planning API] Failed to parse JSON breakdown on attempt ${attempts + 1}:`, e);
               attempts++;
             }
           }
           
           if (sessionId) {
             await updateArtifact(sessionId, {
               type: "plan_tasks",
               content: JSON.stringify({ stages })
             });
           }
           
           controller.enqueue(sseEvent("chunk", `|-TASK-MANAGER-|${JSON.stringify({ artifactId: sessionId, stages })}`));
           controller.enqueue(sseEvent("done", {}));
           controller.close();
        } else {
           controller.enqueue(sseEvent("done", {}));
           controller.close();
        }
      } catch (error) {
        console.error("Planning API Error:", error);
        controller.enqueue(sseEvent("chunk", "An error occurred during planning."));
        controller.enqueue(sseEvent("done", {}));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
