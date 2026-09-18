"use client";

import { useTranslations, useLocale } from "next-intl";
import { Briefcase, FileText, CalendarDays, Clock, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { QuickActionsBar } from "@/components/lawyer/quick-actions-bar";
import { VoiceCommandWidget } from "@/components/lawyer/voice-command-widget";
import { useSession } from "@/lib/auth/use-session";
import { useAppointments, useCases } from "@/lib/data/hooks";
import { formatDateTime } from "@/lib/utils";

export default function LawyerDashboardPage() {
  const t = useTranslations("lawyer.dashboard");
  const tStatus = useTranslations("lawyer.cases.columns");
  const locale = useLocale();
  const { profile } = useSession();

  const { data: myCases } = useCases();
  const { data: allAppointments } = useAppointments();

  const newCases = myCases.filter((c) => c.status === "new");
  const activeCases = myCases.filter((c) => !["new", "closed"].includes(c.status));
  const upcoming = allAppointments
    .filter((a) => new Date(a.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("welcome", { name: profile?.fullName.split(" ").slice(-1)[0] || "" })}</h1>
        <p className="mt-1 text-foreground-muted">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-gold/30">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{t("newCases")}</CardTitle>
            <Link href="/lawyer/cases" className="text-sm text-gold hover:underline">
              <ArrowUpRight className="inline h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {newCases.length === 0 && <p className="text-sm text-foreground-muted">—</p>}
            {newCases.slice(0, 5).map((c) => (
              <Link key={c.id} href={`/lawyer/cases/${c.id}`} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm hover:bg-surface-muted">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-foreground-muted">{c.clientName}</p>
                </div>
                <Badge variant="outline">{tStatus(c.status)}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-gold/30">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{t("upcomingAppointments")}</CardTitle>
            <Link href="/lawyer/calendar" className="text-sm text-gold hover:underline">
              <ArrowUpRight className="inline h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && <p className="text-sm text-foreground-muted">—</p>}
            {upcoming.slice(0, 5).map((a) => (
              <Link
                key={a.id}
                href={a.caseId ? `/lawyer/cases/${a.caseId}` : "/lawyer/calendar"}
                className="flex items-center justify-between rounded-xl border border-border p-3 text-sm hover:bg-surface-muted"
              >
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-foreground-muted">{a.clientName}</p>
                </div>
                <span className="flex items-center gap-1 text-xs text-foreground-muted">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(a.startTime, locale)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Briefcase} label={t("newCases")} value={newCases.length} accent="gold" href="/lawyer/cases" />
        <StatCard icon={Briefcase} label={t("activeCases")} value={activeCases.length} href="/lawyer/cases" />
        <StatCard icon={CalendarDays} label={t("upcomingAppointments")} value={upcoming.length} href="/lawyer/calendar" />
        <StatCard icon={FileText} label={t("documentsToReview")} value={myCases.reduce((n, c) => n + c.documentIds.length, 0)} href="/lawyer/documents" />
      </div>

      <details className="group rounded-2xl border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-medium text-foreground-muted">
          {t("quickActions")}
          <span className="text-xs text-foreground-muted group-open:hidden">+</span>
          <span className="hidden text-xs text-foreground-muted group-open:inline">-</span>
        </summary>
        <div className="px-4 pb-4">
          <QuickActionsBar />
        </div>
      </details>

      <VoiceCommandWidget />
    </div>
  );
}
