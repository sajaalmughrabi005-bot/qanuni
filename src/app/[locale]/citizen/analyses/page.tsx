"use client";

import { useTranslations, useLocale } from "next-intl";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { RiskBadge } from "@/components/shared/risk-badge";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { formatDate } from "@/lib/utils";

export default function AnalysesPage() {
  const t = useTranslations("citizen.analyses");
  const locale = useLocale();
  const { session } = useSession();
  const allAnalyses = useAppStore((s) => s.analyses);
  const analyses = allAnalyses.filter((a) => a.userId === session?.userId);
  const documents = useAppStore((s) => s.documents);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {analyses.length === 0 ? (
        <EmptyState icon={Sparkles} title={t("empty")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {analyses.map((a) => {
            const doc = documents.find((d) => d.id === a.documentId);
            return (
              <Link key={a.id} href={`/citizen/analyze/${a.documentId}`}>
                <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{doc?.fileName || a.documentId}</p>
                      <RiskBadge level={a.overallRisk} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-foreground-muted">
                      {locale === "ar" ? a.summaryAr : a.summaryEn}
                    </p>
                    <p className="mt-3 text-xs text-foreground-muted">{formatDate(a.createdAt, locale)}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
