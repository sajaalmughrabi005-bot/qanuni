"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { useAdminCases, useAdminLawyers, useAdminUsers, useReports } from "@/lib/data/hooks";
import { adminResolveReport } from "@/lib/data/actions";
import { errorKey } from "@/lib/data/error-key";
import { formatDateTime } from "@/lib/utils";
import type { Report } from "@/types";

type Decision = "reviewing" | "resolved" | "dismissed";

function ReportCard({ report, targetLabel, targetHref, reporter, onDone }: { report: Report; targetLabel: string; targetHref?: string; reporter: string; onDone: () => void }) {
  const t = useTranslations("admin.reports");
  const tCases = useTranslations("cases");
  const locale = useLocale();
  const [note, setNote] = useState(report.adminNote ?? "");
  const [busy, setBusy] = useState(false);
  const closed = report.status === "resolved" || report.status === "dismissed";

  const act = async (status: Decision) => {
    setBusy(true);
    const res = await adminResolveReport(report.id, status, note.trim() || undefined);
    setBusy(false);
    if (!res.ok) return toast.error(tCases(`errors.${errorKey(res.error)}` as "errors.unknown"));
    toast.success(t("saved"));
    onDone();
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={report.status === "open" ? "high" : report.status === "reviewing" ? "medium" : "subtle"}>{t(`status.${report.status}`)}</Badge>
          <Badge variant="outline">{t(`target.${report.targetType}`)}</Badge>
          {targetHref ? (
            <Link href={targetHref} className="text-sm font-medium text-gold hover:underline">
              {targetLabel}
            </Link>
          ) : (
            <span className="text-sm font-medium">{targetLabel}</span>
          )}
          <span className="ms-auto text-xs text-foreground-muted">{formatDateTime(report.createdAt, locale)}</span>
        </div>
        <p className="text-sm font-medium">{report.reason}</p>
        {report.details && <p className="whitespace-pre-line text-sm text-foreground-muted">{report.details}</p>}
        <p className="text-xs text-foreground-muted">
          {t("reporter")}: {reporter}
        </p>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} maxLength={1000} className="min-h-14" disabled={closed} />
        {!closed && (
          <div className="flex flex-wrap gap-2">
            {report.status === "open" && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act("reviewing")}>
                {t("markReviewing")}
              </Button>
            )}
            <Button size="sm" variant="gold" disabled={busy} onClick={() => act("resolved")}>
              {t("resolve")}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act("dismissed")}>
              {t("dismiss")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Reports/disputes filed by users. Admins triage them; they never see the private content of a reported case. */
export default function AdminReportsPage() {
  const t = useTranslations("admin.reports");
  const { data: reports, refetch } = useReports();
  const { data: users } = useAdminUsers();
  const { data: lawyers } = useAdminLawyers();
  const { data: cases } = useAdminCases();
  const [showClosed, setShowClosed] = useState(false);

  const shown = useMemo(
    () => reports.filter((r) => showClosed || r.status === "open" || r.status === "reviewing"),
    [reports, showClosed]
  );

  const describe = (r: Report): { label: string; href?: string } => {
    if (r.targetType === "lawyer") {
      const l = lawyers.find((x) => x.id === r.targetId);
      return { label: l?.fullName ?? r.targetId.slice(0, 8), href: l?.verificationStatus === "approved" ? `/lawyers/${l.id}` : undefined };
    }
    if (r.targetType === "case") {
      const c = cases.find((x) => x.id === r.targetId);
      return { label: c ? `${c.title} — ${c.clientName}` : r.targetId.slice(0, 8) };
    }
    const u = users.find((x) => x.id === r.targetId);
    return { label: u?.fullName ?? r.targetId.slice(0, 8) };
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-foreground-muted">{t("subtitle")}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowClosed((v) => !v)}>
          {showClosed ? t("hideClosed") : t("showClosed")}
        </Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={Flag} title={t("empty")} />
      ) : (
        <div className="space-y-3">
          {shown.map((r) => {
            const d = describe(r);
            const reporter = users.find((u) => u.id === r.reporterId)?.fullName ?? "—";
            return <ReportCard key={r.id} report={r} targetLabel={d.label} targetHref={d.href} reporter={reporter} onDone={refetch} />;
          })}
        </div>
      )}
    </div>
  );
}
