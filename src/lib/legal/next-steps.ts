import type { Analysis, DocumentClause, LegalDocument, Locale, RiskLevel } from "@/types";
import type { CuratedSource } from "./corpus";
import { verifiedHighlights } from "../documents/highlights";

export type StepCategory = "information" | "clarification" | "other_party_question" | "preserve_evidence" | "professional_review" | "unsupported_action";
export type EvidenceState = "source_text_checked" | "missing" | "conflicting" | "unsupported_domain";
export interface NextStep { category: StepCategory; textAr: string; textEn: string }
export interface ActionFinding {
  clause: DocumentClause;
  risk: RiskLevel;
  exactOriginal: boolean;
  evidence: EvidenceState;
  source?: CuratedSource;
  steps: NextStep[];
}
export interface NextStepsResult {
  findings: ActionFinding[];
  attentionCount: number;
  coverage: "complete" | "partial" | "unknown";
  contextMismatch: boolean;
  generalSteps: NextStep[];
}
const step = (category: StepCategory, textAr: string, textEn: string): NextStep => ({ category, textAr, textEn });
const review = step("professional_review", "ناقش هذا البند وظروفك مع محامٍ قبل اتخاذ قرار؛ الملاحظة ليست حكماً قانونياً.", "Discuss this clause and your circumstances with a lawyer before deciding; this finding is not a legal determination.");
const preserve = step("preserve_evidence", "احتفظ بنسخة المستند والمراسلات ذات الصلة في مكان آمن.", "Keep a copy of the document and relevant correspondence somewhere secure.");

/** Source text is checked against the curated allowlist, never against a caller's verified flag alone.
 * A matching citation does not establish interpretation, applicability or current law.
 * Callers must obtain authorized document data before invoking this pure presentation layer. */
export function deriveNextSteps(document: LegalDocument, analysis: Analysis, clauses: DocumentClause[], sources: CuratedSource[]): NextStepsResult {
  const definitions = new Map<string, string>();
  let ambiguousIds = false;
  for (const clause of clauses.filter(c => c.documentId === document.id)) {
    const serialized = JSON.stringify(clause);
    if (definitions.has(clause.id) && definitions.get(clause.id) !== serialized) ambiguousIds = true;
    definitions.set(clause.id, serialized);
  }
  const contextMismatch = analysis.documentId !== document.id || analysis.userId !== document.userId || ambiguousIds;
  const seen = new Set<string>();
  const scoped = contextMismatch ? [] : clauses.filter(c => c.documentId === document.id && !seen.has(c.id) && !!seen.add(c.id));
  const exact = new Set(verifiedHighlights(document.citizenDescription || "", scoped).map(c => c.id));
  const order: Record<RiskLevel, number> = { high: 0, unknown: 1, medium: 2, low: 3 };
  const findings = scoped.map((clause): ActionFinding => {
    const risk: RiskLevel = Object.hasOwn(order, clause.riskLevel) ? clause.riskLevel : "unknown";
    const canonical = sources.find(s => s.id === clause.legalSourceId && s.verified && !s.isDemoPlaceholder && s.verificationState === "source_text_checked" && !!s.excerptAr && !!s.sourceSha256);
    const supplied = (analysis.legalSources || []).filter(s => s.id === clause.legalSourceId);
    const conflicting = !!canonical && supplied.some(s => s.excerptAr !== canonical.excerptAr || s.article !== canonical.article || s.isDemoPlaceholder || !s.verified);
    const evidence: EvidenceState = document.documentType !== "employment" ? "unsupported_domain" : conflicting ? "conflicting" : canonical && supplied.length ? "source_text_checked" : "missing";
    const exactOriginal = exact.has(clause.id);
    const steps = [exactOriginal
      ? step("other_party_question", "اطلب من الطرف الآخر شرح كيفية تطبيق هذا البند، واحتفظ بالتوضيح المكتوب.", "Ask the other party how this clause would operate and keep their written explanation.")
      : step("clarification", "قارن البند بالمستند الأصلي وحدد النص المقصود؛ لم يُثبت موضعه بدقة.", "Compare this clause with the original document and identify the intended text; its exact location has not been established.")];
    if (evidence !== "source_text_checked") steps.push(step("unsupported_action", "لا يمكن تحديد إجراء قانوني من المصادر المتاحة لهذا البند. اطلب مراجعة متخصصة ولا تفترض مهلة أو تعويضاً.", "The available sources do not establish a legal action for this clause. Seek professional review; do not assume a deadline or compensation."));
    if (risk !== "low" || evidence !== "source_text_checked") steps.push(review);
    return { clause, risk, exactOriginal, evidence, source: evidence === "source_text_checked" ? canonical : undefined, steps };
  }).sort((a, b) => order[a.risk] - order[b.risk]);
  const c = analysis.coverage;
  const valid = !contextMismatch && !!c && typeof c.isTruncated === "boolean" && Number.isInteger(c.totalCharacters) && c.totalCharacters > 0 && Number.isInteger(c.analyzedCharacters) && c.analyzedCharacters >= 0 && c.analyzedCharacters <= c.totalCharacters && Number.isFinite(c.coveragePercent) && c.coveragePercent >= 0 && c.coveragePercent <= 100;
  const coverage = !valid ? "unknown" : c.isTruncated || c.analyzedCharacters < c.totalCharacters || c.coveragePercent < 100 ? "partial" : document.citizenDescription && document.citizenDescription.length !== c.totalCharacters ? "unknown" : "complete";
  return { findings, attentionCount: findings.filter(f => f.risk !== "low").length, coverage, contextMismatch,
    generalSteps: [step("information", "هذا شرح للمساعدة على الفهم، وليس رأياً مهنياً أو تأكيداً لسلامة المستند.", "This explanation helps you understand the document; it is not a professional opinion or confirmation that the document is safe."), preserve, ...(!findings.length || coverage !== "complete" ? [review] : [])] };
}

export function stepText(value: NextStep, locale: Locale) { return locale === "ar" ? value.textAr : value.textEn; }
