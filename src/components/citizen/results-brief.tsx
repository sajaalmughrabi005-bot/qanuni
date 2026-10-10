"use client";

import { useLocale } from "next-intl";
import { RiskBadge } from "@/components/shared/risk-badge";
import { deriveNextSteps, stepText, type ActionFinding, type EvidenceState } from "@/lib/legal/next-steps";
import { curatedSources } from "@/lib/legal/corpus";
import type { Analysis, DocumentClause, LegalDocument, Locale } from "@/types";

type Props = { document: LegalDocument; analysis: Analysis; clauses: DocumentClause[] };
const evidenceLabels: Record<EvidenceState, [string, string]> = {
  source_text_checked: ["نص المصدر متحقق؛ الانطباق يحتاج مراجعة", "Source text checked; applicability needs review"],
  missing: ["المصدر غير متحقق", "Supporting source not verified"],
  conflicting: ["تعارض في بيانات المصدر؛ تحتاج مراجعة", "Conflicting source information; review needed"],
  unsupported_domain: ["التغطية القانونية لهذا النوع غير مكتملة", "Legal source coverage for this category is incomplete"],
};

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

function Finding({ finding, locale }: { finding: ActionFinding; locale: Locale }) {
  const ar = locale === "ar", c = finding.clause;
  return <article data-action-finding className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{ar ? "البند" : "Clause"} {c.clauseNumber}</h3><RiskBadge level={finding.risk}/></div>
    <p className="mt-3 text-xs font-medium text-foreground-muted">{finding.exactOriginal ? (ar ? "النص الأصلي المطابق" : "Exact original text") : (ar ? "النص بحسب التحليل — قارنه بالأصل" : "Text from the analysis — compare with the original")}</p>
    <blockquote className="mt-2 whitespace-pre-wrap break-words border-s-2 border-gold ps-3 text-sm leading-relaxed">{finding.exactOriginal ? c.sourceText : ar ? c.clauseTextAr : c.clauseTextEn}</blockquote>
    <h4 className="mt-4 text-sm font-semibold">{ar ? "ما الذي لاحظه حق؟" : "What did HAQ notice?"}</h4>
    <p className="mt-1 whitespace-pre-wrap break-words text-sm">{(ar ? c.concernAr : c.concernEn) || (ar ? "لا توجد ملاحظة محددة لهذا البند." : "No specific concern is recorded for this clause.")}</p>
    <h4 className="mt-3 text-sm font-semibold">{ar ? "لماذا قد يهمك؟" : "Why might it matter?"}</h4>
    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground-muted">{(ar ? c.explanationAr : c.explanationEn) || (ar ? "الشرح غير متاح؛ اطلب توضيحاً." : "An explanation is unavailable; ask for clarification.")}</p>
    <p data-evidence-state={finding.evidence} className="mt-4 text-sm font-medium">{evidenceLabels[finding.evidence][ar ? 0 : 1]}</p>
    {finding.source && <details className="mt-2 text-sm"><summary className="cursor-pointer underline underline-offset-4">{ar ? "راجع المصدر وحدود التحقق" : "Review source and verification limits"}</summary><div className="mt-3 space-y-2">
      <p>{ar ? finding.source.titleAr : finding.source.titleEn} · {ar ? "المادة" : "Article"} {finding.source.article}</p>
      <blockquote dir="rtl" lang="ar" className="whitespace-pre-wrap break-words border-s-2 border-border ps-3">{finding.source.excerptAr}</blockquote>
      <p className="text-foreground-muted">{ar ? "مقتطف محدد من إعادة نشر تستضيفها وزارة العمل. التعديلات اللاحقة وتاريخ الواقعة والاستثناءات تحتاج مراجعة؛ ليس حكماً على البند." : "Selected excerpt from a Ministry of Labour-hosted republication. Later amendments, event date and exceptions need review; this is not a determination about the clause."}</p>
      {finding.source.sourceUrl?.startsWith("https://www.mol.gov.jo/") && <a href={finding.source.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{ar ? "عرض نص المصدر" : "View source text"}</a>}
    </div></details>}
    <h4 className="mt-4 text-sm font-semibold">{ar ? "ماذا يمكنك أن تفعل الآن؟" : "What can you do next?"}</h4>
    <ul className="mt-2 list-disc space-y-2 ps-5 text-sm">{finding.steps.map(s => <li key={s.category} data-step-category={s.category}>{stepText(s, locale)}</li>)}</ul>
  </article>;
}

export function ResultsFindings(props: Props) {
  const locale = useLocale() as Locale, ar = locale === "ar";
  const result = deriveNextSteps(props.document, props.analysis, props.clauses, curatedSources);
  const attention = result.findings.filter(f => f.risk !== "low");
  const notes = result.contextMismatch ? [] : (ar ? props.analysis.concernsAr : props.analysis.concernsEn) || [];
  return <section aria-labelledby="attention-heading" className="space-y-4">
    <h2 id="attention-heading" className="text-lg font-semibold">{ar ? "أهم ما يحتاج انتباهك" : "What needs your attention"}</h2>
    {attention.length ? attention.slice(0, 3).map(f => <Finding key={f.clause.id} finding={f} locale={locale}/>) : <p className="text-sm text-foreground-muted">{ar ? "لا توجد ملاحظات ذات أولوية في البيانات المتاحة. راجع جميع البنود والأصل؛ لا يعني ذلك غياب المخاطر." : "There are no priority findings in the available data. Review all clauses and the original; this does not mean risks are absent."}</p>}
    {attention.length > 3 && <details data-more-findings className="rounded-xl border border-border p-4"><summary className="cursor-pointer font-medium">{ar ? `بقية النقاط (${attention.length - 3})` : `More findings (${attention.length - 3})`}</summary><div className="mt-4 space-y-4">{attention.slice(3).map(f => <Finding key={f.clause.id} finding={f} locale={locale}/>)}</div></details>}
    {notes.length > 0 && <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer font-medium">{ar ? "ملاحظات عامة من التحليل" : "General notes from the analysis"}</summary><p className="mt-3 text-xs text-foreground-muted">{ar ? "قد تتداخل هذه الملاحظات مع البنود أعلاه؛ لم تُحسب كنقاط مستقلة. تفسير آلي دون ربط محدد بمصدر." : "These notes may overlap the clauses above and were not counted separately. AI interpretation without a specific source mapping."}</p><ul className="mt-3 list-disc space-y-2 ps-5 text-sm">{notes.map((note,i) => <li key={i} className="whitespace-pre-wrap break-words">{note}</li>)}</ul></details>}
    <div className="rounded-xl border border-border bg-surface-muted p-4"><h3 className="font-semibold">{ar ? "قبل أن تتخذ قراراً" : "Before you decide"}</h3><ul className="mt-2 list-disc space-y-2 ps-5 text-sm">{result.generalSteps.map(s => <li key={s.category}>{stepText(s, locale)}</li>)}</ul></div>
  </section>;
}
