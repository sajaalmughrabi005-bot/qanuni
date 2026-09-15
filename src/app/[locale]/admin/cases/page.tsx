"use client";

import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store/app-store";
import { formatDate } from "@/lib/utils";

export default function AdminCasesPage() {
  const t = useTranslations("admin.nav");
  const tCol = useTranslations("lawyer.cases.columns");
  const locale = useLocale();
  const cases = useAppStore((s) => s.cases);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("cases")}</h1>
      <div className="space-y-3">
        {cases.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-foreground-muted">
                  {c.clientName} · {formatDate(c.createdAt, locale)}
                </p>
              </div>
              <Badge variant="outline">{tCol(c.status)}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
