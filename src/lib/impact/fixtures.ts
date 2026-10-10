import type { ImpactInput } from "./engine";

// Entirely fictional dependency model, not Jordanian law or an official publication.
const hypothetical = { state: "hypothetical" as const, description: "Fictional dependency for local demonstration; no official legal text or source." };
export const syntheticPortfolio: ImpactInput = {
  asOf: "2026-10-10", supportedDomains: ["employment"],
  instruments: [{ id: "fictional-instrument", labelAr: "أداة افتراضية للتجربة — ليست تشريعاً", labelEn: "Fictional simulation instrument — not legislation", jurisdiction: "JO", domain: "employment" }],
  articles: [
    { id: "simulation-topic-a", instrumentId: "fictional-instrument", labelAr: "موضوع افتراضي أ", labelEn: "Hypothetical topic A" },
    { id: "simulation-topic-b", instrumentId: "fictional-instrument", labelAr: "موضوع افتراضي ب", labelEn: "Hypothetical topic B" },
  ],
  versions: [
    { id: "a-before", articleId: "simulation-topic-a", effectiveFrom: "2025-01-01", status: "superseded", provenance: hypothetical },
    { id: "a-proposed", articleId: "simulation-topic-a", effectiveFrom: "2026-10-01", status: "candidate", provenance: hypothetical },
    { id: "b-before", articleId: "simulation-topic-b", effectiveFrom: "2025-01-01", status: "superseded", provenance: hypothetical },
    { id: "b-proposed", articleId: "simulation-topic-b", effectiveFrom: "2026-10-01", status: "candidate", provenance: hypothetical },
  ],
  contracts: [
    { id: "portfolio-a", titleAr: "عقد فريق تجريبي أ", titleEn: "Synthetic team contract A", category: "employment" },
    { id: "portfolio-b", titleAr: "عقد فريق تجريبي ب", titleEn: "Synthetic team contract B", category: "employment" },
    { id: "portfolio-c", titleAr: "عقد خدمة تجريبي ج", titleEn: "Synthetic service contract C", category: "service" },
  ],
  clauses: [
    { id: "a-1", contractId: "portfolio-a", textAr: "بند تجريبي لتنظيم جدول العمل.", textEn: "Fictional work scheduling clause.", consequence: "high" },
    { id: "a-2", contractId: "portfolio-a", textAr: "بند تجريبي لتوثيق موافقات الجدول.", textEn: "Fictional scheduling approval clause.", consequence: "normal" },
    { id: "b-1", contractId: "portfolio-b", textAr: "بند تجريبي لتوثيق الجدول.", textEn: "Fictional schedule record clause.", consequence: "normal" },
    { id: "c-1", contractId: "portfolio-c", textAr: "بند تجريبي لتسليم الخدمة دون ربط قانوني.", textEn: "Fictional service delivery clause without a legal mapping.", consequence: "normal" },
  ],
  relationships: [
    { id: "map-a1", clauseId: "a-1", versionId: "a-before", provenance: hypothetical },
    { id: "map-a2", clauseId: "a-2", versionId: "a-before", provenance: hypothetical },
    { id: "map-b1", clauseId: "b-1", versionId: "a-before", provenance: hypothetical },
  ],
  events: [{ id: "hypothetical-change-a", articleId: "simulation-topic-a", priorVersionId: "a-before", newVersionId: "a-proposed", hypothetical: true }],
};
