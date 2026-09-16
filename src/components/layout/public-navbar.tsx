"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Scale, Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useSession } from "@/lib/auth/use-session";

export function PublicNavbar() {
  const t = useTranslations("common");
  const { session } = useSession();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/#how-it-works", label: t("nav.howItWorks") },
    { href: "/lawyers", label: t("nav.findLawyer") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-gold">
            <Scale className="h-4 w-4" />
          </span>
          <span className="text-lg">{t("brand.name")}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-foreground-muted hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <LanguageSwitcher />
          {session ? (
            <Button asChild size="sm">
              <Link href={`/${session.role}/dashboard`}>{t("nav.dashboard")}</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">{t("nav.login")}</Link>
            </Button>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-surface px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher className="justify-start px-0" />
            </div>
            {session ? (
              <Button asChild size="sm">
                <Link href={`/${session.role}/dashboard`}>{t("nav.dashboard")}</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
