"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  CalendarDays,
  FileEdit,
  MessageSquare,
  Bell,
  UserCircle,
  Settings,
  Inbox,
  ShieldCheck,
  CreditCard,
  Star,
} from "lucide-react";
import { RoleGuard } from "@/components/providers/role-guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function LawyerLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("lawyer.nav");
  const ar = useLocale() === "ar";

  const navItems = [
    { href: "/lawyer/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/lawyer/requests", label: t("requests"), icon: Inbox },
    { href: "/lawyer/messages", label: t("messages"), icon: MessageSquare },
    { href: "/lawyer/profile", label: t("profile"), icon: UserCircle },
    { href: "/lawyer/subscription", label: ar ? "الاشتراك — معاينة" : "Subscription — preview", icon: CreditCard },
    { href: "/lawyer/reviews", label: ar ? "التقييمات" : "Reviews", icon: Star },
  ];
  const secondaryNavItems = [
    { href: "/lawyer/cases", label: t("cases"), icon: Briefcase },
    { href: "/lawyer/clients", label: t("clients"), icon: Users },
    { href: "/lawyer/documents", label: t("documents"), icon: FileText },
    { href: "/lawyer/calendar", label: t("calendar"), icon: CalendarDays },
    { href: "/lawyer/drafts", label: t("drafts"), icon: FileEdit },
    { href: "/lawyer/notifications", label: t("notifications"), icon: Bell },
    { href: "/lawyer/verification", label: t("verification"), icon: ShieldCheck },
    { href: "/lawyer/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <RoleGuard role="lawyer">
      <DashboardShell navItems={navItems} secondaryNavItems={secondaryNavItems}>{children}</DashboardShell>
    </RoleGuard>
  );
}
