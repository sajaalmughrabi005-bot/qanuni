import type { LegalSource } from "@/types";

// Manually checked against rendered PDF pages 6, 19 and 20, not corrupted text.
// An official-hosted Qistas republication, not the original Official Gazette.
export const LABOUR_SOURCE_URL = "https://www.mol.gov.jo/ebv4.0/root_storage/ar/eb_list_page/قانون_العمل_رقم_8_لسنة_1996_وتعديلاته_وملحقاته.pdf";
export const CORPUS_HASH = "e56c7e246e2310dd5a75abb9a6c5136ee9ac10733cd310774b3a5cca8e1f14c5";
export interface CuratedSource extends LegalSource {
  lawNumber: number; lawYear: number; effectiveFrom: string; snapshotDate: string;
  gazettePublicationDate: string | null; amendmentStatus: "unverified_after_snapshot"; authority: "official_hosted_republication";
  pdfPage: number; sourceSha256: string; applicability: "requires_review"; keywords: string[];
  instrumentType: "law"; publicationSource: string; gazetteIssue: string | null;
  retrievalDate: string; verificationState: "source_text_checked"; legalStatus: "unverified";
  articleEffectiveFrom?: string; excerptScope?: string;
}
const base = {
  titleAr: "قانون العمل رقم 8 لسنة 1996", titleEn: "Labour Law No. 8 of 1996",
  lawNumber: 8, lawYear: 1996, effectiveFrom: "1996-06-14", snapshotDate: "2025-07-24",
  gazettePublicationDate:null, amendmentStatus:"unverified_after_snapshot" as const, authority:"official_hosted_republication" as const,
  pdfPage: 20, sourceSha256: CORPUS_HASH, sourceUrl: LABOUR_SOURCE_URL,
  sourceType: "Ministry of Labour hosted republication", verified: true, lastVerifiedAt: "2026-10-04",
  isDemoPlaceholder: false, applicability: "requires_review" as const,
  instrumentType: "law" as const, publicationSource: "Jordanian Ministry of Labour — Qistas republication",
  gazetteIssue: null, retrievalDate: "2026-10-05", verificationState: "source_text_checked" as const, legalStatus: "unverified" as const,
};
export const curatedSources: CuratedSource[] = [
  {...base, id:"jo-labour-8-1996-art15a-20250724", article:"15(a)", pdfPage:6, lastVerifiedAt:"2026-10-05", articleEffectiveFrom:"2019-05-16", excerptScope:"paragraph (a) only",
    excerptAr:"ينظم عقد العمل باللغة العربية وعلى نسختين على الأقل يحتفظ كل من الطرفين بنسخة منه، ويجوز للعامل إثبات حقوقه بجميع طرق الإثبات القانونية إذا لم يحرر العقد كتابة.",
    keywords:["employment contract","written contract","Arabic","عقد العمل","كتابة","نسختين","إثبات","العربية"]},
  {...base, id:"jo-labour-8-1996-art56a-20250724", article:"56(a)", pdfPage:19, lastVerifiedAt:"2026-10-05", articleEffectiveFrom:"2004-05-16", excerptScope:"paragraph (a) only; exceptions require further sources",
    excerptAr:"لا يجوز تشغيل العامل أكثر من ثماني ساعات يومياً أو ثمان وأربعين ساعة في الأسبوع إلا في الحالات المنصوص عليها في هذا القانون ولا يحسب منها الوقت المخصص لتناول الطعام والراحة.",
    keywords:["working hours","hours per week","working day","ساعات العمل","ثماني ساعات","أربعين","الراحة"]},
  {...base, id:"jo-labour-8-1996-art59a-20250724", article:"59(a)", pdfPage:19, lastVerifiedAt:"2026-10-05", articleEffectiveFrom:"2004-05-16", excerptScope:"paragraph (a) only; holidays not included",
    excerptAr:"يجوز تشغيل العامل بموافقته أكثر من ساعات العمل اليومية أو الأسبوعية على أن يتقاضى العامل عن ساعة العمل الإضافية أجراً لا يقل عن 125% من أجره المعتاد.",
    keywords:["overtime","additional hours","extra pay","العمل الإضافي","الإضافية","بموافقته","125%"]},
  {...base, id:"jo-labour-8-1996-art61a-20250724", article:"61(a)", lastVerifiedAt:"2026-10-05", articleEffectiveFrom:"2019-05-16", excerptScope:"paragraph (a) only; scheduling and deferral require other paragraphs",
    excerptAr:"لكل عامل الحق بإجازة سنوية بأجر كامل لمدة أربعة عشر يوماً عن كل سنة خدمة إلا إذا تم الاتفاق على أكثر من ذلك على أن تصبح مدة الإجازة السنوية واحداً وعشرين يوماً إذا أمضى في الخدمة لدى صاحب العمل نفسه خمس سنوات متصلة، ولا تحسب أيام العطل الرسمية والأعياد الدينية وأيام العطلة الأسبوعية من الإجازة السنوية.",
    keywords:["annual leave","vacation entitlement","fourteen","twenty one","الإجازة السنوية","أربعة عشر","خمس سنوات","إجازة"]},
  {...base, id:"jo-labour-8-1996-art62-20250724", article:"62", lastVerifiedAt:"2026-10-05", articleEffectiveFrom:"2004-05-16",
    excerptAr:"إذا لم تؤخذ الإجازة السنوية دفعة واحدة فلا يجوز أن يقل الجزء منها عن يومين في أي مرة.",
    keywords:["annual leave","split leave","two days","الإجازة السنوية","يومين","تجزئة"]},
  {...base, id:"jo-labour-8-1996-art65-20250724", article:"65", lastVerifiedAt:"2026-10-05", articleEffectiveFrom:"2019-05-16",
    excerptAr:"لكل عامل الحق في إجازة مرضية مدتها أربعة عشر يوماً خلال السنة الواحدة بأجر كامل بناءً على تقرير من الطبيب المعتمد من قبل المؤسسة، ويجوز تجديدها لمدة أربعة عشر يوماً أخرى بأجر كامل إذا كان نزيل أحد المستشفيات بناءً على تقرير من الطبيب المعتمد من قبل المؤسسة.",
    keywords:["sick leave","medical leave","hospital","medical report","إجازة مرضية","الطبيب","المستشفيات","مرضية"]},
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
