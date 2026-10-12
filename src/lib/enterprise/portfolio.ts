import { z } from "zod";
import snapshot from "./qa-portfolio.json";
import type { ImpactInput } from "../impact/engine";

/** Versioned public synthetic snapshot, not a tenant repository or legal analysis.
 * Source QA files are kept untouched. IDs/digests retain PDF provenance; topic flags
 * are test expectations, never actual clause quotations or validated legal risks. */
const schema = z.object({
  organizations: z.array(z.object({ id: z.string(), name: z.string(), industry: z.string(), city: z.string() })),
  contracts: z.array(z.object({
    contract_id: z.string(), organization_id: z.string(), document_title: z.string(), document_type: z.string(), contract_date: z.string(),
    synthetic: z.literal(true), pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    expected_topic_flags: z.array(z.object({ clause: z.string(), topic: z.string(), marker: z.string(), expected_class: z.enum(["normal", "needs_review", "needs_clarification"]) })),
  })),
});
export const qaPortfolio = schema.parse(snapshot);
export type QAContract = typeof qaPortfolio.contracts[number];
export const portfolioTopics = ["wage_payment", "working_hours", "annual_leave", "termination"] as const;
export type PortfolioScenario = "mapped" | "none" | "unrelated" | "missing" | "expired" | "unsupported";
export const topicLabels: Record<string, [string, string]> = {
  wage_payment: ["الأجر وطريقة الصرف", "Wage payment"], working_hours: ["ساعات العمل", "Working hours"], annual_leave: ["الإجازات", "Leave"], termination: ["إنهاء العقد", "Termination"],
};

export function portfolioMetrics(contracts: readonly QAContract[]) {
  const flags = contracts.flatMap(c => c.expected_topic_flags);
  return { contracts: contracts.length, employment: contracts.filter(c => c.document_type === "employment_contract").length,
    topicMarkers: flags.length, reviewMarkers: flags.filter(f => f.expected_class === "needs_review").length,
    clarificationMarkers: flags.filter(f => f.expected_class === "needs_clarification").length };
}

/** Reuse the pure Impact Engine. Explicit fictional version mappings are constructed
 * from fixture topic labels only; normal fixture flags can still be affected by a
 * topic change. No legal articles/citations, provider calls or storage mutations. */
export function portfolioImpact(contracts: readonly QAContract[], scenario: PortfolioScenario, topic: typeof portfolioTopics[number]): ImpactInput {
  const provenance = { state: "hypothetical" as const, description: "Synthetic QA topic/version dependency, not official legislation or legal interpretation." };
  const articles = [...portfolioTopics, "unrelated"].map(id => ({ id, instrumentId: "qa-fictional-topics", labelAr: topicLabels[id]?.[0] || "موضوع غير مرتبط", labelEn: topicLabels[id]?.[1] || "Unrelated topic" }));
  const versions = articles.flatMap(a => [
    { id: `${a.id}-before`, articleId: a.id, effectiveFrom: "2025-01-01", status: "superseded" as const, provenance },
    { id: `${a.id}-proposed`, articleId: a.id, effectiveFrom: "2026-10-01", status: "candidate" as const, provenance: scenario === "missing" ? undefined : provenance, ...(scenario === "expired" ? { effectiveTo: "2026-10-05" } : {}) },
  ]);
  const clauses = contracts.flatMap(c => c.expected_topic_flags.map((f, index) => ({
    id: `${c.contract_id}-topic-${index}`, contractId: c.contract_id,
    textAr: `موضوع اختبار: ${f.clause} — ليس اقتباساً من العقد.`, textEn: `Fixture topic: ${topicLabels[f.topic]?.[1] || f.topic} — not a contract quotation.`,
    consequence: f.expected_class === "needs_review" ? "high" as const : "normal" as const,
  })));
  const selected = scenario === "unrelated" ? "unrelated" : topic;
  return {
    asOf: "2026-10-12", supportedDomains: ["employment"],
    instruments: [{ id: "qa-fictional-topics", labelAr: "موضوعات اختبار", labelEn: "QA topics", jurisdiction: "JO", domain: scenario === "unsupported" ? "unsupported" : "employment" }],
    articles, versions, clauses,
    contracts: contracts.map(c => ({ id: c.contract_id, titleAr: c.document_title, titleEn: c.contract_id, category: c.document_type })),
    relationships: contracts.flatMap(c => c.expected_topic_flags.map((f, index) => ({ id: `${c.contract_id}-map-${index}`, clauseId: `${c.contract_id}-topic-${index}`, versionId: `${f.topic}-before`, provenance }))),
    events: scenario === "none" ? [] : [{ id: `${selected}-change`, articleId: selected, priorVersionId: `${selected}-before`, newVersionId: `${selected}-proposed`, hypothetical: true }],
  };
}
