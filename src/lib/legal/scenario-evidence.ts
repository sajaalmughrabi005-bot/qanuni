import { curatedSources, normalizeLegalText } from "./corpus";

/** Bounded lexical retrieval only; never a fake legal answer or semantic/provider fallback.
 * The interpreted result still comes from the existing authorized provider action.
 * Missing matches must be disclosed; these excerpts do not prove applicability. */
export function selectScenarioEvidence(question: string, selectedText: string) {
  const q = normalizeLegalText(question), text = normalizeLegalText(selectedText);
  return curatedSources.map(source => ({ source, score: source.keywords.reduce((score, keyword) => {
    const term = normalizeLegalText(keyword);
    return score + (q.includes(term) ? 10 : text.includes(term) ? 1 : 0);
  }, 0) })).filter(row => row.score > 0).sort((a, b) => b.score - a.score).slice(0, 4).map(row => row.source);
}
