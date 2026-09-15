"use client";

import { useTranslations } from "next-intl";
import {
  Users,
  Briefcase,
  FileText,
  Sparkles,
  CalendarCheck,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatCard } from "@/components/shared/stat-card";
import { useAppStore } from "@/lib/store/app-store";
import { lawyers } from "@/lib/mock-data";
import { initials } from "@/lib/utils";

const activityData = [
  { week: "W1", analyses: 18, consultations: 6 },
  { week: "W2", analyses: 26, consultations: 9 },
  { week: "W3", analyses: 31, consultations: 12 },
  { week: "W4", analyses: 22, consultations: 8 },
  { week: "W5", analyses: 40, consultations: 15 },
  { week: "W6", analyses: 47, consultations: 19 },
];

const COLORS = ["#b68a35", "#0f1c30", "#1f7a4d", "#b8791a", "#b3312c", "#5b6773"];

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");
  const tCol = useTranslations("lawyer.cases.columns");
  const tSpec = useTranslations("marketplace.specialties");

  const cases = useAppStore((s) => s.cases);
  const documents = useAppStore((s) => s.documents);
  const analyses = useAppStore((s) => s.analyses);
  const appointments = useAppStore((s) => s.appointments);

  const casesByStatus = ["new", "contacted", "reviewing", "in_progress", "court", "closed"].map((status) => ({
    status,
    label: tCol(status as "new"),
    count: cases.filter((c) => c.status === status).length,
  }));

  const categoryMap = new Map<string, number>();
  cases.forEach((c) => categoryMap.set(c.category, (categoryMap.get(c.category) || 0) + 1));
  const casesByCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
    name: tSpec(category as "rental"),
    value: count,
  }));

  const topLawyers = [...lawyers].sort((a, b) => b.completedCases - a.completedCases).slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-foreground-muted">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label={t("totalCitizens")} value="1,248" />
        <StatCard icon={Briefcase} label={t("registeredLawyers")} value={lawyers.length} accent="gold" />
        <StatCard icon={Briefcase} label={t("activeCases")} value={cases.filter((c) => c.status !== "closed").length} />
        <StatCard icon={FileText} label={t("documentsAnalyzed")} value={documents.length} />
        <StatCard icon={CalendarCheck} label={t("consultations")} value={appointments.length} />
        <StatCard icon={Sparkles} label={t("aiAnalyses")} value={analyses.length} accent="gold" />
      </div>

      <div id="analytics" className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("activityOverTime")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Area type="monotone" dataKey="analyses" stroke="#b68a35" fill="#b68a35" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="consultations" stroke="#0f1c30" fill="#0f1c30" fillOpacity={0.1} strokeWidth={2} />
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
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Bar dataKey="count" fill="#0f1c30" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("casesByCategory")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={casesByCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {casesByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("topLawyers")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topLawyers.map((l) => (
              <div key={l.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{initials(l.fullName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{l.fullName}</p>
                  <p className="text-xs text-foreground-muted">{l.city}</p>
                </div>
                <Badge variant="gold">{l.completedCases}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
