"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { FileSearch, CalendarDays, MapPin, Star, Flag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { RiskBadge } from "@/components/shared/risk-badge";
import { CaseStatusBadge } from "@/components/cases/status-badge";
import { CaseTimeline } from "@/components/cases/case-timeline";
import { CaseMessages } from "@/components/cases/case-messages";
import { CaseDocumentsPanel } from "@/components/cases/case-documents-panel";
import { CaseStatusActions } from "@/components/cases/status-actions";
import { ReportDialog } from "@/components/cases/report-dialog";
import { WriteReviewForm } from "@/components/citizen/write-review-form";
import { useCases, useAppointments, useClausesByIds, useCaseEvents } from "@/lib/data/hooks";
import { useLawyer } from "@/lib/auth/use-lawyer";
import { useGovernorateLabel } from "@/components/shared/governorate-select";
import { useSession } from "@/lib/auth/use-session";
import { initials, formatDate, formatDateTime } from "@/lib/utils";

export default function CitizenCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("citizen.cases");
  const tCase = useTranslations("cases");
  const tCaseDetail = useTranslations("lawyer.caseDetail");
  const tAppointments = useTranslations("citizen.appointments");
  const locale = useLocale();
  const ar = locale === "ar";
  const { session } = useSession();
  const [reportOpen, setReportOpen] = useState(false);
  const cityLabel = useGovernorateLabel();

  const { data: cases, loading, refetch } = useCases();
  const { data: allAppointments } = useAppointments();
  const item = cases.find((c) => c.id === params.id);
  const { data: relevantClauses } = useClausesByIds(item?.relevantClauseIds || []);
  const { data: events, refetch: refetchEvents } = useCaseEvents(item?.id);
  const { lawyer } = useLawyer(item?.lawyerId);

  if (loading) return null;
  if (!item || !session) {
    return <EmptyState icon={FileSearch} title={t("empty")} className="mx-auto mt-16 max-w-lg" />;
  }

  const relatedAppointments = allAppointments
    .filter((a) => a.caseId === item.id)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const refreshAll = () => {
    refetch();
    refetchEvents();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{item.title}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{formatDate(item.updatedAt, locale)}</p>
        </div>
        <CaseStatusBadge status={item.status} className="w-fit shrink-0" />
      </div>

      <Card className="border-gold/30 bg-gold/5">
        <CardContent className="space-y-3 p-5">
          <p className="font-medium">{tCase(`citizenLine.${item.status}`)}</p>
          <p className="text-sm text-foreground-muted">{tCase(`nextAction.citizen.${item.status}`)}</p>
          <div className="flex flex-wrap items-center gap-2">
            <CaseStatusActions caseId={item.id} status={item.status} role="client" onDone={refreshAll} />
            {item.status === "rejected" && (
              <Button asChild size="sm" variant="gold">
                <Link href="/lawyers">{t("findAnother")}</Link>
              </Button>
            )}
          </div>
          {item.status === "rejected" && item.rejectionReason && (
            <div className="rounded-lg bg-risk-high-bg p-3 text-sm text-risk-high">
              <p className="font-medium">{tCase("rejection.clientView", { reason: tCase(`rejectionReason.${item.rejectionReason}`) })}</p>
              {item.rejectionNote && <p className="mt-1">{item.rejectionNote}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tCase("sections.request")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="whitespace-pre-line text-foreground-muted">{item.requestDescription || (ar ? item.summaryAr : item.summaryEn)}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{tCase(`urgency.${item.urgency}`)}</Badge>
            <Badge variant="subtle">{formatDateTime(item.requestedAt, locale)}</Badge>
          </div>
          {item.requestMessage && (
            <p className="rounded-lg bg-surface-muted p-3 text-foreground-muted">{item.requestMessage}</p>
          )}
          {(ar ? item.keyDatesAr : item.keyDatesEn).length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground-muted">{tCaseDetail("importantDates")}</p>
              <ul className="mt-1 space-y-0.5">
                {(ar ? item.keyDatesAr : item.keyDatesEn).map((d, i) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </div>
          )}
          {(ar ? item.questionsAr : item.questionsEn).length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground-muted">{tCaseDetail("questionsForReview")}</p>
              <ul className="mt-1 space-y-0.5 text-foreground-muted">
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
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{tCase("sections.lawyer")}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setReportOpen(true)}>
              <Flag className="h-3.5 w-3.5" />
              {tCase("actions.report")}
            </Button>
          </CardHeader>
          <CardContent>
            <Link
              href={`/lawyers/${lawyer.id}`}
              className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-surface-muted"
            >
              <Avatar className="h-11 w-11">
                {lawyer.avatarUrl && <AvatarImage src={lawyer.avatarUrl} alt={lawyer.fullName} />}
                <AvatarFallback>{initials(lawyer.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gold">{lawyer.fullName}</p>
                <p className="flex items-center gap-1 text-xs text-foreground-muted">
                  <MapPin className="h-3 w-3" />
                  {cityLabel(lawyer.city)}
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

      {item.status !== "rejected" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tCase("sections.messages")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CaseMessages caseId={item.id} status={item.status} role="client" myUserId={session.userId} onActivity={refreshAll} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tCase("sections.documents")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CaseDocumentsPanel caseId={item.id} status={item.status} role="client" onActivity={refreshAll} />
            </CardContent>
          </Card>
        </>
      )}

      {(item.status === "resolved" || item.status === "closed") && item.lawyerId && (
        <WriteReviewForm lawyerId={item.lawyerId} />
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tCase("sections.timeline")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CaseTimeline events={events} />
        </CardContent>
      </Card>

      <ReportDialog targetType="case" targetId={item.id} open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
}
