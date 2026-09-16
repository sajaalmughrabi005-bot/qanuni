"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CaseRecord } from "@/types";
import { formatDate } from "@/lib/utils";

const priorityVariant: Record<CaseRecord["priority"], "low" | "medium" | "high"> = {
  low: "low",
  medium: "medium",
  high: "high",
  urgent: "high",
};

export function CaseList({ cases }: { cases: CaseRecord[] }) {
  const t = useTranslations("lawyer.cases");
  const tStatus = useTranslations("lawyer.cases.columns");
  const tPriority = useTranslations("lawyer.cases.priority");
  const locale = useLocale();

  return (
    <div className="space-y-2.5">
      {cases.map((c) => (
        <Link key={c.id} href={`/lawyer/cases/${c.id}`}>
          <Card className="transition hover:shadow-md">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-foreground-muted">{c.clientName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{tStatus(c.status)}</Badge>
                <Badge variant={priorityVariant[c.priority]}>{tPriority(c.priority)}</Badge>
                <span className="text-foreground-muted">
                  {t("lastActivity")}: {formatDate(c.updatedAt, locale)}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
