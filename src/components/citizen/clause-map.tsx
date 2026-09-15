"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/shared/risk-badge";
import { ClauseDetailDialog } from "./clause-detail-dialog";
import { DocumentClause } from "@/types";
import { legalSources } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const borderByRisk = {
  low: "border-s-risk-low",
  medium: "border-s-risk-medium",
  high: "border-s-risk-high",
};

export function ClauseMap({ clauses }: { clauses: DocumentClause[] }) {
  const t = useTranslations("citizen.results");
  const locale = useLocale();
  const [selected, setSelected] = useState<DocumentClause | null>(null);

  return (
    <div>
      <p className="mb-3 text-sm text-foreground-muted">{t("clauseMapDesc")}</p>
      <div className="space-y-3">
        {clauses.map((clause) => (
          <Card
            key={clause.id}
            className={cn("cursor-pointer border-s-4 transition hover:shadow-md", borderByRisk[clause.riskLevel])}
            onClick={() => setSelected(clause)}
          >
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-xs text-foreground-muted">
                  {locale === "ar" ? "البند" : "Clause"} {clause.clauseNumber}
                </p>
                <p className="mt-1 line-clamp-2 text-sm">
                  {locale === "ar" ? clause.clauseTextAr : clause.clauseTextEn}
                </p>
              </div>
              <RiskBadge level={clause.riskLevel} className="shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-4 text-xs text-foreground-muted">{t("riskDisclaimer")}</p>

      <ClauseDetailDialog
        clause={selected}
        source={legalSources.find((s) => s.id === selected?.legalSourceId)}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}
