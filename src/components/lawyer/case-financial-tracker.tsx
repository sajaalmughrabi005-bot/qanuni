"use client";

import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Check, BellRing } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";
import { CaseRecord, LegalStage } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";

const STAGES: LegalStage[] = ["initial_review", "negotiation", "legal_notice", "in_court", "closed"];

export function CaseFinancialTracker({ item }: { item: CaseRecord }) {
  const t = useTranslations("lawyer.caseDetail");
  const locale = useLocale();
  const updateCase = useAppStore((s) => s.updateCase);
  const addNotification = useAppStore((s) => s.addNotification);

  const currentStage = item.legalStage || "initial_review";
  const currentIndex = STAGES.indexOf(currentStage);
  const totalFees = item.totalFees || 0;
  const paymentsReceived = item.paymentsReceived || 0;
  const remaining = Math.max(totalFees - paymentsReceived, 0);

  const sendReminder = () => {
    addNotification({
      userId: item.clientId,
      type: "system",
      titleAr: "تذكير بدفع الأتعاب",
      titleEn: "Payment reminder",
      bodyAr: `تذكير بدفع المبلغ المتبقي (${remaining} دينار) لقضية "${item.title}"`,
      bodyEn: `Reminder to pay the remaining balance (${remaining} JOD) for case "${item.title}"`,
      read: false,
      isDemo: true,
      href: "/citizen/cases",
    });
    toast.success(t("paymentReminderSent"));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("legalStage")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1">
          {STAGES.map((stage, i) => (
            <button
              key={stage}
              type="button"
              onClick={() => updateCase(item.id, { legalStage: stage })}
              className="group flex flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  i < currentIndex
                    ? "bg-risk-low text-white"
                    : i === currentIndex
                      ? "bg-gold text-navy"
                      : "bg-surface-muted text-foreground-muted group-hover:bg-border"
                )}
              >
                {i < currentIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={cn("text-center text-[11px] leading-tight", i === currentIndex ? "font-semibold text-foreground" : "text-foreground-muted")}>
                {t(`stages.${stage}`)}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full bg-gold transition-all"
            style={{ width: `${(currentIndex / (STAGES.length - 1)) * 100}%` }}
          />
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-3 text-sm font-medium">{t("financialTracker")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("totalFees")}</Label>
              <Input
                type="number"
                value={totalFees}
                onChange={(e) => updateCase(item.id, { totalFees: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("paymentsReceived")}</Label>
              <Input
                type="number"
                value={paymentsReceived}
                onChange={(e) => updateCase(item.id, { paymentsReceived: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-muted p-3">
            <div>
              <p className="text-xs text-foreground-muted">{t("remainingBalance")}</p>
              <p className="text-lg font-semibold">{formatCurrency(remaining, locale)}</p>
            </div>
            <Button size="sm" variant="gold" onClick={sendReminder} disabled={remaining <= 0}>
              <BellRing className="h-3.5 w-3.5" />
              {t("sendPaymentReminder")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
