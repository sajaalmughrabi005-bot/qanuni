"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common.language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const next = locale === "ar" ? "en" : "ar";

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => router.replace(pathname, { locale: next })}
      aria-label={t("switch")}
    >
      <Languages className="h-4 w-4" />
      <span>{next === "ar" ? "العربية" : "English"}</span>
    </Button>
  );
}
