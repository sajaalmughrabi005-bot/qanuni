import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EnterpriseInquiryForm } from "@/components/enterprise/inquiry-form";

export default async function EnterprisePage() {
  const ar = (await getLocale()) === "ar";
  const services = ar ? ["تقييم محفظة العقود وتحديد نقاط المراجعة", "ربط الملاحظات بنص العقد والمصادر المتاحة", "مراجعة النتائج المهمة بواسطة مهنيين مرخصين", "تقييم العقود المحتمل تأثرها بتغير تشريعي", "خطة عمل وتقارير توضح نطاق الأدلة والقيود"] : ["Contract portfolio assessment and review priorities", "Findings traced to contract text and available sources", "Important findings reviewed by licensed professionals", "Contracts potentially affected by legislative changes", "Action plans and reports with evidence scope and limitations"];
  return <div>
    <section className="haq-landing px-4 py-14 sm:px-6 sm:py-20"><div className="mx-auto max-w-4xl">
      <p className="text-sm font-semibold text-gold">{ar ? "حق للشركات" : "HAQ Enterprise"}</p>
      <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-relaxed sm:text-4xl">{ar ? "من محفظة العقود إلى خطة مراجعة واضحة" : "From your contract portfolio to a clear review plan"}</h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground-muted">{ar ? "خدمة مهنية مقترحة لفرق الموارد البشرية والشؤون القانونية والامتثال. يساعد الذكاء الاصطناعي في تحديد نقاط محتملة؛ لا يحل محل المراجعة القانونية ولا يمنح شهادة امتثال." : "A proposed professional service for HR, legal and compliance teams. AI helps identify candidate issues; it does not replace legal review or certify compliance."}</p>
      <div className="mt-7 flex flex-wrap gap-4"><a href="#inquiry" className="rounded-lg bg-gold px-5 py-3 font-medium text-[#0c1421]">{ar ? "استكشف نموذج طلب التقييم" : "Explore the assessment inquiry"}</a><Link href="/enterprise/demo" className="rounded-lg border border-border px-5 py-3 font-medium">{ar ? "شاهد محفظة تجريبية" : "Explore a synthetic portfolio"}</Link></div>
    </div></section>
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-10 sm:px-6">
      <section aria-labelledby="enterprise-services"><h2 id="enterprise-services" className="text-xl font-semibold">{ar ? "نطاق الخدمة المقترح" : "Proposed service scope"}</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{services.map(s => <li key={s} className="rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed">{s}</li>)}</ul></section>
      <section><h2 className="text-xl font-semibold">{ar ? "سرية أولاً، ثم نطاق متفق عليه" : "Confidentiality first, then an agreed scope"}</h2><p className="mt-3 leading-relaxed text-foreground-muted">{ar ? "قبل استقبال عقود حقيقية، يلزم الاتفاق على نطاق العمل والسرية ومعالجة البيانات والمراجعة المهنية. هذه الواجهة تعرض الأساس المقترح فقط؛ الإرسال واستقبال الملفات والفوترة والمتابعة الحية غير مفعلة. خدمات الشركات منفصلة عن سوق المحامين للأفراد." : "Before real contract intake, scope, confidentiality, data processing and professional review arrangements must be agreed. This interface presents the proposed foundation only; submission, file intake, billing and live monitoring are unavailable. Enterprise services are separate from the citizen lawyer marketplace."}</p></section>
      <EnterpriseInquiryForm/>
    </div>
  </div>;
}
