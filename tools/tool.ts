import { ChatCompletionTool } from "groq-sdk/resources/chat/completions";

// ─────────────────────────────────────────────────────────────
// Mock "DB" / in-memory state
// ─────────────────────────────────────────────────────────────

type TestDefinition = {
  id: string;
  name: string;
  description: string;
};

type TestResult = {
  id: string; // resultId
  p99: number; // ms
  blackout: boolean; // whether a blackout/outage occurred during the run
};

const AVAILABLE_TESTS: TestDefinition[] = [
  { id: "testA", name: "Checkout Latency", description: "Load test on the checkout API path" },
  { id: "testB", name: "Auth Burst", description: "Spike test on the login/auth endpoint" },
  { id: "testC", name: "Search Throughput", description: "Sustained throughput test on the search service" },
  { id: "testD", name: "Failover Drill", description: "Kills a node mid-traffic to test failover" },
];

// Per-test base profiles used only to seed *plausible* random generation.
// These are not fixed outcomes — runTest perturbs them every call.
const TEST_PROFILES: Record<string, { basePerf: number; jitter: number; blackoutChance: number }> = {
  testA: { basePerf: 220, jitter: 120, blackoutChance: 0.05 },
  testB: { basePerf: 350, jitter: 200, blackoutChance: 0.1 },
  testC: { basePerf: 700, jitter: 400, blackoutChance: 0.25 },
  testD: { basePerf: 900, jitter: 700, blackoutChance: 0.5 },
};
import { randomUUID } from "crypto";

// Results are generated at runTest-time and stored here, keyed by a
// freshly minted resultId each call. Nothing is pre-seeded, and no
// test id maps to a fixed resultId or fixed metrics.
const RESULTS_DB: Record<string, TestResult> = {};
const ISSUED_IDS = new Set<string>();

function generateResult(testId: string): TestResult {
  const profile = TEST_PROFILES[testId] ?? { basePerf: 300, jitter: 200, blackoutChance: 0.1 };
  const id = randomUUID(); // Opaque UUID v4, completely unguessable

  // p99 = base ± jitter, never negative
  const p99 = Math.max(10, Math.round(profile.basePerf + (Math.random() * 2 - 1) * profile.jitter));

  // weighted random blackout
  const blackout = Math.random() < profile.blackoutChance;

  return { id, p99, blackout };
}

// ─────────────────────────────────────────────────────────────
// Tool Implementations (mocked)
// ─────────────────────────────────────────────────────────────

export async function getArchitecture() {
  console.log("Executing getArchitecture");
  return {
    architectureFlow: `
    SYSTEM ARCHITECTURE & EXPECTED WORKFLOW:
    1. You must use getAvailableTests to find the correct test ID for the user's request.
    2. You must call runTest(id) to execute the test. This returns a fresh, opaque resultId.
    3. You must wait for the runTest result to obtain the resultId.
    4. You must then use getResult(resultId) or analyse(resultId) using ONLY the newly minted resultId.
    5. resultIds are single-use and expire immediately. You cannot reuse IDs from previous turns or guess them.
    `
  };
}

export async function getAvailableTests() {
  console.log("Executing getAvailableTests");
  return { tests: AVAILABLE_TESTS };
}

export async function runTest({ id }: { id: string }) {
  console.log(`Executing runTest for id: ${id}`);
  const exists = AVAILABLE_TESTS.find((t) => t.id === id);
  if (!exists) {
    return { error: `Unknown test id: ${id}` };
  }

  // Generate a fresh result every call — no fixed id, no fixed metrics.
  const result = generateResult(id);
  RESULTS_DB[result.id] = result;
  ISSUED_IDS.add(result.id); // Track freshly issued ID

  return { resultId: result.id, status: "queued" };
}

export async function getResult({ id }: { id: string }) {
  console.log(`Executing getResult for id: ${id}`);
  if (!ISSUED_IDS.has(id)) {
    return { error: `Invalid or expired resultId: ${id}. You must call runTest to get a fresh resultId first.` };
  }
  
  const result = RESULTS_DB[id];
  if (!result) {
    return { error: `No result found for id: ${id}` };
  }
  return result;
}

// analyse now only accepts a resultId. The model cannot fabricate
// p99/blackout values — the server looks them up from RESULTS_DB.
export async function analyse({ resultId }: { resultId: string }) {
  console.log(`Executing analyse for resultId: ${resultId}`);
  
  // Single-use semantics: verify and consume the ID to prevent reuse or replay
  if (!ISSUED_IDS.has(resultId)) {
    return { error: `Invalid, expired, or already-consumed resultId: ${resultId}. You must call runTest first.` };
  }
  ISSUED_IDS.delete(resultId); // Consume it!
  
  const result = RESULTS_DB[resultId];
  if (!result) {
    return { error: `No result found for resultId: ${resultId}` };
  }

  const P99_THRESHOLD_MS = 500;
  const reasons: string[] = [];

  if (result.blackout) {
    reasons.push("Blackout detected during test run");
  }
  if (result.p99 > P99_THRESHOLD_MS) {
    reasons.push(`p99 (${result.p99}ms) exceeded threshold (${P99_THRESHOLD_MS}ms)`);
  }

  const verdict = reasons.length === 0 ? "pass" : "fail";
  return { id: result.id, verdict, reasons };
}

// ─────────────────────────────────────────────────────────────
// Tool Schemas (MCP/OpenAI function-calling format)
// ─────────────────────────────────────────────────────────────

export const getAvailableTestsToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "getAvailableTests",
    description: "List all tests that are available to run in the testing environment",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

export const runTestToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "runTest",
    description:
        "Run a test by its id. Generates a fresh result on the server for this run and stores it in the database. Returns a resultId — the actual metrics are not returned here and must be fetched via getResult or analyse.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The id of the test to run",
        },
      },
      required: ["id"],
    },
  },
};

export const getResultToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "getResult",
    description: "Fetch a previously run test's result by its resultId. Results are generated server-side per run and are not predictable in advance.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The resultId returned by runTest",
        },
      },
      required: ["id"],
    },
  },
};

export const analyseToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "analyse",
    description:
        "Analyse a stored test result by resultId and determine whether it passes or fails based on latency and blackout criteria. Fetches the result from the server-side database — does not accept raw metrics, since those cannot be supplied externally.",
    parameters: {
      type: "object",
      properties: {
        resultId: {
          type: "string",
          description: "The resultId returned by runTest, identifying the stored result to analyse",
        },
      },
      required: ["resultId"],
    },
  },
};

export const getArchitectureToolSchema: ChatCompletionTool = {
  type: "function",
  function: {
    name: "getArchitecture",
    description: "Fetch the system architecture and expected workflow rules. You MUST call this first to understand how to interact with the system.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

// ─────────────────────────────────────────────────────────────
// Exports: tool list + handler map
// ─────────────────────────────────────────────────────────────

export const tools: ChatCompletionTool[] = [
  getArchitectureToolSchema,
  getAvailableTestsToolSchema,
  runTestToolSchema,
  getResultToolSchema,
  analyseToolSchema,
];

export const toolHandlers: Record<string, Function> = {
  getArchitecture,
  getAvailableTests,
  runTest,
  getResult,
  analyse,
};