// Tests for the Step 2 fix: replacing the silent 6,000-character AI-input
// cap with an honest, coverage-aware one (src/lib/ai/actions.ts).
//
// computeCoverage() and coverageInstruction() live in their own
// dependency-free module (src/lib/ai/coverage.ts) precisely so they can be
// imported and tested directly here, without a live authenticated request
// context (analyzeDocumentAction's own module imports next/headers
// transitively, which only works inside a real Next.js request). This still
// exercises the exact code analyzeDocumentAction calls — nothing here is a
// reimplementation of the coverage math or the prompt wording.
//
// Run: node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/analysis-coverage-tests.mjs
import { MAX_ANALYSIS_CHARS, computeCoverage, coverageInstruction } from "../../src/lib/ai/coverage.ts";

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

const repeat = (s, n) => s.repeat(Math.ceil(n / s.length)).slice(0, n);
const arabicSentence = "هذا نص عقد إيجار سكني طويل يحتوي على عدة بنود وشروط قانونية متكررة لأغراض الاختبار. ";
const mixedSentence = "This is clause number 1 - البند رقم واحد - amount: 300 JOD / دينار. ";

console.log("Analysis coverage math — src/lib/ai/actions.ts");

test("MAX_ANALYSIS_CHARS is a real, bounded, non-zero ceiling", async () => {
  assert(typeof MAX_ANALYSIS_CHARS === "number" && MAX_ANALYSIS_CHARS > 0, "not a positive number");
  assert(MAX_ANALYSIS_CHARS < 1_000_000, "should be a deliberate cap, not effectively unlimited");
});

await test("contract shorter than the limit -> 100% coverage, not truncated", async () => {
  const total = MAX_ANALYSIS_CHARS - 500;
  const analyzed = Math.min(total, MAX_ANALYSIS_CHARS);
  const c = computeCoverage(total, analyzed);
  assert(c.coveragePercent === 100, "expected 100%, got " + c.coveragePercent);
  assert(c.isTruncated === false, "should not be marked truncated");
  assert(c.analyzedCharacters === total, "should have analyzed the whole short document");
});

await test("contract exactly at the limit -> 100% coverage, not truncated", async () => {
  const total = MAX_ANALYSIS_CHARS;
  const analyzed = Math.min(total, MAX_ANALYSIS_CHARS);
  const c = computeCoverage(total, analyzed);
  assert(c.coveragePercent === 100, "expected 100%, got " + c.coveragePercent);
  assert(c.isTruncated === false, "exactly-at-limit must not be flagged as truncated");
});

await test("contract one character above the limit -> truncated (isTruncated is the authoritative signal, not the rounded percent)", async () => {
  const total = MAX_ANALYSIS_CHARS + 1;
  const analyzed = Math.min(total, MAX_ANALYSIS_CHARS);
  const c = computeCoverage(total, analyzed);
  assert(c.isTruncated === true, "one character over the cap must still count as truncated");
  assert(c.analyzedCharacters === MAX_ANALYSIS_CHARS, "should have analyzed exactly the cap");
  // At this scale 24000/24001 rounds to "100%" for display — that's expected
  // rounding behavior, not a bug: isTruncated (checked above) is what the UI
  // notice is actually gated on, precisely so a rounding artifact here can
  // never hide a real (if tiny) truncation from the user.
  assert(c.coveragePercent === 100, "rounding at this scale should read as 100%, got " + c.coveragePercent);
});

await test("contract meaningfully above the limit -> truncated with a percent that visibly reads under 100%", async () => {
  const total = MAX_ANALYSIS_CHARS + 5000;
  const analyzed = Math.min(total, MAX_ANALYSIS_CHARS);
  const c = computeCoverage(total, analyzed);
  assert(c.isTruncated === true, "should be truncated");
  assert(c.coveragePercent < 100 && c.coveragePercent >= 80, "expected a visibly-partial percent, got " + c.coveragePercent);
});

await test("very long contract -> correct, sane coverage percentage", async () => {
  const total = MAX_ANALYSIS_CHARS * 10;
  const analyzed = Math.min(total, MAX_ANALYSIS_CHARS);
  const c = computeCoverage(total, analyzed);
  assert(c.isTruncated === true);
  assert(c.coveragePercent === 10, "expected 10%, got " + c.coveragePercent);
  assert(c.totalCharacters === total, "total should reflect the real full length, not the cap");
});

await test("long Arabic contract -> correct coverage (character-count math, language-agnostic)", async () => {
  const text = repeat(arabicSentence, MAX_ANALYSIS_CHARS * 2);
  const total = text.length;
  const analyzed = Math.min(total, MAX_ANALYSIS_CHARS);
  const c = computeCoverage(total, analyzed);
  assert(c.isTruncated === true, "long Arabic text should be flagged truncated");
  assert(c.coveragePercent > 0 && c.coveragePercent < 100, "expected a real partial percentage, got " + c.coveragePercent);
});

await test("mixed Arabic/English contract -> correct coverage", async () => {
  const text = repeat(mixedSentence, MAX_ANALYSIS_CHARS * 2);
  const total = text.length;
  const analyzed = Math.min(total, MAX_ANALYSIS_CHARS);
  const c = computeCoverage(total, analyzed);
  assert(c.isTruncated === true);
  assert(c.coveragePercent > 0 && c.coveragePercent < 100, "expected a real partial percentage, got " + c.coveragePercent);
});

await test("empty text does not divide by zero", async () => {
  const c = computeCoverage(0, 0);
  assert(Number.isFinite(c.coveragePercent), "coveragePercent should be a finite number, got " + c.coveragePercent);
  assert(c.coveragePercent === 100, "empty document: nothing was withheld, should read as 100%, got " + c.coveragePercent);
  assert(c.isTruncated === false);
});

await test("coverage never reports more than 100% or a negative value", async () => {
  // analyzedCharacters larger than totalCharacters shouldn't happen in practice
  // (it's always Math.min(total, MAX_ANALYSIS_CHARS)), but the helper itself
  // must stay safe if ever called with odd inputs.
  const c1 = computeCoverage(100, 500);
  assert(c1.coveragePercent <= 100 && c1.coveragePercent >= 0, "out of range: " + c1.coveragePercent);
  const c2 = computeCoverage(100, -5);
  assert(c2.coveragePercent <= 100 && c2.coveragePercent >= 0, "out of range: " + c2.coveragePercent);
});

await test("AI prompt explicitly indicates partial coverage when truncated", async () => {
  const total = MAX_ANALYSIS_CHARS + 2000;
  const c = computeCoverage(total, MAX_ANALYSIS_CHARS);
  const instruction = coverageInstruction(c);
  assert(/only part/i.test(instruction), "should say the document is only partially provided");
  assert(instruction.includes(String(total)), "should mention the real total character count");
  assert(/absent from the entire contract/i.test(instruction), "should warn the model not to claim absence from the whole document");
});

await test("no truncation warning when the full text is analyzed", async () => {
  const total = 5000;
  const c = computeCoverage(total, total);
  const instruction = coverageInstruction(c);
  assert(/full document/i.test(instruction), "should say the full document is provided");
  assert(!/only part/i.test(instruction), "must not say 'only part' when nothing was cut off");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("Failures:\n - " + failures.join("\n - "));
  process.exit(1);
}
process.exit(0);
