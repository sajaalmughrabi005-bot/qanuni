"use client";

import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { FileSearch, CalendarDays, MapPin, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { RiskBadge } from "@/components/shared/risk-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useSession } from "@/lib/auth/use-session";
import { lawyers } from "@/lib/mock-data";
import { initials, formatDate, formatDateTime } from "@/lib/utils";

export default function CitizenCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("citizen.cases");
  const tStatus = useTranslations("citizen.cases.status");
  const tCaseDetail = useTranslations("lawyer.caseDetail");
  const tAppointments = useTranslations("citizen.appointments");
  const locale = useLocale();
  const { session } = useSession();
  const ar = locale === "ar";

  const cases = useAppStore((s) => s.cases);
  const allClauses = useAppStore((s) => s.clauses);
  const allAppointments = useAppStore((s) => s.appointments);

  const item = cases.find((c) => c.id === params.id && c.clientId === session?.userId);

  if (!item) {
    return <EmptyState icon={FileSearch} title={t("empty")} className="mx-auto mt-16 max-w-lg" />;
  }

  const lawyer = lawyers.find((l) => l.id === item.lawyerId);
  const relevantClauses = allClauses.filter((c) => item.relevantClauseIds.includes(c.id));
  const relatedAppointments = allAppointments
    .filter((a) => a.caseId === item.id)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{item.title}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{formatDate(item.updatedAt, locale)}</p>
        </div>
        <Badge variant="outline" className="w-fit shrink-0">
          {tStatus(item.status)}
        </Badge>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm text-foreground-muted">{ar ? item.summaryAr : item.summaryEn}</p>
          {(ar ? item.keyDatesAr : item.keyDatesEn).length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground-muted">{tCaseDetail("importantDates")}</p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {(ar ? item.keyDatesAr : item.keyDatesEn).map((d, i) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </div>
          )}
          {(ar ? item.questionsAr : item.questionsEn).length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground-muted">{tCaseDetail("questionsForReview")}</p>
              <ul className="mt-1 space-y-0.5 text-sm text-foreground-muted">
                {(ar ? item.questionsAr : item.questionsEn).map((q, i) => (
                  <li key={i}>• {q}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {lawyer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("yourLawyer")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/lawyers/${lawyer.id}`}
              className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-surface-muted"
            >
              <Avatar className="h-11 w-11">
                <AvatarFallback>{initials(lawyer.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gold">{lawyer.fullName}</p>
                <p className="flex items-center gap-1 text-xs text-foreground-muted">
                  <MapPin className="h-3 w-3" />
                  {lawyer.city}
                </p>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium">
                <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                {lawyer.rating}
              </span>
            </Link>
          </CardContent>
        </Card>
      )}

      {relevantClauses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tCaseDetail("relevantClauses")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {relevantClauses.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-2.5 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-foreground-muted">#{c.clauseNumber}</span>
                  <RiskBadge level={c.riskLevel} />
                </div>
                {ar ? c.clauseTextAr : c.clauseTextEn}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {relatedAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-gold" />
              {tAppointments("title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {relatedAppointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span className="font-medium">{a.title}</span>
                <span className="text-foreground-muted">{formatDateTime(a.startTime, locale)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
