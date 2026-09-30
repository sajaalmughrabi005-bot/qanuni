import type { AnalysisCoverage } from "@/types";

/**
 * Pure document-coverage math + prompt wording for analyzeDocumentAction
 * (src/lib/ai/actions.ts). Kept in their own dependency-free module — no
 * "server-only", no next/headers, nothing that needs a live Next.js request
 * context — specifically so this logic can be unit-tested directly (see
 * scripts/dev/analysis-coverage-tests.mjs) without needing a real session,
 * a real OpenAI key, or a bundler.
 */

/**
 * Ceiling on how much contract text is sent to the AI in one analysis
 * request (replaces an old, unexplained hardcoded 6,000).
 *
 * gpt-4o-mini has a 128,000-token context window shared between input and
 * output. Budgeting conservatively for this bilingual Arabic/English prompt:
 *   - ~1,500 tokens for the fixed system + instruction text (the JSON field
 *     list, the Jordan-law lock, the prompt-injection lock, the coverage
 *     note below — padded above their current combined size)
 *   - up to ~8,000 tokens reserved for the model's own JSON response (a long
 *     contract can produce a sizeable clause list plus a dozen bilingual
 *     array fields)
 *   - a further ~2,500-token safety margin, since a character count is only
 *     an estimate of token count, and Arabic script tokenizes less
 *     efficiently per character than English
 * That leaves on the order of 100,000+ tokens of real headroom for the
 * document text itself. Rather than use all of it, this is set just above
 * the citizen upload page's own existing 20,000-character cap on pasted/
 * extracted text (see analyze/new/page.tsx) — so with today's UI a real
 * uploaded contract is essentially never truncated, while this still stays
 * a genuine, bounded, cost-and-latency-predictable ceiling (not "no limit"),
 * protecting against a pathological input regardless of what any future
 * caller of analyzeDocumentAction sends here.
 */
export const MAX_ANALYSIS_CHARS = 24_000;

/**
 * How much of the source text an analysis actually covers. Shared by both
 * the OpenAI path (which truncates at MAX_ANALYSIS_CHARS) and the local
 * fallback engine (which reads the full text — see the fallback branch of
 * analyzeDocumentAction), so the two can never report inconsistent math.
 * Guards totalCharacters <= 0 so this never divides by zero.
 */
export function computeCoverage(totalCharacters: number, analyzedCharacters: number): AnalysisCoverage {
  const analyzed = Math.max(0, Math.min(analyzedCharacters, totalCharacters));
  const coveragePercent = totalCharacters <= 0 ? 100 : Math.round((analyzed / totalCharacters) * 100);
  return { analyzedCharacters: analyzed, totalCharacters, coveragePercent, isTruncated: analyzed < totalCharacters };
}

/** Tells the model explicitly how much of the document it's seeing, so it never implies completeness it doesn't have. */
export function coverageInstruction(coverage: AnalysisCoverage): string {
  if (!coverage.isTruncated) {
    return "COVERAGE: The full document is provided below in DOCUMENT CONTENT — nothing was cut off.";
  }
  return `COVERAGE: The text below in DOCUMENT CONTENT is only PART of the user's document — approximately ${coverage.analyzedCharacters} of its ${coverage.totalCharacters} total characters (about ${coverage.coveragePercent}%). Do not state or imply that a clause, term, or protection is absent from the entire contract merely because it does not appear in this excerpt; if relevant, say it was not found in the analyzed portion instead.`;
}
