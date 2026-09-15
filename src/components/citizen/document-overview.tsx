"use client";

import { useTranslations, useLocale } from "next-intl";
import { FileText, Users, CalendarClock, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LegalDocument } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";

export function DocumentOverview({ document }: { document: LegalDocument }) {
  const t = useTranslations("citizen.results");
  const tTypes = useTranslations("citizen.upload.types");
  const locale = useLocale();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy/5 text-navy">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">{document.fileName}</p>
            <p className="text-sm text-foreground-muted">{tTypes(document.documentType)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {document.parties && (
            <div>
              <p className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <Users className="h-3.5 w-3.5" />
                {t("parties")}
              </p>
              <ul className="mt-1.5 space-y-0.5 text-sm">
                {document.parties.map((p) => (
                  <li key={p.name}>{p.name}</li>
                ))}
              </ul>
            </div>
          )}
          {document.effectiveDate && (
            <div>
              <p className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <CalendarClock className="h-3.5 w-3.5" />
                {t("effectiveDate")}
              </p>
              <p className="mt-1.5 text-sm">
                {formatDate(document.effectiveDate, locale)}
                {document.durationMonths ? ` · ${document.durationMonths} ${locale === "ar" ? "شهراً" : "months"}` : ""}
              </p>
            </div>
          )}
          {document.keyAmounts && document.keyAmounts.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <Wallet className="h-3.5 w-3.5" />
                {t("keyAmounts")}
              </p>
              <ul className="mt-1.5 space-y-0.5 text-sm">
                {document.keyAmounts.map((a) => (
                  <li key={a.labelEn}>
                    {locale === "ar" ? a.labelAr : a.labelEn}: {formatCurrency(a.amount, locale)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
