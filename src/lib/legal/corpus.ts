import type { LegalSource } from "@/types";

// Manually checked against PDF page 20, not its corrupted extracted text.
// An official-hosted Qistas republication, not the original Official Gazette.
export const LABOUR_SOURCE_URL = "https://www.mol.gov.jo/ebv4.0/root_storage/ar/eb_list_page/قانون_العمل_رقم_8_لسنة_1996_وتعديلاته_وملحقاته.pdf";
export const CORPUS_HASH = "e56c7e246e2310dd5a75abb9a6c5136ee9ac10733cd310774b3a5cca8e1f14c5";
export interface CuratedSource extends LegalSource {
  lawNumber: number; lawYear: number; effectiveFrom: string; snapshotDate: string;
  gazettePublicationDate: string | null; amendmentStatus: "unverified_after_snapshot"; authority: "official_hosted_republication";
  pdfPage: number; sourceSha256: string; applicability: "requires_review"; keywords: string[];
}
const base = {
  titleAr: "قانون العمل رقم 8 لسنة 1996", titleEn: "Labour Law No. 8 of 1996",
  lawNumber: 8, lawYear: 1996, effectiveFrom: "1996-06-14", snapshotDate: "2025-07-24",
  gazettePublicationDate:null, amendmentStatus:"unverified_after_snapshot" as const, authority:"official_hosted_republication" as const,
  pdfPage: 20, sourceSha256: CORPUS_HASH, sourceUrl: LABOUR_SOURCE_URL,
  sourceType: "Ministry of Labour hosted republication", verified: true, lastVerifiedAt: "2026-10-04",
  isDemoPlaceholder: false, applicability: "requires_review" as const,
};
export const curatedSources: CuratedSource[] = [
  { ...base, id: "jo-labour-8-1996-art63-20250724", article: "63",
    excerptAr: "إذا انتهت خدمة العامل لأي سبب من الأسباب قبل أن يستعمل إجازته السنوية فيحق له تقاضي الأجر عن الأيام التي لم يستعملها من تلك الإجازة.",
    keywords: ["annual leave", "unused leave", "vacation", "leave pay", "إجازة", "الإجازة", "السنوية", "العامل", "انتهاء الخدمة"] },
  { ...base, id: "jo-labour-8-1996-art64-20250724", article: "64",
    excerptAr: "يعتبر باطلاً كل اتفاق يقضي بتنازل العامل عن إجازته السنوية أو عن أي جزء منها.",
    keywords: ["annual leave", "waive", "waiver", "vacation", "إجازة", "إجازته", "السنوية", "تنازل", "بتنازل"] },
];

export function validateCitation(sourceId: string, quote: string, supplied: CuratedSource[]) {
  const source = supplied.find(s => s.id === sourceId && s.verified && !s.isDemoPlaceholder);
  return source && quote.trim() === source.excerptAr ? source : undefined;
}
export function normalizeLegalText(text: string) {
  return text.toLowerCase().normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا");
}
