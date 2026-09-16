"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  FileSearch,
  MessageCircleQuestion,
  Search,
  FileText,
  Briefcase,
  CalendarDays,
  Bell,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { formatDateTime } from "@/lib/utils";

export default function CitizenDashboardPage() {
  const t = useTranslations("citizen.dashboard");
  const tCases = useTranslations("citizen.cases.status");
  const tCasesSection = useTranslations("citizen.cases");
  const tAppointments = useTranslations("citizen.appointments");
  const locale = useLocale();
  const { session, profile } = useSession();

  const allDocuments = useAppStore((s) => s.documents);
  const allCases = useAppStore((s) => s.cases);
  const allAppointments = useAppStore((s) => s.appointments);
  const allNotifications = useAppStore((s) => s.notifications);

  const documents = allDocuments.filter((d) => d.userId === session?.userId);
  const cases = allCases.filter((c) => c.clientId === session?.userId);
  const appointments = allAppointments.filter(
    (a) => a.clientId === session?.userId && new Date(a.startTime) > new Date()
  );
  const notifications = allNotifications.filter((n) => n.userId === session?.userId && !n.read);

  const actions = [
    { href: "/citizen/analyze/new", label: t("analyzeDocument"), icon: FileSearch },
    { href: "/citizen/ask", label: t("describeProblem"), icon: MessageCircleQuestion },
    { href: "/lawyers", label: t("findLawyer"), icon: Search },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("welcome", { name: profile?.fullName.split(" ")[0] || "" })}</h1>
        <p className="mt-1 text-foreground-muted">{t("subtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {actions.map((a) => (
          <Button key={a.href} asChild variant="outline" size="lg" className="h-auto justify-start gap-3 py-4">
            <Link href={a.href}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold">
                <a.icon className="h-4.5 w-4.5" />
              </span>
              <span className="text-start">{a.label}</span>
            </Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label={t("statDocuments")} value={documents.length} href="/citizen/documents" />
        <StatCard icon={Briefcase} label={t("statCases")} value={cases.length} href="/citizen/cases" />
        <StatCard icon={CalendarDays} label={t("statAppointments")} value={appointments.length} href="/citizen/appointments" />
        <StatCard icon={Bell} label={t("statNotifications")} value={notifications.length} accent="gold" href="/citizen/notifications" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{tCasesSection("title")}</CardTitle>
            <Link href="/citizen/cases" className="text-sm text-gold hover:underline">
              <ArrowUpRight className="inline h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {cases.length === 0 && <p className="text-sm text-foreground-muted">{tCasesSection("empty")}</p>}
            {cases.slice(0, 4).map((c) => (
              <Link
                key={c.id}
                href={`/citizen/cases/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-border p-3 text-sm hover:bg-surface-muted"
              >
                <span className="font-medium">{c.title}</span>
                <Badge variant="outline">{tCases(c.status)}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{tAppointments("title")}</CardTitle>
            <Link href="/citizen/appointments" className="text-sm text-gold hover:underline">
              <ArrowUpRight className="inline h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointments.length === 0 && (
              <p className="text-sm text-foreground-muted">{tAppointments("empty")}</p>
            )}
            {appointments.slice(0, 4).map((a) => (
              <Link
                key={a.id}
                href={a.caseId ? `/citizen/cases/${a.caseId}` : "/citizen/appointments"}
                className="flex items-center justify-between rounded-xl border border-border p-3 text-sm hover:bg-surface-muted"
              >
                <span className="font-medium">{a.title}</span>
                <span className="text-foreground-muted">{formatDateTime(a.startTime, locale)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
