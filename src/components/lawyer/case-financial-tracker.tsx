"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Check, BellRing } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateCaseFields } from "@/lib/data/actions";
import { isDemoActive } from "@/lib/demo/mode";
import { sendPaymentReminderAction } from "@/lib/data/server-actions";
import { CaseRecord, LegalStage } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";
import { useDemoStore } from "@/lib/demo/store";

const STAGES: LegalStage[] = ["initial_review", "negotiation", "legal_notice", "in_court", "closed"];

export function CaseFinancialTracker({ item, onChanged }: { item: CaseRecord; onChanged?: () => void }) {
  return <FinancialEditor key={item.id} item={item} onChanged={onChanged}/>;
}

function FinancialEditor({ item, onChanged }: { item: CaseRecord; onChanged?: () => void }) {
  const t = useTranslations("lawyer.caseDetail");
  const locale = useLocale();

  const currentStage = item.legalStage || "initial_review";
  const currentIndex = STAGES.indexOf(currentStage);
  const [totalFeesInput, setTotalFeesInput] = useState(String(item.totalFees || 0));
  const [paymentsInput, setPaymentsInput] = useState(String(item.paymentsReceived || 0));
  const [reminding,setReminding]=useState(false);
  const totalFees = Number(totalFeesInput) || 0;
  const paymentsReceived = Number(paymentsInput) || 0;
  const remaining = Math.max(totalFees - paymentsReceived, 0);

  const setStage = async (stage: LegalStage) => {
    try {const result=await updateCaseFields(item.id, { legalStage: stage });if(!result.ok)throw new Error("save_failed");onChanged?.();}
    catch{toast.error(locale==="ar"?"تعذر حفظ التغيير":"Unable to save changes");}
  };

  const commitTotalFees = async () => {
    try {if(!Number.isFinite(Number(totalFeesInput))||Number(totalFeesInput)<0)throw new Error("invalid_amount");const result=await updateCaseFields(item.id, { totalFees });if(!result.ok)throw new Error("save_failed");onChanged?.();}
    catch{toast.error(locale==="ar"?"تعذر حفظ الأتعاب":"Unable to save fees");}
  };

  const commitPaymentsReceived = async () => {
    try {if(!Number.isFinite(Number(paymentsInput))||Number(paymentsInput)<0)throw new Error("invalid_amount");const result=await updateCaseFields(item.id, { paymentsReceived });if(!result.ok)throw new Error("save_failed");onChanged?.();}
    catch{toast.error(locale==="ar"?"تعذر حفظ الدفعات":"Unable to save payments");}
  };

  const sendReminder = async () => {
    if(reminding)return;
    setReminding(true);
    try {
    const result = isDemoActive()?{ok:useDemoStore.getState().sendPaymentReminder(item.id)}:await sendPaymentReminderAction(item.id, remaining, item.title);
    if (!result.ok) {
      toast.error(locale === "ar" ? "تعذر إرسال التذكير" : "Couldn't send the reminder");
      return;
    }
    toast.success(t("paymentReminderSent"));
    }catch{toast.error(locale === "ar" ? "تعذر إرسال التذكير" : "Couldn't send the reminder");}finally{setReminding(false);}
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
              onClick={() => setStage(stage)}
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
                value={totalFeesInput}
                onChange={(e) => setTotalFeesInput(e.target.value)}
                onBlur={commitTotalFees}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("paymentsReceived")}</Label>
              <Input
                type="number"
                value={paymentsInput}
                onChange={(e) => setPaymentsInput(e.target.value)}
                onBlur={commitPaymentsReceived}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-muted p-3">
            <div>
              <p className="text-xs text-foreground-muted">{t("remainingBalance")}</p>
              <p className="text-lg font-semibold">{formatCurrency(remaining, locale)}</p>
            </div>
            <Button size="sm" variant="gold" onClick={sendReminder} disabled={reminding || remaining <= 0}>
              <BellRing className="h-3.5 w-3.5" />
              {t("sendPaymentReminder")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
