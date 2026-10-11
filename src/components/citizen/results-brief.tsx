"use client";

import { useLocale } from "next-intl";
import { RiskBadge } from "@/components/shared/risk-badge";
import { deriveNextSteps, type ActionFinding, type EvidenceState } from "@/lib/legal/next-steps";
import { curatedSources } from "@/lib/legal/corpus";
import type { Analysis, DocumentClause, LegalDocument, Locale } from "@/types";

type Props = { document: LegalDocument; analysis: Analysis; clauses: DocumentClause[] };
type FindingsProps = Props & { onViewOriginalAction?: (clause: DocumentClause) => void };
const evidenceLabels: Record<EvidenceState, [string, string]> = {
  source_text_checked: ["نص المصدر متحقق؛ الانطباق يحتاج مراجعة", "Source text checked; applicability needs review"],
  missing: ["المصدر غير متحقق", "Supporting source not verified"],
  conflicting: ["تعارض في بيانات المصدر؛ تحتاج مراجعة", "Conflicting source information; review needed"],
  unsupported_domain: ["التغطية القانونية لهذا النوع غير مكتملة", "Legal source coverage for this category is incomplete"],
};

const compactEvidenceLabels: Record<EvidenceState, [string, string]> = {
  source_text_checked: ["نص المصدر متحقق · الانطباق غير محسوم", "Source text checked · applicability undetermined"],
  missing: ["لا يوجد مصدر متحقق", "No checked supporting source"],
  conflicting: ["بيانات المصدر متعارضة", "Conflicting source information"],
  unsupported_domain: ["مصادر هذا النوع غير مكتملة", "Source coverage incomplete for this category"],
};
const priorities = {
  high: ["أولوية عالية", "High priority"],
  medium: ["يحتاج انتباه", "Needs attention"],
  unknown: ["الأولوية غير متحققة", "Priority unverified"],
  low: ["أولوية أقل", "Lower priority"],
};

/** A bounded excerpt of existing analysis, never a newly generated finding or title.
 * Truncation is explicit; the complete text remains in the same card's disclosure.
 * Source/applicability and high-consequence uncertainty are independent of this excerpt. */
function briefExcerpt(text: string | undefined, fallback: string) {
  const words = text?.trim().split(/\s+/) || [];
  if (!words[0]) return fallback;
  return words.length > 18 ? `${words.slice(0, 18).join(" ")}…` : words.join(" ");
}

export function ResultsSummary(props: Props) {
  const ar = useLocale() === "ar";
  const result = deriveNextSteps(props.document, props.analysis, props.clauses, curatedSources);
  const summary = ar ? props.analysis.summaryAr : props.analysis.summaryEn;
  const hasUnmappedNotes = !!(ar ? props.analysis.concernsAr : props.analysis.concernsEn)?.length && !result.contextMismatch;
  return <section data-results-summary aria-labelledby="result-explanation" className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 id="result-explanation" className="text-xl font-semibold">{ar ? "مستندك، بلغة واضحة" : "Your document, in plain language"}</h1><RiskBadge level={result.contextMismatch ? "unknown" : props.analysis.overallRisk}/></div>
    <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed">{result.contextMismatch ? (ar ? "تعذر مطابقة التحليل بهذا المستند." : "This analysis could not be matched to this document.") : summary?.trim() || (ar ? "لا يتوفر ملخص لهذا التحليل." : "No summary is available for this analysis.")}</p>
    <p data-attention-count className="mt-4 font-semibold">{result.attentionCount ? (ar ? `وجدنا ${result.attentionCount} بنود تحتاج انتباهك` : `${result.attentionCount} clause findings need your attention`) : hasUnmappedNotes ? (ar ? "توجد ملاحظات عامة في التحليل دون ربط ببند ذي أولوية؛ راجعها أدناه." : "The analysis has general notes without a priority clause mapping; review them below.") : (ar ? "لم تُحدد نقاط تحتاج انتباهاً؛ هذا لا يثبت سلامة المستند." : "No attention findings were identified; this does not establish that the document is safe.")}</p>
    {result.coverage !== "complete" && <p role="note" data-coverage className="mt-3 rounded-lg bg-surface-muted p-3 text-sm">{result.coverage === "partial" ? (ar ? "التحليل جزئي؛ قد توجد بنود لم تُراجع. راجع المستند كاملاً قبل التصرف." : "This analysis is partial; some clauses may not have been reviewed. Read the complete document before acting.") : (ar ? "نطاق التغطية غير متحقق؛ لا يمكن تأكيد مراجعة المستند كاملاً." : "Analysis coverage is unverified; review of the complete document cannot be confirmed.")}</p>}
    <p className="mt-3 text-sm text-foreground-muted">{ar ? "الملاحظات تفسير بالذكاء الاصطناعي. وجود مصدر لا يثبت صحة التفسير أو انطباقه؛ النتائج لم تُراجع مهنياً." : "Findings are AI interpretations. A source does not establish that an interpretation is correct or applicable; these results have not been professionally reviewed."}</p>
  </section>;
}

function Finding({ finding, locale, onViewOriginalAction }: { finding: ActionFinding; locale: Locale; onViewOriginalAction?: FindingsProps["onViewOriginalAction"] }) {
  const ar = locale === "ar", c = finding.clause;
  const concern = (ar ? c.concernAr : c.concernEn)?.trim();
  const explanation = ar ? c.explanationAr : c.explanationEn;
  // DocumentClause has no authoritative title field. Preserve the actual number rather
  // than guessing a title from AI text. Procedural prompts reference that same clause.
  const nextStep = finding.exactOriginal
    ? (ar ? `اطلب توضيحاً مكتوباً بشأن الملاحظة على البند ${c.clauseNumber}.` : `Ask for written clarification of the concern about clause ${c.clauseNumber}.`)
    : (ar ? `حدّد نص البند ${c.clauseNumber} في الأصل أولاً، ثم اطلب توضيحه.` : `Identify clause ${c.clauseNumber} in the original first, then ask for clarification.`);
  return <article data-action-finding className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5">
    <div data-finding-brief className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{ar ? "البند" : "Clause"} {c.clauseNumber}</h3>
        <span data-finding-priority={finding.risk} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium">{priorities[finding.risk][ar ? 0 : 1]}</span>
      </div>
      <dl className="space-y-2 text-sm leading-relaxed">
        <div><dt className="inline font-medium">{ar ? "شو المشكلة؟ " : "The concern: "}</dt><dd className="inline break-words">{briefExcerpt(concern || explanation, ar ? "لا توجد ملاحظة محددة؛ الشرح يحتاج مراجعة." : "No specific concern is recorded; the explanation needs review.")}</dd></div>
        <div><dt className="inline font-medium">{ar ? "ليش بتهمني؟ " : "Why it matters: "}</dt><dd className="inline break-words text-foreground-muted">{concern?.trim() ? briefExcerpt(explanation, ar ? "الشرح غير متاح؛ لا يمكن تحديد الأثر." : "An explanation is unavailable; the effect cannot be determined.") : (ar ? "الأثر على حالتك غير متحقق من التفسير الآلي وحده." : "The effect on your circumstances is not established by the AI interpretation alone.")}</dd></div>
        <div><dt className="inline font-medium">{ar ? "شو أعمل؟ " : "Next step: "}</dt><dd className="inline break-words" data-step-category={finding.exactOriginal ? "other_party_question" : "clarification"}>{nextStep}</dd></div>
      </dl>
      <p data-evidence-state={finding.evidence} className="text-xs text-foreground-muted">{compactEvidenceLabels[finding.evidence][ar ? 0 : 1]}{(finding.risk === "high" || finding.risk === "unknown" || finding.evidence === "conflicting") && <span className="block font-medium text-foreground">{ar ? "يحتاج مراجعة قانونية بشرية" : "Human legal review needed"}</span>}</p>
    </div>
    <details data-finding-details className="mt-3 border-t border-border pt-3 text-sm">
      <summary className="cursor-pointer font-medium underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">{ar ? "عرض التفاصيل" : "Show details"}<span className="sr-only"> — {ar ? "البند" : "clause"} {c.clauseNumber}</span></summary>
      <div className="mt-4 space-y-3">
    <p className="mt-3 text-xs font-medium text-foreground-muted">{finding.exactOriginal ? (ar ? "النص الأصلي المطابق" : "Exact original text") : (ar ? "النص بحسب التحليل — قارنه بالأصل" : "Text from the analysis — compare with the original")}</p>
    <blockquote className="mt-2 whitespace-pre-wrap break-words border-s-2 border-gold ps-3 text-sm leading-relaxed">{finding.exactOriginal ? c.sourceText : ar ? c.clauseTextAr : c.clauseTextEn}</blockquote>
    <h4 className="text-sm font-semibold">{ar ? "الملاحظة الكاملة" : "Full concern"}</h4>
    <p className="whitespace-pre-wrap break-words">{concern || (ar ? "لا توجد ملاحظة محددة لهذا البند." : "No specific concern is recorded for this clause.")}</p>
    <h4 className="text-sm font-semibold">{ar ? "التفسير الآلي الكامل" : "Full AI interpretation"}</h4>
    <p className="whitespace-pre-wrap break-words text-foreground-muted">{explanation || (ar ? "الشرح غير متاح؛ اطلب توضيحاً." : "An explanation is unavailable; ask for clarification.")}</p>
    <p className="text-sm font-medium">{evidenceLabels[finding.evidence][ar ? 0 : 1]}</p>
    {finding.evidence !== "source_text_checked" && <p data-step-category="unsupported_action" className="text-foreground-muted">{ar ? "المصادر المتاحة لا تحدد إجراءً قانونياً لهذا البند؛ لا تفترض مهلة أو تعويضاً أو مخالفة مؤكدة." : "Available sources do not establish a legal action for this clause; do not assume a deadline, compensation or a confirmed violation."}</p>}
    {finding.source && <div className="space-y-2">
      <p>{ar ? finding.source.titleAr : finding.source.titleEn} · {ar ? "المادة" : "Article"} {finding.source.article}</p>
      <blockquote dir="rtl" lang="ar" className="whitespace-pre-wrap break-words border-s-2 border-border ps-3">{finding.source.excerptAr}</blockquote>
      <p className="text-foreground-muted">{ar ? "مقتطف محدد من إعادة نشر تستضيفها وزارة العمل. التعديلات اللاحقة وتاريخ الواقعة والاستثناءات تحتاج مراجعة؛ ليس حكماً على البند." : "Selected excerpt from a Ministry of Labour-hosted republication. Later amendments, event date and exceptions need review; this is not a determination about the clause."}</p>
      {finding.source.sourceUrl?.startsWith("https://www.mol.gov.jo/") && <a href={finding.source.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{ar ? "عرض نص المصدر" : "View source text"}</a>}
      <p className="text-xs text-foreground-muted">{ar ? "الصفحة" : "Page"} {finding.source.pdfPage} · {ar ? "النسخة" : "Snapshot"} {finding.source.snapshotDate} · {ar ? "التحقق" : "Checked"} {finding.source.lastVerifiedAt} · {ar ? "تاريخ المادة المذكور" : "Article date shown"} {finding.source.articleEffectiveFrom || finding.source.effectiveFrom}</p>
    </div>}
    {!finding.exactOriginal && <p className="text-xs text-foreground-muted">{ar ? "موضع البند غير متحقق؛ لا يوجد تظليل مطابق لهذا النص." : "The clause location is unverified; no exact highlight is available for this text."}</p>}
    {onViewOriginalAction && <button type="button" className="underline underline-offset-4" onClick={() => onViewOriginalAction(c)}>{finding.exactOriginal ? (ar ? "عرض البند في الأصل" : "View clause in original") : (ar ? "قارن بالمستند الأصلي" : "Compare with original document")}</button>}
      </div>
    </details>
  </article>;
}

/** UI-only projection over the shared, unchanged Next Steps result. Native details
 * retain full evidence/text without hidden fetches, AI calls, state or persistence.
 * The parent owns the single next-actions/consultation section and original viewer. */
export function ResultsFindings(props: FindingsProps) {
  const locale = useLocale() as Locale, ar = locale === "ar";
  const result = deriveNextSteps(props.document, props.analysis, props.clauses, curatedSources);
  const attention = result.findings.filter(f => f.risk !== "low");
  const notes = result.contextMismatch ? [] : (ar ? props.analysis.concernsAr : props.analysis.concernsEn) || [];
  return <section aria-labelledby="attention-heading" className="space-y-4">
    <div><h2 id="attention-heading" className="text-base font-semibold">{ar ? `نقاط تحتاج انتباه (${result.attentionCount})` : `Points needing attention (${result.attentionCount})`}</h2><p className="mt-1 text-xs text-foreground-muted">{ar ? "مقتطفات قصيرة من التحليل؛ النص الكامل والمصدر في التفاصيل. الأولوية ليست حكماً بوجود مخالفة." : "Short analysis excerpts; full text and sources are in the details. Priority is not a finding of a legal violation."}</p></div>
    {attention.length ? attention.slice(0, 3).map(f => <Finding key={f.clause.id} finding={f} locale={locale} onViewOriginalAction={props.onViewOriginalAction}/>) : <p className="text-sm text-foreground-muted">{ar ? "لا توجد ملاحظات ذات أولوية في البيانات المتاحة. راجع جميع البنود والأصل؛ لا يعني ذلك غياب المخاطر." : "There are no priority findings in the available data. Review all clauses and the original; this does not mean risks are absent."}</p>}
    {attention.length > 3 && <details data-more-findings className="rounded-xl border border-border bg-surface p-4"><summary className="cursor-pointer font-medium">{ar ? `بقية النقاط (${attention.length - 3})` : `More findings (${attention.length - 3})`}</summary><div className="mt-4 space-y-4">{attention.slice(3).map(f => <Finding key={f.clause.id} finding={f} locale={locale} onViewOriginalAction={props.onViewOriginalAction}/>)}</div></details>}
    {notes.length > 0 && <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer font-medium">{ar ? "ملاحظات عامة من التحليل" : "General notes from the analysis"}</summary><p className="mt-3 text-xs text-foreground-muted">{ar ? "قد تتداخل هذه الملاحظات مع البنود أعلاه؛ لم تُحسب كنقاط مستقلة. تفسير آلي دون ربط محدد بمصدر." : "These notes may overlap the clauses above and were not counted separately. AI interpretation without a specific source mapping."}</p><ul className="mt-3 list-disc space-y-2 ps-5 text-sm">{notes.map((note,i) => <li key={i} className="whitespace-pre-wrap break-words">{note}</li>)}</ul></details>}
  </section>;
}
