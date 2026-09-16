"use client";

import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  Briefcase,
  Heart,
  CalendarDays,
  Bell,
  UserCircle,
} from "lucide-react";
import { RoleGuard } from "@/components/providers/role-guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("citizen.nav");
  const tProfile = useTranslations("common.profile");

  const navItems = [
    { href: "/citizen/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/citizen/documents", label: t("documents"), icon: FileText },
    { href: "/citizen/analyses", label: t("analyses"), icon: Sparkles },
    { href: "/citizen/cases", label: t("cases"), icon: Briefcase },
    { href: "/citizen/lawyers", label: t("lawyers"), icon: Heart },
    { href: "/citizen/appointments", label: t("appointments"), icon: CalendarDays },
    { href: "/citizen/notifications", label: t("notifications"), icon: Bell },
    { href: "/citizen/profile", label: tProfile("title"), icon: UserCircle },
  ];

  return (
    <RoleGuard role="citizen">
      <DashboardShell navItems={navItems}>{children}</DashboardShell>
    </RoleGuard>
  );
}
