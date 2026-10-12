"use client";

import { useRef, useState } from "react";
import { useLocale } from "next-intl";
import { validateDemoInquiry } from "@/lib/enterprise/inquiry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const fields = {
  company: ["اسم الشركة", "Company name"], industry: ["القطاع", "Industry"], volume: ["عدد العقود التقريبي", "Approximate contract volume"],
  categories: ["أنواع العقود", "Contract categories"], concern: ["موضوع المراجعة المطلوب", "Primary concern"], service: ["الخدمة المطلوبة", "Requested service"],
  contact: ["جهة التواصل", "Contact person"], email: ["البريد المهني", "Business email"], phone: ["الهاتف (اختياري إلا عند اختياره للتواصل)", "Phone (optional unless selected for contact)"],
  preferredContact: ["وسيلة التواصل المفضلة", "Preferred contact method"], demoConsent: ["إقرار التجربة المعزولة", "Isolated demo acknowledgement"],
} as const;
const categories = [["employment", "عمل", "Employment"], ["service", "خدمات", "Services"], ["commercial", "تجاري", "Commercial"], ["other", "أخرى", "Other"]];
const selectClass = "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-gold";

export function EnterpriseInquiryForm() {
  const ar = useLocale() === "ar";
  const [demo, setDemo] = useState(false);
  const [outcome, setOutcome] = useState<ReturnType<typeof validateDemoInquiry> | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const invalid = (name: string) => outcome?.status === "invalid" && outcome.fields.includes(name);
  const label = (name: keyof typeof fields) => fields[name][ar ? 0 : 1];
  const common = (name: keyof typeof fields) => ({ id: `inquiry-${name}`, name, "aria-invalid": !!invalid(name), "aria-describedby": invalid(name) ? `inquiry-error-${name}` : undefined });
  const error = (name: string) => invalid(name) ? <p id={`inquiry-error-${name}`} className="mt-1 text-sm text-risk-high">{name === "phone" ? (ar ? "أدخل هاتفاً صحيحاً عند اختيار التواصل بالهاتف." : "Enter a valid phone when phone contact is selected.") : name === "categories" ? (ar ? "اختر نوع عقد واحداً على الأقل." : "Choose at least one contract category.") : name === "demoConsent" ? (ar ? "أكد استخدام بيانات وهمية فقط." : "Confirm that only fictional data is used.") : (ar ? "أكمل هذا الحقل بقيمة صحيحة." : "Complete this field with a valid value.")}</p> : null;
  return <section id="inquiry" aria-labelledby="inquiry-heading" className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
    <h2 id="inquiry-heading" className="text-xl font-semibold">{ar ? "طلب تقييم مهني للشركة" : "Request a professional assessment"}</h2>
    <p role="note" className="mt-3 text-sm leading-relaxed">{ar ? "الإرسال الفعلي غير متاح حالياً. لا تدخل بيانات حقيقية أو معلومات سرية ولا ترفق عقوداً. يمكنك تجربة التحقق ببيانات وهمية فقط؛ لن تُرسل أو تُحفظ." : "Real submissions are currently unavailable. Do not enter real or confidential information or upload contracts. You may try validation with fictional data only; nothing will be sent or saved."}</p>
    <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={demo} onChange={e => { setDemo(e.target.checked); setOutcome(null); if (!e.target.checked) formRef.current?.reset(); }} className="mt-1 accent-gold"/>{ar ? "تفعيل تجربة النموذج ببيانات وهمية" : "Enable form demo with fictional data"}</label>
    <form ref={formRef} noValidate className="mt-5 space-y-5" onChange={() => setOutcome(null)} onSubmit={e => {
      e.preventDefault();
      if (!demo) return;
      const data = new FormData(e.currentTarget);
      setOutcome(validateDemoInquiry({ ...Object.fromEntries(data), categories: data.getAll("categories"), demoConsent: data.get("demoConsent") === "on" }));
      requestAnimationFrame(() => statusRef.current?.focus());
    }}>
      <fieldset disabled={!demo} className="space-y-5 disabled:opacity-60">
        <legend className="sr-only">{ar ? "تجربة بيانات شركة وهمية" : "Fictional company form demo"}</legend>
        <Button type="button" variant="outline" onClick={() => {
          // Explicit user choice fills fictional values only. There is no storage,
          // transport or hidden success; acknowledgement must still be checked.
          const form = formRef.current; if (!form) return; form.reset();
          for (const [name, value] of Object.entries({ company: "Fictional HAQ QA organization", industry: "Synthetic services", contact: "Fictional QA contact", email: "qa@example.invalid", volume: "11-50", concern: "Fictional portfolio assessment for a local demonstration only." })) {
            const input = form.elements.namedItem(name); if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement) input.value = value;
          }
          const category = form.querySelector<HTMLInputElement>('input[name="categories"][value="employment"]'); if (category) category.checked = true;
          setOutcome(null);
        }}>{ar ? "تعبئة مثال خيالي" : "Fill a fictional example"}</Button>
        <h3 className="font-semibold">{ar ? "نطاق المحفظة وجهة التواصل" : "Portfolio scope and contact preference"}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {([['company',150],['industry',100],['contact',100],['email',254],['phone',30]] as const).map(([name, maxLength]) => <div key={name}><label htmlFor={`inquiry-${name}`} className="mb-2 block text-sm font-medium">{label(name)}</label><Input {...common(name)} type={name === "email" ? "email" : name === "phone" ? "tel" : "text"} autoComplete="off" maxLength={maxLength} required={name !== "phone"}/>{error(name)}</div>)}
          <div><label htmlFor="inquiry-volume" className="mb-2 block text-sm font-medium">{label("volume")}</label><select {...common("volume")} className={selectClass} defaultValue=""><option value="">{ar ? "اختر" : "Choose"}</option>{["1-10","11-50","51-200","200+"].map(v => <option key={v} value={v}>{v}</option>)}</select>{error("volume")}</div>
          <div><label htmlFor="inquiry-service" className="mb-2 block text-sm font-medium">{label("service")}</label><select {...common("service")} className={selectClass} defaultValue="assessment"><option value="assessment">{ar ? "تقييم محفظة العقود" : "Portfolio assessment"}</option><option value="monitoring">{ar ? "متابعة الأثر التشريعي" : "Legislative impact monitoring"}</option><option value="review">{ar ? "مراجعة قانونية مهنية" : "Professional legal review"}</option></select>{error("service")}</div>
          <div><label htmlFor="inquiry-preferredContact" className="mb-2 block text-sm font-medium">{label("preferredContact")}</label><select {...common("preferredContact")} className={selectClass} defaultValue="email"><option value="email">{ar ? "البريد" : "Email"}</option><option value="phone">{ar ? "الهاتف" : "Phone"}</option></select></div>
        </div>
        <fieldset id="inquiry-categories" aria-describedby={invalid("categories") ? "inquiry-status" : undefined}><legend className="mb-2 text-sm font-medium">{label("categories")}</legend><div className="flex flex-wrap gap-4">{categories.map(([value,a,en]) => <label key={value} className="flex items-center gap-2 text-sm"><input type="checkbox" name="categories" value={value} className="accent-gold"/>{ar ? a : en}</label>)}</div>{error("categories")}</fieldset>
        <div><label htmlFor="inquiry-concern" className="mb-2 block text-sm font-medium">{label("concern")}</label><Textarea {...common("concern")} maxLength={1000}/>{error("concern")}</div>
        <label className="flex items-start gap-3 text-sm"><input {...common("demoConsent")} type="checkbox" className="mt-1 accent-gold"/>{ar ? "أستخدم بيانات وهمية وأفهم أن هذا تحقق محلي لا يرسل طلباً ولا يرتب خدمة أو تواصلاً." : "I am using fictional data and understand that this local check sends no inquiry and creates no service or contact arrangement."}</label>{error("demoConsent")}
        <div className="flex flex-wrap gap-3"><Button type="submit">{ar ? "تحقق من بيانات التجربة فقط" : "Validate demo data only"}</Button><Button type="reset" variant="outline" onClick={() => setOutcome(null)}>{ar ? "مسح بيانات التجربة" : "Clear demo data"}</Button></div>
      </fieldset>
      <div id="inquiry-status" ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className="text-sm">
        {outcome?.status === "validated_locally" ? (ar ? "اجتازت البيانات التحقق المحلي فقط. لم يُرسل طلب ولم تُحفظ البيانات ولن يتم التواصل معك." : "Local validation passed only. No inquiry was sent, no data was saved and no contact will occur.") : outcome?.status === "invalid" ? <><p>{ar ? "تعذر التحقق. صحح الحقول التالية؛ لم يُرسل شيء." : "Validation failed. Check the following fields; nothing was sent."}</p><ul className="mt-2 list-disc ps-5">{outcome.fields.map(f => <li key={f}><a className="underline" href={`#inquiry-${f}`}>{fields[f as keyof typeof fields]?.[ar ? 0 : 1] || (ar ? "النموذج" : "Form")}</a></li>)}</ul></> : null}
      </div>
    </form>
  </section>;
}
