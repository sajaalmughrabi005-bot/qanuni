"use client";

import { useTranslations } from "next-intl";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function LocaleNotFound() {
  const t = useTranslations("common.errors");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-foreground-muted">
        <FileQuestion className="h-7 w-7" />
      </span>
      <div>
        <h1 className="text-xl font-semibold">{t("notFoundTitle")}</h1>
        <p className="mt-1 max-w-sm text-sm text-foreground-muted">{t("notFoundDesc")}</p>
      </div>
      <Button asChild variant="gold">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </div>
  );
}
