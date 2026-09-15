"use client";

import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/shared/risk-badge";
import { Analysis } from "@/types";
import { cn } from "@/lib/utils";

const levelToPercent = { low: 30, medium: 62, high: 90 };
const levelToColor = { low: "bg-risk-low", medium: "bg-risk-medium", high: "bg-risk-high" };

export function RiskOverview({ analysis }: { analysis: Analysis }) {
  const t = useTranslations("citizen.results");
  const tCategory = useTranslations("common.riskCategory");
  const locale = useLocale();

  return (
    <div className="space-y-5">
      <Card className="bg-navy text-white">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-white/70">{t("riskOverview")}</p>
          <RiskBadge level={analysis.overallRisk} className="text-sm" />
          <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/15">
            <div
              className={cn("h-full transition-all", levelToColor[analysis.overallRisk])}
              style={{ width: `${levelToPercent[analysis.overallRisk]}%` }}
            />
          </div>
          <p className="text-xs text-white/50">{t("riskOverviewDesc")}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {analysis.riskCategories.map((cat) => (
          <Card key={cat.category}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{tCategory(cat.category)}</p>
                <RiskBadge level={cat.level} />
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <div className={cn("h-full", levelToColor[cat.level])} style={{ width: `${levelToPercent[cat.level]}%` }} />
              </div>
              <p className="mt-2 text-xs text-foreground-muted">
                {locale === "ar" ? cat.reasonAr : cat.reasonEn}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
