"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common.errors");

  useEffect(() => {
    // Logged client-side only; no sensitive data (documents, tokens, secrets)
    // ever reaches this boundary — see the AI/auth actions, which keep that
    // server-side and never throw raw provider errors to the client.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-risk-high-bg text-risk-high">
        <TriangleAlert className="h-7 w-7" />
      </span>
      <div>
        <h1 className="text-xl font-semibold">{t("errorTitle")}</h1>
        <p className="mt-1 max-w-sm text-sm text-foreground-muted">{t("errorDesc")}</p>
      </div>
      <div className="flex gap-3">
        <Button variant="gold" onClick={() => reset()}>
          {t("tryAgain")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </div>
  );
}
