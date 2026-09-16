"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Scale, Menu, Bell, LogOut } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LucideIcon } from "lucide-react";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { initials, cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function DashboardShell({
  navItems,
  children,
}: {
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("common");
  const { profile, session } = useSession();
  const logout = useAppStore((s) => s.logout);
  const notifications = useAppStore((s) => s.notifications);
  const unread = session ? notifications.filter((n) => n.userId === session.userId && !n.read).length : 0;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2 bg-white px-5 py-5 font-semibold text-navy">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-gold">
          <Scale className="h-4 w-4" />
        </span>
        {t("brand.name")}
      </Link>
      <nav className="flex-1 space-y-1 px-3 pt-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active ? "bg-white/10 text-white font-medium" : "text-white/65 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("h-4 w-4", active ? "text-gold" : "text-gold/70")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/65 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4 text-gold/70" />
          {t("nav.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 bg-navy md:block">{SidebarContent}</aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-64 bg-navy">{SidebarContent}</div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button className="md:hidden" onClick={() => setOpen(true)} aria-label="menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link href={`/${session?.role}/notifications`} className="relative rounded-full p-2 hover:bg-surface-muted">
              <Bell className="h-4.5 w-4.5" />
              {unread > 0 && (
                <Badge variant="high" className="absolute -end-1 -top-1 h-4 min-w-4 justify-center rounded-full p-0 text-[10px]">
                  {unread}
                </Badge>
              )}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{profile ? initials(profile.fullName) : "?"}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2.5 py-1.5 text-sm">
                  <p className="font-medium">{profile?.fullName}</p>
                  <p className="text-xs text-foreground-muted">{profile?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-risk-high">
                  <LogOut className="h-4 w-4" />
                  {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
