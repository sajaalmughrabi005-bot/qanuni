"use client";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/shared/risk-badge";
import type { Analysis } from "@/types";
export function RiskOverview({ analysis }: { analysis: Analysis }) {
 const t=useTranslations("citizen.results");const category=useTranslations("common.riskCategory");const locale=useLocale();
 return <div className="space-y-5"><Card className="bg-navy text-white"><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
 <p className="text-sm">{locale==="ar"?"مؤشرات مخاطر تعاقدية — تفسير غير متحقق قانونياً":"Contract risk indicators — legally unverified interpretation"}</p>
 <RiskBadge level={analysis.overallRisk}/><p className="text-xs text-white/70">{t("riskOverviewDesc")}</p>
 </CardContent></Card><div className="grid gap-3 sm:grid-cols-2">{analysis.riskCategories.map(cat=><Card key={cat.category}><CardContent className="p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{category(cat.category)}</p><RiskBadge level={cat.level}/></div><p className="mt-2 whitespace-pre-line text-xs text-foreground-muted">{locale==="ar"?cat.reasonAr:cat.reasonEn}</p></CardContent></Card>)}</div></div>;
}
