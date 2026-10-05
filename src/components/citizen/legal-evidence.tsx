"use client";
import { useLocale } from "next-intl";
import { curatedSources } from "@/lib/legal/corpus";
export function LegalEvidence({sourceIds}:{sourceIds:string[]}) {
 const ar=useLocale()==="ar",sources=curatedSources.filter(s=>sourceIds.includes(s.id));
 return <details className="my-3 rounded-xl border border-border p-3 text-sm"><summary className="cursor-pointer font-medium">{ar?"المصادر القانونية ونطاق التحقق":"Legal sources and verification scope"}</summary>
 <p className="my-3 text-xs text-foreground-muted">{ar?"المكتبة الحالية محدودة بمادتين عن الإجازة السنوية. تم التحقق من نص النسخة المنشورة لدى وزارة العمل (يوليو 2025). النص الحالي والتعديلات اللاحقة وانطباق الحكم على تاريخ حالتك تحتاج مراجعة محامٍ. تفسير الذكاء الاصطناعي غير متحقق.":"The current corpus covers two annual-leave articles only. Text was checked in the Ministry of Labour-hosted July 2025 snapshot. Current amendments and applicability to your circumstances/date require lawyer review. AI interpretations are unverified."}</p>
 {!sources.length&&<p>{ar?"لم يُسترجع مصدر يدعم هذا الموضوع؛ لا توجد نتيجة قانونية متحققة.":"No supporting source was retrieved for this subject; no verified legal conclusion is available."}</p>}
 {sources.map(s=><article key={s.id} className="mt-3 border-t border-border pt-3"><a className="text-gold underline" href={s.sourceUrl} target="_blank" rel="noopener noreferrer">{ar?s.titleAr:s.titleEn} — {ar?"المادة":"Article"} {s.article}</a><blockquote dir="rtl" lang="ar" className="my-2 whitespace-pre-wrap">{s.excerptAr}</blockquote><p className="text-xs text-foreground-muted">{ar?"نص المصدر متحقق؛ ص20، نسخة 2025-07-24، التحقق 2026-10-04. السريان المذكور في النسخة: 1996-06-14.":"Source text checked: p20, snapshot 2025-07-24, checked 2026-10-04. Effective date shown in snapshot: 1996-06-14."}</p></article>)}
 </details>;
}
