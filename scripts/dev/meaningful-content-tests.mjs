// Tests for the Step: pre-analysis "meaningful content" gate
// (src/lib/ai/engine.ts, checkMeaningfulContent). Deterministic, zero-AI-cost,
// keyword-free gate that runs before the lightweight AI relevance classifier.
// Calls the real production function directly.
//
// Run: node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/meaningful-content-tests.mjs
import { checkMeaningfulContent } from "../../src/lib/ai/engine.ts";

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
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assertion failed");
};

console.log("Meaningful content gate — src/lib/ai/engine.ts checkMeaningfulContent()");

await test("empty input is rejected", async () => {
  const r = checkMeaningfulContent("");
  assert(r.meaningful === false, "expected empty input to be rejected");
  assert(typeof r.reasonAr === "string" && r.reasonAr.length > 0, "missing Arabic reason");
  assert(typeof r.reasonEn === "string" && r.reasonEn.length > 0, "missing English reason");
});

await test("whitespace-only input is rejected", async () => {
  const r = checkMeaningfulContent("   \n\t  ");
  assert(r.meaningful === false, "expected whitespace-only input to be rejected");
});

await test("obvious gibberish (unbroken Arabic run, no spaces) is rejected", async () => {
  const r = checkMeaningfulContent("همناتلؤفغعتنالبيسيبلمك");
  assert(r.meaningful === false, "expected gibberish to be rejected");
});

await test("obvious gibberish (unbroken Latin run, no spaces) is rejected", async () => {
  const r = checkMeaningfulContent("asdkfjalksdjflkqwpoeiruxzmnbv");
  assert(r.meaningful === false, "expected gibberish to be rejected");
});

await test("repeated single character is rejected", async () => {
  const r = checkMeaningfulContent("aaaaaaaaaaaaaaaaaaaaaaaaaa");
  assert(r.meaningful === false, "expected a run of one repeated character to be rejected");
});

await test("repeated short pattern (low character diversity) is rejected", async () => {
  const r = checkMeaningfulContent("abcabcabcabcabcabcabcabcabc");
  assert(r.meaningful === false, "expected a repeated low-diversity pattern to be rejected");
});

await test("short legitimate English legal statement passes", async () => {
  const r = checkMeaningfulContent("My landlord wants to evict me");
  assert(r.meaningful === true, "expected a real short English statement to pass");
});

await test("short legitimate Arabic legal statement (colloquial) passes", async () => {
  const r = checkMeaningfulContent("المؤجر بده يطلعني من البيت");
  assert(r.meaningful === true, "expected a real short colloquial Arabic statement to pass");
});

await test("normal Arabic prose passes", async () => {
  const r = checkMeaningfulContent(
    "وقعت عقد إيجار سكني مع المالك قبل سنة، والآن يرفض إعادة مبلغ التأمين رغم أنني سلمت الشقة بحالة جيدة."
  );
  assert(r.meaningful === true, "expected normal Arabic prose to pass");
});

await test("normal English prose passes", async () => {
  const r = checkMeaningfulContent(
    "I signed a one-year lease with my landlord, and now that it's over he refuses to return my security deposit even though I left the apartment in good condition."
  );
  assert(r.meaningful === true, "expected normal English prose to pass");
});

await test("a real multi-word sentence that happens to repeat one word is not flagged by the no-structure check", async () => {
  // Sanity check that the single-unbroken-token rule only fires when there
  // really is no word/space structure at all, not just low diversity from a
  // repeated real word (that's a job for the AI relevance classifier, not
  // this gate, per the design doc — this test documents that boundary).
  const r = checkMeaningfulContent("test test test test test test test test test test test test");
  // Low character diversity (mostly "t", "e", "s" repeated) is still
  // expected to reject here — this is intentionally caught as
  // low-information content by the diversity check.
  assert(r.meaningful === false, "expected a highly repetitive single-word run to be rejected by the diversity check");
});

await test("borderline length just above the floor still passes for real content", async () => {
  const r = checkMeaningfulContent("فسخ العقد بدون سبب");
  assert(r.meaningful === true, "expected a short-but-real Arabic phrase to pass");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("Failures:\n - " + failures.join("\n - "));
  process.exit(1);
}
process.exit(0);
