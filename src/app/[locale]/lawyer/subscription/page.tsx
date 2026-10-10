"use client";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function SubscriptionPreviewPage() {
  const ar = useLocale() === "ar";
  return <section className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-5 sm:p-7">
    <p className="text-sm text-foreground-muted">{ar ? "معاينة فقط" : "Preview only"}</p>
    <h1 className="mt-3 text-2xl font-semibold">{ar ? "اشتراك المحامي" : "Lawyer subscription"}</h1>
    <p role="note" className="mt-4 leading-relaxed">{ar ? "لا يوجد مصدر معتمد لحالة اشتراك مدفوع حالياً. لم يتم شراء أو تفعيل اشتراك من هذه الصفحة. الأسعار والدفع والفوترة غير مفعلة، ولا تتحكم هذه المعاينة بصلاحيات حسابك." : "An authoritative paid subscription status is not currently available. No subscription has been purchased or activated on this page. Pricing, payment and billing are unavailable; this preview does not control your account permissions."}</p>
    <p className="mt-4 text-sm text-foreground-muted">{ar ? "استخدم الطلبات والرسائل والملف الشخصي والتقييمات ضمن صلاحيات حسابك الحالية. أي اشتراك مستقبلي يحتاج خدمة دفع آمنة وشروطاً معتمدة." : "Use requests, messages, profile and reviews under your current account permissions. Any future subscription requires a secure payment service and approved terms."}</p>
    <Link className="mt-6 inline-block text-sm underline" href="/lawyer/requests">{ar ? "العودة إلى الطلبات" : "Back to requests"}</Link>
  </section>;
}
