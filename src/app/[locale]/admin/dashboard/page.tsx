"use client";

import { useTranslations, useLocale } from "next-intl";
import { Users, Briefcase, FileText, Sparkles, CalendarCheck, ShieldCheck, Flag, Activity } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Link, useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatCard } from "@/components/shared/stat-card";
import { AiStatusIndicator } from "@/components/shared/ai-status-indicator";
import { useAdminStats, useAdminLawyers, useSystemEvents } from "@/lib/data/hooks";
import { formatDateTime, initials } from "@/lib/utils";
import type { CaseStatus } from "@/types";

const COLORS = ["#b68a35", "#0f1c30", "#1f7a4d", "#b8791a", "#b3312c", "#5b6773", "#0ea5e9", "#8b5cf6"];

const STATUS_ORDER: CaseStatus[] = ["requested", "accepted", "active", "waiting_for_client", "waiting_for_lawyer", "resolved", "closed", "rejected"];
const STATUS_COLORS: Record<CaseStatus, string> = {
  requested: "#b68a35",
  accepted: "#1f7a4d",
  active: "#0f1c30",
  waiting_for_client: "#b8791a",
  waiting_for_lawyer: "#0ea5e9",
  resolved: "#8b5cf6",
  closed: "#5b6773",
  rejected: "#b3312c",
};

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");
  const tStatus = useTranslations("cases.status");
  const tSpec = useTranslations("marketplace.specialties");
  const locale = useLocale();
  const router = useRouter();

  const { stats } = useAdminStats();
  const { data: allLawyers } = useAdminLawyers();
  const { data: events } = useSystemEvents();

  const byStatus = stats?.cases_by_status ?? {};
  const casesByStatus = STATUS_ORDER.map((status) => ({ status, label: tStatus(status), count: byStatus[status] ?? 0 }));
  const totalCases = casesByStatus.reduce((n, c) => n + c.count, 0);
  const activeCases = totalCases - (byStatus.closed ?? 0) - (byStatus.rejected ?? 0) - (byStatus.requested ?? 0);
  const casesByCategory = Object.entries(stats?.cases_by_category ?? {}).map(([category, count]) => ({
    name: tSpec(category as "rental"),
    value: count,
  }));
  const topLawyers = allLawyers
    .filter((l) => l.verificationStatus === "approved")
    .sort((a, b) => b.completedCases - a.completedCases)
    .slice(0, 5);
  const recentErrors = events.filter((e) => e.severity !== "info").slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-foreground-muted">{t("subtitle")}</p>
        </div>
        <AiStatusIndicator />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label={t("totalCitizens")} value={stats?.citizens ?? 0} />
        <StatCard icon={Briefcase} label={t("registeredLawyers")} value={stats?.lawyers_approved ?? 0} accent="gold" />
        <StatCard icon={ShieldCheck} label={t("pendingVerification")} value={stats?.lawyers_pending ?? 0} accent="gold" href="/admin/verification" />
        <StatCard icon={Flag} label={t("openReports")} value={stats?.open_reports ?? 0} href="/admin/reports" />
        <StatCard icon={Briefcase} label={t("activeCases")} value={activeCases} href="/admin/cases" />
        <StatCard icon={FileText} label={t("documentsAnalyzed")} value={stats?.documents ?? 0} />
        <StatCard icon={CalendarCheck} label={t("consultations")} value={stats?.appointments ?? 0} />
        <StatCard icon={Sparkles} label={t("aiAnalyses")} value={stats?.analyses ?? 0} accent="gold" />
      </div>

      <div id="analytics" className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("activityOverTime")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.weekly ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Area type="monotone" dataKey="analyses" stroke="#b68a35" fill="#b68a35" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="requests" stroke="#0f1c30" fill="#0f1c30" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("casesByStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={casesByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={(data: { payload?: { status?: CaseStatus } }) =>
                    data?.payload?.status && router.push(`/admin/cases?status=${data.payload.status}`)
                  }
                >
                  {casesByStatus.map((d) => (
                    <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("casesByCategory")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {casesByCategory.length === 0 ? (
              <p className="text-sm text-foreground-muted">{t("noData")}</p>
            ) : (
              <div className="flex h-full items-center gap-4">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie data={casesByCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {casesByCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="flex-1 space-y-1.5 text-xs">
                  {casesByCategory.map((d, i) => (
                    <li key={d.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="truncate text-foreground-muted">{d.name}</span>
                      <span className="ms-auto font-medium">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("topLawyers")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topLawyers.length === 0 && <p className="text-sm text-foreground-muted">{t("noData")}</p>}
            {topLawyers.map((l) => (
              <Link key={l.id} href={`/lawyers/${l.id}`} className="flex items-center gap-3 rounded-lg p-1 transition hover:bg-surface-muted">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{initials(l.fullName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gold">{l.fullName}</p>
                  <p className="text-xs text-foreground-muted">{l.city}</p>
                </div>
                <Badge variant="gold">{l.completedCases}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Activity className="h-4.5 w-4.5 text-gold" />
          <CardTitle className="text-base">{t("systemHealth")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-foreground-muted">{t("aiProvider")}:</span>
            <AiStatusIndicator />
          </div>
          <p className="text-sm font-medium">{t("recentErrors")}</p>
          {recentErrors.length === 0 ? (
            <p className="text-sm text-foreground-muted">{t("noErrors")}</p>
          ) : (
            <ul className="space-y-2">
              {recentErrors.map((e) => (
                <li key={e.id} className="flex flex-wrap items-start gap-2 rounded-lg border border-border p-2.5 text-xs">
                  <Badge variant={e.severity === "error" ? "high" : "medium"}>{e.kind}</Badge>
                  <span className="min-w-0 flex-1 break-words">{e.message}</span>
                  <span className="text-foreground-muted">{formatDateTime(e.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
