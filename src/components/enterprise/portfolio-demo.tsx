"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { evaluateImpact, type ImpactLimit } from "@/lib/impact/engine";
import { portfolioImpact, portfolioMetrics, portfolioTopics, qaPortfolio, topicLabels, type PortfolioScenario } from "@/lib/enterprise/portfolio";
import { Button } from "@/components/ui/button";

const limits: Record<ImpactLimit, [string, string]> = {
  hypothetical: ["محاكاة افتراضية؛ ليست تشريعاً", "Hypothetical simulation; not legislation"], missing_provenance: ["بيانات المصدر غير مكتملة", "Source provenance is incomplete"],
  unsupported_domain: ["المجال غير مدعوم", "Domain unsupported"], unsupported_jurisdiction: ["الاختصاص غير مدعوم", "Jurisdiction unsupported"],
  not_yet_effective: ["التاريخ الافتراضي لم يبدأ", "Hypothetical effective date is in the future"], expired_version: ["النسخة المفترضة منتهية", "Proposed version has expired"],
  superseded_version: ["النسخة المقترحة مستبدلة أو مسحوبة", "Proposed version superseded or withdrawn"],
};

/** Public fictional snapshot, not tenant storage. Selection/queue stay in memory.
 * Topic flags are QA expectations; impact mappings are explicitly hypothetical. */
export function PortfolioDemo() {
  const ar = useLocale() === "ar";
  const [scenario, setScenario] = useState<PortfolioScenario>("mapped");
  const [organization, setOrganization] = useState("all");
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<typeof portfolioTopics[number]>("working_hours");
  const [queued, setQueued] = useState<string[]>([]);
  const contracts = useMemo(() => qaPortfolio.contracts.filter(c => organization === "all" || c.organization_id === organization), [organization]);
  const shown = contracts.filter(c => `${c.contract_id} ${c.document_title}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()));
  const metrics = portfolioMetrics(contracts);
  const input = useMemo(() => portfolioImpact(contracts, scenario, topic), [contracts, scenario, topic]);
  const result = useMemo(() => evaluateImpact(input), [input]);
  const display = (value: { titleAr: string; titleEn: string }) => ar ? value.titleAr : value.titleEn;
  const reviewed = result.findings.filter(f => f.humanReview !== "not_reviewed").length;
  return <div className="mx-auto max-w-6xl space-y-7 px-4 py-10 sm:px-6">
    <header><p className="text-sm font-semibold text-foreground-muted">{ar ? "حق للشركات" : "HAQ Enterprise"}</p><h1 className="mt-3 text-3xl font-semibold">{ar ? "مساحة عمل محفظة العقود" : "Contract portfolio workspace"}</h1><p data-enterprise-demo-note role="note" className="mt-4 rounded-xl border-s-4 border-gold bg-surface-muted p-4 text-sm leading-relaxed">{ar ? "عرض توضيحي ببيانات خيالية: الشركات والعقود والتواريخ وروابط الموضوعات للتجربة فقط. مؤشرات الاختبار ليست تحليلاً قانونياً؛ السيناريوهات ليست تشريعات رسمية أو متابعة حية، والارتباط لا يثبت مخالفة. لا توجد مراجعة مهنية أو إرسال أو تكليف محامٍ؛ قائمة المراجعة محلية وتمسح عند تحديث الصفحة." : "Demonstration with fictional organizations, contracts, dates and topic mappings. Fixture markers are not legal analysis; scenarios are not official legislation or live monitoring, and a mapping does not establish a violation. No professional review, submission or lawyer assignment occurs; the local review list clears on refresh."}</p></header>
    <section aria-label={ar ? "المحافظ" : "Portfolios"} className="grid gap-3 sm:grid-cols-3">{qaPortfolio.organizations.map(o => <button key={o.id} data-organization={o.id} aria-pressed={organization === o.id} onClick={() => { setOrganization(o.id); setSearch(""); setQueued([]); }} className={`rounded-xl border bg-surface p-5 text-start ${organization === o.id ? "border-gold" : "border-border"}`}><span className="block font-semibold">{ar ? o.name : `Fictional organization ${o.id}`}</span><span className="mt-2 block text-sm text-foreground-muted">{ar ? o.industry : o.id}</span><span className="mt-3 block text-lg font-semibold">{qaPortfolio.contracts.filter(c => c.organization_id === o.id).length} {ar ? "عقداً" : "contracts"}</span></button>)}</section>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="impact-topic" className="mb-2 block text-sm font-medium">{ar ? "الموضوع" : "Topic"}</label><select id="impact-topic" className="w-full rounded-lg border border-border bg-surface p-3 text-sm" value={topic} onChange={e => { setTopic(e.target.value as typeof topic); setQueued([]); }}>{portfolioTopics.map(t => <option key={t} value={t}>{topicLabels[t][ar ? 0 : 1]}</option>)}</select></div><div><label htmlFor="impact-scenario" className="mb-2 block text-sm font-medium">{ar ? "اختر محاكاة" : "Choose a simulation"}</label><select id="impact-scenario" value={scenario} onChange={e => { setScenario(e.target.value as PortfolioScenario); setQueued([]); }} className="w-full rounded-lg border border-border bg-surface p-3 text-sm">
      <option value="mapped">{ar ? "تغيير موضوع مرتبط" : "Change a mapped topic"}</option><option value="none">{ar ? "لا يوجد تغيير" : "No change"}</option><option value="unrelated">{ar ? "تغيير موضوع غير مرتبط" : "Change an unrelated topic"}</option><option value="missing">{ar ? "مصدر غير مكتمل" : "Missing provenance"}</option><option value="expired">{ar ? "نسخة افتراضية منتهية" : "Expired hypothetical version"}</option><option value="unsupported">{ar ? "مجال غير مدعوم" : "Unsupported domain"}</option>
    </select></div></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-live="polite">
      {[[ar ? "عقود تجريبية" : "Synthetic contracts", input.contracts.length, "contracts"], [ar ? "عقود لإعادة التقييم" : "Contracts to reassess", result.affectedContractIds.length, "affected"], [ar ? "بنود مرتبطة بالتغيير" : "Clauses mapped to change", result.affectedClauseIds.length, "clauses"], [ar ? "مراجعة مهنية مكتملة" : "Professionally reviewed", reviewed, "reviewed"]].map(([label,count,key]) => <div key={key} className="rounded-xl border border-border bg-surface p-4"><p className="text-sm text-foreground-muted">{label}</p><p data-portfolio-stat={key} className="mt-2 text-2xl font-semibold">{count}</p></div>)}
    </div>
    <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{ar ? "سجل العقود" : "Contract register"}</h2><Button variant="outline" onClick={() => { setOrganization("all"); setSearch(""); setQueued([]); }}>{ar ? "كل المحافظ" : "All portfolios"}</Button></div>
      <label className="block text-sm">{ar ? "بحث بعنوان العقد أو رقمه" : "Search by contract title or ID"}<input id="portfolio-search" className="mt-2 w-full rounded-lg border border-border bg-surface p-3" value={search} onChange={e => setSearch(e.target.value)}/></label>
      <p data-register-count className="text-sm text-foreground-muted">{ar ? `عرض ${shown.length} من ${contracts.length} عقداً · ${metrics.employment} عقد عمل · مؤشرات اختبار: ${metrics.reviewMarkers} مراجعة و${metrics.clarificationMarkers} توضيح.` : `Showing ${shown.length} of ${contracts.length} contracts · ${metrics.employment} employment contracts · Fixture markers: ${metrics.reviewMarkers} review and ${metrics.clarificationMarkers} clarification.`}</p>
      {!shown.length && <p role="status">{ar ? "لا عقود تطابق البحث." : "No contracts match this search."}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shown.map(c => <details data-portfolio-contract key={c.contract_id} className="min-w-0 rounded-xl border border-border bg-surface p-4"><summary className="cursor-pointer break-words font-medium"><bdi>{c.contract_id}</bdi><span className="mt-2 block text-sm">{c.document_title}</span></summary><div className="mt-4 space-y-3 text-sm"><p><bdi>{c.contract_date}</bdi> · <bdi>{c.document_type}</bdi></p><p>{result.affectedContractIds.includes(c.contract_id) ? (ar ? "مرتبط بالموضوع المتغير؛ مرشح لإعادة التقييم." : "Mapped to the changed topic; reassessment candidate.") : (ar ? "لا ارتباط بهذا التغيير." : "No mapping to this change.")}</p><ul className="list-disc space-y-1 ps-5">{c.expected_topic_flags.map((f,i) => <li key={i}>{topicLabels[f.topic]?.[ar ? 0 : 1] || f.topic} · {f.expected_class === "normal" ? (ar ? "مؤشر اختبار اعتيادي" : "Ordinary fixture marker") : f.expected_class === "needs_review" ? (ar ? "مرشح اختبار للمراجعة" : "Fixture review candidate") : (ar ? "مرشح اختبار للتوضيح" : "Fixture clarification candidate")}</li>)}</ul><a className="inline-block underline" href={`/enterprise-demo-contracts/${c.contract_id}.pdf`} target="_blank" rel="noopener noreferrer">{ar ? "فتح العقد الخيالي PDF" : "Open fictional contract PDF"}</a></div></details>)}</div>
    </section>
    <section aria-labelledby="impact-findings"><h2 id="impact-findings" className="text-lg font-semibold">{ar ? "خطة مراجعة محتملة — ليست حكماً قانونياً" : "Potential review plan — not a legal determination"}</h2>
      {result.status === "invalid_input" ? <p role="alert">{ar ? "بيانات المحاكاة غير صالحة؛ لم يُنشأ تقرير." : "Simulation inputs are invalid; no report was produced."}</p> : !result.findings.length ? <p data-no-impacts className="mt-4 text-sm">{ar ? "لا توجد بنود مرتبطة بتغيير في هذه المحاكاة. هذا لا يعني أن العقود متوافقة قانونياً." : "No clauses are mapped to a change in this simulation. This does not mean the contracts are legally compliant."}</p> : <div className="mt-4 space-y-4">{result.findings.map(f => {
        const contract = input.contracts.find(c => c.id === f.contractId)!, clause = input.clauses.find(c => c.id === f.clauseId)!, article = input.articles.find(a => a.id === f.articleId)!;
        return <details data-impact-finding key={f.id} className="rounded-xl border border-border bg-surface p-5"><summary className="cursor-pointer font-semibold"><bdi>{contract.id}</bdi> · {ar ? "ارتباط لإعادة التقييم" : "Mapping to reassess"}</summary><div className="mt-4">
          <h3 className="font-medium">{display(contract)}</h3><blockquote className="mt-3 border-s-2 border-gold ps-3 text-sm">{ar ? clause.textAr : clause.textEn}</blockquote>
          <p className="mt-3 text-sm">{ar ? "السبب: البند مرتبط بنسخة سابقة لموضوع تغير في المحاكاة." : "Reason: the clause is mapped to a prior version of a topic changed in the simulation."}</p>
          <p className="mt-3 text-sm font-medium">{ar ? "أولوية المراجعة" : "Review priority"}: {f.action.priority === "high" ? (ar ? "مرتفعة بحسب أثر البند في البيانات التجريبية" : "High, based on the fixture clause consequence") : (ar ? "اعتيادية" : "Normal")} · {ar ? "لم تُراجع مهنياً" : "Not professionally reviewed"}</p>
          <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-foreground-muted">{f.limitations.map(l => <li key={l} data-impact-limit={l}>{limits[l][ar ? 0 : 1]}</li>)}</ul>
          <details className="mt-4 text-sm"><summary className="cursor-pointer underline">{ar ? "مسار الربط والنسخ" : "Relationship and version trace"}</summary><div className="mt-3 space-y-2"><p>{ar ? article.labelAr : article.labelEn}</p><p>{ar ? "النسخة السابقة ← النسخة المقترحة" : "Prior version → proposed version"}: <bdi>{f.priorVersionId} → {f.newVersionId}</bdi></p><p>{ar ? "روابط تجريبية" : "Synthetic relationships"}: <bdi>{f.relationshipIds.join(", ")}</bdi></p><p>{ar ? "تواريخ افتراضية فقط" : "Hypothetical dates only"}: <bdi>{input.versions.find(v => v.id === f.priorVersionId)?.effectiveFrom} → {input.versions.find(v => v.id === f.newVersionId)?.effectiveFrom}</bdi></p><p>{ar ? "لا رابط مصدر رسمي لهذه المحاكاة." : "No official source link exists for this simulation."}</p></div></details>
          <p className="mt-4 text-sm">{ar ? "الخطوة: مراجعة العلاقة والنص والمصدر والنسخة والتوقيت مع مهني قبل تعديل العقد." : "Next step: review the mapping, text, provenance, version and timing with a professional before changing the contract."}</p>
          <Button className="mt-4" variant="outline" aria-pressed={queued.includes(f.id)} onClick={() => setQueued(items => items.includes(f.id) ? items.filter(id => id !== f.id) : [...items, f.id])}>{queued.includes(f.id) ? (ar ? "إزالة من قائمة التجربة" : "Remove from demo review list") : (ar ? "أضف لقائمة المراجعة المحلية" : "Add to local demo review list")}</Button>
        </div></details>;
      })}</div>}
    </section>
    <p role="status" data-review-queue className="text-sm">{ar ? `قائمة المراجعة المحلية: ${queued.length}` : `Local review list: ${queued.length}`}</p>
    <Link href="/enterprise" className="inline-block text-sm underline">{ar ? "العودة إلى حق للشركات" : "Back to HAQ Enterprise"}</Link>
  </div>;
}
