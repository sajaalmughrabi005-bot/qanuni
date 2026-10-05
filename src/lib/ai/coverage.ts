import type { AnalysisCoverage } from "@/types";

/** Per-section processing ceiling. The complete input is split into bounded
 * sections rather than truncated. Overall input ceiling is 240,000 characters. */
export const MAX_ANALYSIS_CHARS = 24_000;

/** Exact processed/input character counts, independent of model correctness. */
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
