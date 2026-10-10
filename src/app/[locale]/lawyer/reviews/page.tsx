"use client";
import { useCallback } from "react";
import { useLocale } from "next-intl";
import { useMyLawyer } from "@/lib/auth/use-lawyer";
import { useSession } from "@/lib/auth/use-session";
import { useDemoStore } from "@/lib/demo/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapReview } from "@/lib/supabase/mappers";
import { useScopedQuery } from "@/lib/data/use-scoped-query";
import { DataLoadError } from "@/components/shared/data-load-error";
import { formatDate } from "@/lib/utils";
import type { Review } from "@/types";

export default function LawyerReviewsPage() {
  const ar = useLocale() === "ar", locale = ar ? "ar" : "en";
  const { lawyer } = useMyLawyer();
  const { session, isDemo } = useSession();
  const demoReviews = useDemoStore(s => s.reviews);
  const read = useCallback(async () => {
    const client = createSupabaseBrowserClient();
    if (!client || !lawyer) throw new Error("reviews_unavailable");
    const { data, error } = await client.from("reviews").select("*").eq("lawyer_id", lawyer.id).order("created_at", { ascending: false });
    if (error) throw new Error("reviews_unavailable");
    return (data || []).map(mapReview);
  }, [lawyer]);
  const real = useScopedQuery<Review[]>(`${session?.userId}:${lawyer?.id}`, isDemo || !lawyer ? null : read, []);
  const reviews = isDemo ? demoReviews.filter(r => r.lawyerId === lawyer?.id) : real.data;
  return <section className="mx-auto max-w-3xl space-y-5">
    <h1 className="text-2xl font-semibold">{ar ? "تقييمات المواطنين" : "Citizen reviews"}</h1>
    <p className="text-sm text-foreground-muted">{ar ? "تعرض هذه الصفحة التقييمات الموجودة فقط. تقديم التقييم يبقى ضمن مسار المواطن وشروط أهليته الحالية؛ لا يستطيع المحامي إنشاء تقييم لنفسه هنا." : "This page displays existing reviews only. Submission remains in the citizen workflow under its current eligibility rules; lawyers cannot create reviews for themselves here."}</p>
    {!lawyer ? <p role="status">{ar ? "بيانات المحامي غير متاحة." : "Lawyer information is unavailable."}</p> : real.error && !isDemo ? <DataLoadError onRetry={real.refetch}/> : real.loading && !isDemo ? <p role="status">{ar ? "جارٍ تحميل التقييمات…" : "Loading reviews…"}</p> : reviews.length === 0 ? <p>{ar ? "لا توجد تقييمات متاحة." : "No reviews are available."}</p> : reviews.map(r => <article key={r.id} className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-medium">{r.clientName}</h2><p className="text-sm">{ar ? "التقييم" : "Rating"}: <bdi>{r.rating} / 5</bdi></p></div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm">{r.review}</p><p className="mt-3 text-xs text-foreground-muted">{formatDate(r.createdAt, locale)}{isDemo ? (ar ? " · تقييم تجريبي" : " · Demo review") : ""}</p>
    </article>)}
  </section>;
}
