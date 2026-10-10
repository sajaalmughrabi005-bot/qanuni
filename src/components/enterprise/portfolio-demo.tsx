"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { evaluateImpact, type ImpactLimit } from "@/lib/impact/engine";
import { syntheticPortfolio } from "@/lib/impact/fixtures";
import { Button } from "@/components/ui/button";

const limits: Record<ImpactLimit, [string, string]> = {
  hypothetical: ["محاكاة افتراضية؛ ليست تشريعاً", "Hypothetical simulation; not legislation"], missing_provenance: ["بيانات المصدر غير مكتملة", "Source provenance is incomplete"],
  unsupported_domain: ["المجال غير مدعوم", "Domain unsupported"], unsupported_jurisdiction: ["الاختصاص غير مدعوم", "Jurisdiction unsupported"],
  not_yet_effective: ["التاريخ الافتراضي لم يبدأ", "Hypothetical effective date is in the future"], expired_version: ["النسخة المفترضة منتهية", "Proposed version has expired"],
  superseded_version: ["النسخة المقترحة مستبدلة أو مسحوبة", "Proposed version superseded or withdrawn"],
};

export function PortfolioDemo() {
  const ar = useLocale() === "ar";
  const [scenario, setScenario] = useState("mapped");
  const [queued, setQueued] = useState<string[]>([]);
  const input = useMemo(() => {
    const p = structuredClone(syntheticPortfolio);
    if (scenario === "none") p.events = [];
    if (scenario === "unrelated") p.events = [{ id: "hypothetical-change-b", articleId: "simulation-topic-b", priorVersionId: "b-before", newVersionId: "b-proposed", hypothetical: true }];
    if (scenario === "missing") delete p.versions[1].provenance;
    if (scenario === "expired") p.versions[1].effectiveTo = "2026-10-05";
    if (scenario === "unsupported") p.instruments[0].domain = "unsupported";
    return p;
  }, [scenario]);
  const result = useMemo(() => evaluateImpact(input), [input]);
  const display = (value: { titleAr: string; titleEn: string }) => ar ? value.titleAr : value.titleEn;
  const reviewed = result.findings.filter(f => f.humanReview !== "not_reviewed").length;
  return <div className="mx-auto max-w-5xl space-y-7 px-4 py-10 sm:px-6">
    <div><p className="border-s-2 border-gold ps-3 font-semibold">{ar ? "حق للشركات — تجربة معزولة" : "HAQ Enterprise — isolated demo"}</p><h1 className="mt-3 text-2xl font-semibold">{ar ? "محفظة عقود وأثر تشريعي افتراضي" : "Synthetic portfolio and legislative impact"}</h1><p role="note" className="mt-3 rounded-xl border border-border bg-surface-muted p-4 text-sm leading-relaxed">{ar ? "كل العقود والروابط والتواريخ أدناه وهمية. لا توجد مادة قانونية رسمية أو مراقبة تشريعات حية. تغير الموضوع المرتبط يدعو لإعادة التقييم، ولا يثبت مخالفة. لم يراجع مهني هذه النتائج. قوائم المراجعة محلية وتمسح عند تحديث الصفحة." : "Every contract, relationship and date below is fictional. There is no official legal article or live legislation monitoring. A mapped topic change prompts reassessment; it does not establish a violation. No professional has reviewed these findings. Review lists are local and clear on refresh."}</p></div>
    <div><label htmlFor="impact-scenario" className="mb-2 block text-sm font-medium">{ar ? "اختر محاكاة" : "Choose a simulation"}</label><select id="impact-scenario" value={scenario} onChange={e => { setScenario(e.target.value); setQueued([]); }} className="max-w-full rounded-lg border border-border bg-surface p-3 text-sm">
      <option value="mapped">{ar ? "تغيير موضوع مرتبط" : "Change a mapped topic"}</option><option value="none">{ar ? "لا يوجد تغيير" : "No change"}</option><option value="unrelated">{ar ? "تغيير موضوع غير مرتبط" : "Change an unrelated topic"}</option><option value="missing">{ar ? "مصدر غير مكتمل" : "Missing provenance"}</option><option value="expired">{ar ? "نسخة افتراضية منتهية" : "Expired hypothetical version"}</option><option value="unsupported">{ar ? "مجال غير مدعوم" : "Unsupported domain"}</option>
    </select></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-live="polite">
      {[[ar ? "عقود تجريبية" : "Synthetic contracts", input.contracts.length, "contracts"], [ar ? "عقود لإعادة التقييم" : "Contracts to reassess", result.affectedContractIds.length, "affected"], [ar ? "بنود مرتبطة بالتغيير" : "Clauses mapped to change", result.affectedClauseIds.length, "clauses"], [ar ? "مراجعة مهنية مكتملة" : "Professionally reviewed", reviewed, "reviewed"]].map(([label,count,key]) => <div key={key} className="rounded-xl border border-border bg-surface p-4"><p className="text-sm text-foreground-muted">{label}</p><p data-portfolio-stat={key} className="mt-2 text-2xl font-semibold">{count}</p></div>)}
    </div>
    <section><h2 className="text-lg font-semibold">{ar ? "العقود في المحفظة" : "Portfolio contracts"}</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{input.contracts.map(c => <article key={c.id} className="rounded-xl border border-border p-4"><h3 className="font-medium">{display(c)}</h3><p className="mt-3 text-sm text-foreground-muted">{result.affectedContractIds.includes(c.id) ? (ar ? "قد يحتاج إعادة تقييم للارتباط بالموضوع المتغير" : "May need reassessment of a changed-topic dependency") : (ar ? "لا ارتباط بهذا التغيير؛ لم يُجر تقييم امتثال" : "No mapping to this change; compliance has not been assessed")}</p></article>)}</div></section>
    <section aria-labelledby="impact-findings"><h2 id="impact-findings" className="text-lg font-semibold">{ar ? "خطة مراجعة محتملة — ليست حكماً قانونياً" : "Potential review plan — not a legal determination"}</h2>
      {result.status === "invalid_input" ? <p role="alert">{ar ? "بيانات المحاكاة غير صالحة؛ لم يُنشأ تقرير." : "Simulation inputs are invalid; no report was produced."}</p> : !result.findings.length ? <p data-no-impacts className="mt-4 text-sm">{ar ? "لا توجد بنود مرتبطة بتغيير في هذه المحاكاة. هذا لا يعني أن العقود متوافقة قانونياً." : "No clauses are mapped to a change in this simulation. This does not mean the contracts are legally compliant."}</p> : <div className="mt-4 space-y-4">{result.findings.map(f => {
        const contract = input.contracts.find(c => c.id === f.contractId)!, clause = input.clauses.find(c => c.id === f.clauseId)!, article = input.articles.find(a => a.id === f.articleId)!;
        return <article data-impact-finding key={f.id} className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold">{display(contract)} · {ar ? "بند لإعادة التقييم" : "Clause to reassess"}</h3><blockquote className="mt-3 border-s-2 border-gold ps-3 text-sm">{ar ? clause.textAr : clause.textEn}</blockquote>
          <p className="mt-3 text-sm">{ar ? "السبب: البند مرتبط بنسخة سابقة لموضوع تغير في المحاكاة." : "Reason: the clause is mapped to a prior version of a topic changed in the simulation."}</p>
          <p className="mt-3 text-sm font-medium">{ar ? "أولوية المراجعة" : "Review priority"}: {f.action.priority === "high" ? (ar ? "مرتفعة بحسب أثر البند في البيانات التجريبية" : "High, based on the fixture clause consequence") : (ar ? "اعتيادية" : "Normal")} · {ar ? "لم تُراجع مهنياً" : "Not professionally reviewed"}</p>
          <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-foreground-muted">{f.limitations.map(l => <li key={l} data-impact-limit={l}>{limits[l][ar ? 0 : 1]}</li>)}</ul>
          <details className="mt-4 text-sm"><summary className="cursor-pointer underline">{ar ? "مسار الربط والنسخ" : "Relationship and version trace"}</summary><div className="mt-3 space-y-2"><p>{ar ? article.labelAr : article.labelEn}</p><p>{ar ? "النسخة السابقة ← النسخة المقترحة" : "Prior version → proposed version"}: <bdi>{f.priorVersionId} → {f.newVersionId}</bdi></p><p>{ar ? "روابط تجريبية" : "Synthetic relationships"}: <bdi>{f.relationshipIds.join(", ")}</bdi></p><p>{ar ? "تواريخ افتراضية فقط" : "Hypothetical dates only"}: <bdi>{input.versions.find(v => v.id === f.priorVersionId)?.effectiveFrom} → {input.versions.find(v => v.id === f.newVersionId)?.effectiveFrom}</bdi></p><p>{ar ? "لا رابط مصدر رسمي لهذه المحاكاة." : "No official source link exists for this simulation."}</p></div></details>
          <p className="mt-4 text-sm">{ar ? "الخطوة: مراجعة العلاقة والنص والمصدر والنسخة والتوقيت مع مهني قبل تعديل العقد." : "Next step: review the mapping, text, provenance, version and timing with a professional before changing the contract."}</p>
          <Button className="mt-4" variant="outline" aria-pressed={queued.includes(f.id)} onClick={() => setQueued(items => items.includes(f.id) ? items.filter(id => id !== f.id) : [...items, f.id])}>{queued.includes(f.id) ? (ar ? "إزالة من قائمة التجربة" : "Remove from demo review list") : (ar ? "أضف لقائمة المراجعة المحلية" : "Add to local demo review list")}</Button>
        </article>;
      })}</div>}
    </section>
    <p role="status" data-review-queue className="text-sm">{ar ? `قائمة مراجعة التجربة: ${queued.length}. لم يُكلّف محامٍ ولم يتم إرسال شيء.` : `Demo review list: ${queued.length}. No lawyer was assigned and nothing was sent.`}</p>
    <Link href="/enterprise" className="inline-block text-sm underline">{ar ? "العودة إلى حق للشركات" : "Back to HAQ Enterprise"}</Link>
  </div>;
}
