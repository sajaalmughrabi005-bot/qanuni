"use client";

import { useTranslations, useLocale } from "next-intl";
import { MessageCircleQuestion } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/shared/risk-badge";
import { DocumentClause, LegalSource } from "@/types";
import { Link } from "@/i18n/navigation";

export function ClauseDetailDialog({
  clause,
  source,
  open,
  onOpenChange,
}: {
  clause: DocumentClause | null;
  source?: LegalSource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("citizen.results");
  const tCategory = useTranslations("common.riskCategory");
  const tDisclaimer = useTranslations("common.disclaimer");
  const locale = useLocale();

  if (!clause) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>
              {locale === "ar" ? "البند" : "Clause"} {clause.clauseNumber}
            </DialogTitle>
            <RiskBadge level={clause.riskLevel} />
          </div>
          <DialogDescription>{tCategory(clause.category)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <blockquote className="rounded-xl border-s-4 border-gold bg-surface-muted px-4 py-3 text-sm italic">
            {clause.sourceText || (locale === "ar" ? clause.clauseTextAr : clause.clauseTextEn)}
          </blockquote>

          <div>
            <p className="text-sm font-medium">{tDisclaimer("aiGenerated")}</p>
            <p className="mt-1 text-sm text-foreground-muted">
              {locale === "ar" ? clause.explanationAr : clause.explanationEn}
            </p>
          </div>

          {(clause.concernAr || clause.concernEn) && (
            <div className="rounded-xl bg-risk-high-bg px-4 py-3">
              <p className="text-sm font-medium text-risk-high">{t("concerns")}</p>
              <p className="mt-1 text-sm text-risk-high/90">
                {locale === "ar" ? clause.concernAr : clause.concernEn}
              </p>
            </div>
          )}


          {source && (
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <Badge variant={source.verified && !source.isDemoPlaceholder ? "gold" : "subtle"}>
                  {source.verified && !source.isDemoPlaceholder ? tDisclaimer("verifiedSource") : tDisclaimer("demoPlaceholder")}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-medium">{locale === "ar" ? source.titleAr : source.titleEn}</p>
              <p className="text-xs text-foreground-muted">{source.article}</p>
              <p className="mt-1.5 text-sm text-foreground-muted">
                {source.excerptAr}
              </p>
              <p className="mt-2 text-xs">{locale === "ar" ? "تم التحقق من نص المصدر فقط. التفسير والتعديلات اللاحقة وانطباق الحكم على حالتك تتطلب مراجعة محامٍ." : "Source text checked only. Interpretation, later amendments and applicability to your case require lawyer review."}</p>
              {source.sourceUrl && <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-gold underline">{locale === "ar" ? "المصدر الأصلي" : "View source"}</a>}
            </div>
          )}

          <Button asChild variant="gold" className="w-full">
            <Link href="/lawyers">
              <MessageCircleQuestion className="h-4 w-4" />
              {t("askLawyerCta")}
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
