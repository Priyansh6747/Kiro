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
          controller.enqueue(sseEvent("chunk", '<ui:planning-form>{"phase":1}</ui:planning-form>'));
          // Wait, the prompt says: Stream one chunk event containing { sessionId: artifact.id, tag: '<ui:planning-form>{"phase":1}</ui:planning-form>' }
          // Ah, I need to send a JSON object with sessionId and tag! Let me fix this.
          // I will send: { sessionId: artifact.id, tag: '<ui:planning-form>{"phase":1}</ui:planning-form>' }
          controller.enqueue(sseEvent("chunk", { sessionId: artifact.id, tag: '<ui:planning-form>{"phase":1}</ui:planning-form>' }));
          controller.enqueue(sseEvent("done", {}));
          controller.close();
          console.log("[Planning API] Phase 1 stream closed.");
        } 
        else if (phase === 2) {
          console.log("[Planning API] Processing Phase 2. phase1 data:", phase1);
          const prompt = `Based on this project brief: ${JSON.stringify(phase1 || {})}, generate 3-6 clarifying questions to deeply understand the scope. ALL questions MUST be of type "choice". For each question, provide 3-5 specific options (e.g. "A. Option 1", "B. Option 2"), and ALWAYS include a final fallback option exactly named "Something else ... (Type)". Return them as a JSON array exactly matching this schema: [{ "id": "q1", "question": "string", "type": "choice", "choices": ["string"] }]`;
          
          let questions = [];
          let attempts = 0;
          while (attempts < 3) {
            attempts++;
            const completion = await groqChat([{ role: "user", content: prompt }], [], userId, "llama-3.3-70b-versatile");
            const rawContent = completion.choices[0]?.message?.content || "[]";
            
            try {
               const match = rawContent.match(/\[[\s\S]*\]/);
               questions = JSON.parse(match ? match[0] : rawContent);
               if (questions && Array.isArray(questions)) {
                 console.log("[Planning API] Phase 2 LLM output successfully parsed on attempt", attempts);
                 break; // Success!
               } else {
                 console.warn(`[Planning API] Phase 2 parsed successfully but not an array on attempt ${attempts}`);
               }
            } catch(e) {
               console.error(`[Planning API] Failed to parse AI questions on attempt ${attempts}:`, e);
            }
          }
          
          if (sessionId) {
            await updateArtifact(sessionId, { 
              type: "plan_questions", 
              content: JSON.stringify({ questions }) 
            });
          }
          
          controller.enqueue(sseEvent("chunk", `<ui:ai-questions>${JSON.stringify({ artifactId: sessionId, questions })}</ui:ai-questions>`));
          controller.enqueue(sseEvent("done", {}));
          controller.close();
        }
        else if (phase === 3) {
           const prompt = `Given these project details: ${JSON.stringify(phase1)} and these clarifying answers: ${JSON.stringify(phase2Answers)}, write a detailed markdown project brief with the following sections: Overview, Goals, Scope, Technical Constraints, Key Decisions, Risks, Success Criteria. Output ONLY the markdown.`;
           
           const completion = await groqChat([{ role: "user", content: prompt }], [], userId, "llama-3.3-70b-versatile");
           const markdown = completion.choices[0]?.message?.content || "";
           
           // Do not stream raw markdown chunks to avoid duplicate UI rendering.
           // The ArtifactPreview component handles displaying the markdown.
           
           if (sessionId) {
             await updateArtifact(sessionId, {
               type: "plan_markdown",
               content: JSON.stringify({ markdown })
             });
           }
           
           controller.enqueue(sseEvent("chunk", `<ui:artifact-preview>${JSON.stringify({ artifactId: sessionId, markdown })}</ui:artifact-preview>`));
           controller.enqueue(sseEvent("done", {}));
           controller.close();
        }
        else if (phase === 4) {
           const outlinePrompt = `You are a senior engineering project manager. Given this project brief, break it down into exactly 4 chronological stages. Return a JSON array of 4 objects. Each object has: \`stage\` (number: 1, 2, 3, 4), \`stageName\` (string), and \`tasks\` (array of objects with \`id\` (a unique string like "task_1") and \`title\` (string)). Do not include any other fields yet. Return ONLY a valid JSON array starting with '['.\nBrief:\n${markdownContent}`;
           
           let stagesOutline: any[] = [];
           let outlineAttempts = 0;
           while (outlineAttempts < 3) {
             outlineAttempts++;
             const completion = await groqChat([{ role: "user", content: outlinePrompt }], [], userId, "llama-3.3-70b-versatile");
             const raw = completion.choices[0]?.message?.content || "[]";
             try {
               const match = raw.match(/\[[\s\S]*\]/);
               stagesOutline = JSON.parse(match ? match[0] : raw);
               if (stagesOutline && Array.isArray(stagesOutline) && stagesOutline.length > 0) break;
             } catch(e) {
               console.error(`[Planning API] Outline parse failed on attempt ${outlineAttempts}:`, e);
             }
           }

           if (!stagesOutline || stagesOutline.length === 0) {
             throw new Error("Failed to generate task outline.");
           }

           // Run detail generation in parallel for all 4 stages to avoid massive JSON payloads
           const detailPromises = stagesOutline.map(async (stageObj) => {
             const detailPrompt = `You are detailing Stage ${stageObj.stage} (${stageObj.stageName}). Here is the full project outline with all task IDs: ${JSON.stringify(stagesOutline)}. For ONLY the tasks in Stage ${stageObj.stage}, generate their full details. Return a JSON array of task objects. Each task MUST have: \`id\` (must exactly match the outline), \`title\`, \`estimate_min\` (number), \`deadline\` (ISO string or null), \`depends_on\` (array of task IDs from previous stages or this stage that must be completed first), and \`subtasks\` (array of {title, estimate_min}). Return ONLY a valid JSON array starting with '['.`;
             
             let detailTasks = [];
             let detailAttempts = 0;
             while (detailAttempts < 3) {
               detailAttempts++;
               const completion = await groqChat([{ role: "user", content: detailPrompt }], [], userId, "llama-3.3-70b-versatile");
               const raw = completion.choices[0]?.message?.content || "[]";
               try {
                 const match = raw.match(/\[[\s\S]*\]/);
                 detailTasks = JSON.parse(match ? match[0] : raw);
                 if (detailTasks && Array.isArray(detailTasks)) break;
               } catch(e) {
                 console.error(`[Planning API] Detail parse failed for stage ${stageObj.stage} on attempt ${detailAttempts}:`, e);
               }
             }
             
             // Ensure fallback to outline if detailed generation completely fails
             return {
               stage: stageObj.stage,
               stageName: stageObj.stageName,
               tasks: detailTasks.length > 0 ? detailTasks : stageObj.tasks.map((t: any) => ({ ...t, estimate_min: 60, depends_on: [] }))
             };
           });

           const stages = await Promise.all(detailPromises);
           
           if (sessionId) {
             await updateArtifact(sessionId, {
               type: "plan_tasks",
               content: JSON.stringify({ stages })
             });
           }
           
           controller.enqueue(sseEvent("chunk", `<ui:task-manager>${JSON.stringify({ artifactId: sessionId, stages })}</ui:task-manager>`));
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
