import { useTranslations } from "next-intl";
import { Scale } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function PublicFooter() {
  const t = useTranslations("common");

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-gold">
                <Scale className="h-4 w-4" />
              </span>
              <span className="text-lg">{t("brand.name")}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-foreground-muted">{t("footer.description")}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">{t("footer.product")}</p>
            <ul className="mt-3 space-y-2 text-sm text-foreground-muted">
              <li><Link href="/login">{t("nav.forCitizens")}</Link></li>
              <li><Link href="/lawyers">{t("nav.findLawyer")}</Link></li>
              <li><Link href="/login">{t("nav.forLawyers")}</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">{t("footer.company")}</p>
            <ul className="mt-3 space-y-2 text-sm text-foreground-muted">
              <li>{t("footer.privacy")}</li>
              <li>{t("footer.terms")}</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs text-foreground-muted">
          © {new Date().getFullYear()} {t("brand.name")} — {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
