"use client";
import { useLocale } from "next-intl";
import { curatedSources } from "@/lib/legal/corpus";
export function LegalEvidence({sourceIds}:{sourceIds:string[]}) {
 const ar=useLocale()==="ar",sources=curatedSources.filter(s=>sourceIds.includes(s.id));
 return <details className="my-3 rounded-xl border border-border p-3 text-sm"><summary className="cursor-pointer font-medium">{ar?"المصادر القانونية ونطاق التحقق":"Legal sources and verification scope"}</summary>
 <p className="my-3 text-xs text-foreground-muted">{ar?"المكتبة محدودة بمقتطفات مختارة من قانون العمل. وجود اقتباس يدعم نص المصدر فقط، ولا يثبت صحة التفسير أو انطباقه. التعديلات اللاحقة وظروفك وتاريخ الواقعة تحتاج مراجعة محامٍ. موضوعات الإيجار والبيع والعقود المدنية وغيرها لم تكتمل مصادرها.":"The corpus contains selected Labour Law excerpts. A citation supports source text only; it does not prove the interpretation or applicability. Later amendments, your circumstances and event date require lawyer review. Rental, sale, civil-contract and other source coverage remains incomplete."}</p>
 {!sources.length&&<p>{ar?"لم يُسترجع مصدر يدعم هذا الموضوع؛ لا توجد نتيجة قانونية متحققة.":"No supporting source was retrieved for this subject; no verified legal conclusion is available."}</p>}
 {sources.map(s=><article key={s.id} className="mt-3 border-t border-border pt-3"><a className="text-gold underline" href={s.sourceUrl} target="_blank" rel="noopener noreferrer">{ar?s.titleAr:s.titleEn} — {ar?"المادة":"Article"} {s.article}</a><blockquote dir="rtl" lang="ar" className="my-2 whitespace-pre-wrap">{s.excerptAr}</blockquote><p className="text-xs text-foreground-muted">{ar?"نص المصدر متحقق فقط؛ إعادة نشر تستضيفها وزارة العمل وليست الجريدة الرسمية الأصلية.":"Source text checked only; Ministry of Labour-hosted republication, not the original Gazette."} {ar?"الصفحة":"Page"} {s.pdfPage} · {ar?"النسخة":"Snapshot"} {s.snapshotDate} · {ar?"التحقق":"Checked"} {s.lastVerifiedAt} · {ar?"التاريخ المذكور للمادة":"Article date shown"} {s.articleEffectiveFrom||s.effectiveFrom}</p></article>)}
 </details>;
}
