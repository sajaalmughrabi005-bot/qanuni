"use client";

import { useTranslations, useLocale } from "next-intl";
import { ListChecks, UserCheck, CalendarClock, Wallet, XCircle, AlertTriangle, MessageCircleQuestion } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Analysis } from "@/types";

function Section({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: typeof ListChecks;
  title: string;
  items: string[];
  tone?: "warning";
}) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2.5 space-y-0 pb-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone === "warning" ? "bg-risk-medium-bg text-risk-medium" : "bg-navy/5 text-navy"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1.5 text-sm text-foreground-muted">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function CaseUnderstanding({ analysis }: { analysis: Analysis }) {
  const t = useTranslations("citizen.results");
  const locale = useLocale();
  const ar = locale === "ar";

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground-muted">{ar ? analysis.summaryAr : analysis.summaryEn}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Section icon={ListChecks} title={t("yourObligations")} items={ar ? analysis.yourObligationsAr : analysis.yourObligationsEn} />
        <Section icon={UserCheck} title={t("otherPartyObligations")} items={ar ? analysis.otherPartyObligationsAr : analysis.otherPartyObligationsEn} />
        <Section icon={CalendarClock} title={t("deadlines")} items={ar ? analysis.deadlinesAr : analysis.deadlinesEn} />
        <Section icon={Wallet} title={t("paymentTerms")} items={ar ? analysis.paymentTermsAr : analysis.paymentTermsEn} />
        <Section icon={XCircle} title={t("cancellationTerms")} items={ar ? analysis.cancellationTermsAr : analysis.cancellationTermsEn} />
        <Section icon={AlertTriangle} title={t("concerns")} items={ar ? analysis.concernsAr : analysis.concernsEn} tone="warning" />
      </div>
      <Section
        icon={MessageCircleQuestion}
        title={t("questionsForLawyer")}
        items={ar ? analysis.questionsForLawyerAr : analysis.questionsForLawyerEn}
      />
    </div>
  );
}
