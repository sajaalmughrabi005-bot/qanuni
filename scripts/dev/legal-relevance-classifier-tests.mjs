// Tests for the Step: lightweight AI legal-relevance classifier
// (src/lib/ai/relevance.ts, checkLegalRelevance — imported into and used by
// src/lib/ai/actions.ts). Calls the real production function directly;
// global fetch is mocked so no live OpenAI call is ever made
// (process.env.OPENAI_API_KEY is set to a dummy value purely so
// completeJSON()'s hasOpenAI() check lets the call through to fetch(), which
// this script fully controls). relevance.ts is imported directly (not
// actions.ts) because actions.ts transitively imports next/headers via
// lib/auth/access, which only resolves inside a real Next.js server context.
//
// Run: node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/legal-relevance-classifier-tests.mjs
process.env.OPENAI_API_KEY = "test-dummy-key-not-used";

const originalFetch = globalThis.fetch;
function mockFetchOnce(impl) {
  globalThis.fetch = async (...args) => impl(...args);
}
function restoreFetch() {
  globalThis.fetch = originalFetch;
}
function openAIResponse(contentObj) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(contentObj) } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const { checkLegalRelevance } = await import("../../src/lib/ai/relevance.ts");

let passed = 0;
const failures = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log("  ok   ", name);
  } catch (e) {
    failures.push(name);
    console.log("  FAIL ", name, "\n        ->", e.message);
  } finally {
    restoreFetch();
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assertion failed");
};

console.log("Legal-relevance classifier — src/lib/ai/actions.ts checkLegalRelevance()");

await test("classifier returns true when the model says isLegalRelevant: true", async () => {
  mockFetchOnce(async () => openAIResponse({ isLegalRelevant: true }));
  const result = await checkLegalRelevance("My landlord wants to evict me without notice.");
  assert(result === true, "expected true");
});

await test("classifier returns false when the model says isLegalRelevant: false", async () => {
  mockFetchOnce(async () => openAIResponse({ isLegalRelevant: false }));
  const result = await checkLegalRelevance("Here is my favorite recipe for chicken soup.");
  assert(result === false, "expected false");
});

await test("malformed response (missing field) fails open (true)", async () => {
  mockFetchOnce(async () => openAIResponse({ somethingElse: "oops" }));
  const result = await checkLegalRelevance("some content");
  assert(result === true, "expected fail-open true for malformed response");
});

await test("malformed response (wrong type) fails open (true)", async () => {
  mockFetchOnce(async () => openAIResponse({ isLegalRelevant: "yes" }));
  const result = await checkLegalRelevance("some content");
  assert(result === true, "expected fail-open true for non-boolean field");
});

await test("non-JSON content from the model fails open (true)", async () => {
  mockFetchOnce(
    async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "not valid json" } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
  );
  const result = await checkLegalRelevance("some content");
  assert(result === true, "expected fail-open true when the model's content isn't valid JSON");
});

await test("network failure (fetch throws) fails open (true)", async () => {
  mockFetchOnce(async () => {
    throw new Error("simulated network failure");
  });
  const result = await checkLegalRelevance("some content");
  assert(result === true, "expected fail-open true on a thrown network error");
});

await test("non-2xx response fails open (true)", async () => {
  mockFetchOnce(async () => new Response("rate limited", { status: 429 }));
  const result = await checkLegalRelevance("some content");
  assert(result === true, "expected fail-open true on a non-2xx response (after provider.ts's own retry)");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("Failures:\n - " + failures.join("\n - "));
  process.exit(1);
}
process.exit(0);
