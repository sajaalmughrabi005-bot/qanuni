"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/shared/risk-badge";
import { ClauseDetailDialog } from "./clause-detail-dialog";
import { DocumentClause } from "@/types";
import { curatedSources as legalSources } from "@/lib/legal/corpus";
import { cn } from "@/lib/utils";
import { verifiedHighlights } from "@/lib/documents/highlights";

const borderByRisk = {
  unknown: "border-s-foreground-muted",
  low: "border-s-risk-low",
  medium: "border-s-risk-medium",
  high: "border-s-risk-high",
};

export function ClauseMap({ clauses, documentText, detailed = false }: { clauses: DocumentClause[]; documentText?: string; detailed?: boolean }) {
  const t = useTranslations("citizen.results");
  const locale = useLocale();
  const [selected, setSelected] = useState<DocumentClause | null>(null);
  const exactIds = new Set(verifiedHighlights(documentText || "", clauses).map(c => c.id));
  const ar = locale === "ar";

  return (
    <div>
      <p className="mb-3 text-sm text-foreground-muted">{t("clauseMapDesc")}</p>
      <div className="space-y-3">
        {clauses.map((clause) => (
          <Card
            key={clause.id}
            className={cn("cursor-pointer border-s-4 transition hover:shadow-md", borderByRisk[clause.riskLevel])}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if(e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(clause); } }}
            onClick={() => setSelected(clause)}
          >
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-xs text-foreground-muted">
                  {locale === "ar" ? "البند" : "Clause"} {clause.clauseNumber}
                </p>
                {detailed && exactIds.has(clause.id) ? <blockquote className="my-3 whitespace-pre-wrap border-s-2 border-border ps-3 text-sm"><span className="mb-1 block text-xs text-foreground-muted">{ar ? "النص الأصلي" : "Original text"}</span>{clause.sourceText}</blockquote> : <p className="mt-1 line-clamp-2 text-sm">{ar ? clause.clauseTextAr : clause.clauseTextEn}</p>}
                {detailed && <>
                  <p className="mt-3 text-sm">{ar ? clause.explanationAr : clause.explanationEn}</p>
                  {(ar ? clause.concernAr : clause.concernEn) && <p className="mt-2 text-sm text-foreground-muted"><span className="font-medium">{ar ? "لماذا يحتاج الانتباه: " : "Why it matters: "}</span>{ar ? clause.concernAr : clause.concernEn}</p>}
                  <p className="mt-3 text-xs text-foreground-muted">{ar ? "تفسير بالذكاء الاصطناعي. افتح البند لمراجعة التفاصيل والمصدر المتاح؛ ناقش الأثر مع محامٍ قبل اتخاذ قرار." : "AI interpretation. Open the clause for details and any available source; discuss its impact with a lawyer before deciding."}</p>
                </>}
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
