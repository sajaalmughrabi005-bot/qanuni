"use client";

import { useTranslations, useLocale } from "next-intl";
import { Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { lawyers } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function CitizenCasesPage() {
  const t = useTranslations("citizen.cases");
  const tStatus = useTranslations("citizen.cases.status");
  const locale = useLocale();
  const { session } = useSession();
  const allCases = useAppStore((s) => s.cases);
  const cases = allCases.filter((c) => c.clientId === session?.userId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {cases.length === 0 ? (
        <EmptyState icon={Briefcase} title={t("empty")} description={t("emptyDesc")} />
      ) : (
        <div className="space-y-4">
          {cases.map((c) => {
            const lawyer = lawyers.find((l) => l.id === c.lawyerId);
            return (
              <Card key={c.id}>
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="mt-1 text-sm text-foreground-muted">
                      {locale === "ar" ? c.summaryAr : c.summaryEn}
                    </p>
                    <p className="mt-2 text-xs text-foreground-muted">
                      {lawyer?.fullName} · {formatDate(c.updatedAt, locale)}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit shrink-0">
                    {tStatus(c.status)}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
