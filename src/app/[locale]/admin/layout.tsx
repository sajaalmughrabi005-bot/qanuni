"use client";

import { useTranslations } from "next-intl";
import { LayoutDashboard, Users, Briefcase, FileText, ShieldCheck, BarChart3 } from "lucide-react";
import { RoleGuard } from "@/components/providers/role-guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin.nav");

  const navItems = [
    { href: "/admin/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/admin/users", label: t("users"), icon: Users },
    { href: "/admin/lawyers", label: t("lawyers"), icon: Briefcase },
    { href: "/admin/cases", label: t("cases"), icon: FileText },
    { href: "/admin/verification", label: t("verification"), icon: ShieldCheck },
    { href: "/admin/dashboard#analytics", label: t("analytics"), icon: BarChart3 },
  ];

  return (
    <RoleGuard role="admin">
      <DashboardShell navItems={navItems}>{children}</DashboardShell>
    </RoleGuard>
  );
}
