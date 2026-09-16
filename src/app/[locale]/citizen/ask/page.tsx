"use client";

import { useTranslations } from "next-intl";
import { FileSearch } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AskTheLawPanel } from "@/components/citizen/ask-the-law-panel";

export default function DescribeProblemPage() {
  const t = useTranslations("citizen.describeProblem");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-foreground-muted">{t("subtitle")}</p>
      </div>

      <AskTheLawPanel documentId="general" clauses={[]} />

      <Link
        href="/citizen/analyze/new"
        className="flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-foreground-muted transition hover:bg-surface-muted"
      >
        <FileSearch className="h-4 w-4 shrink-0 text-gold" />
        {t("preferDocument")}
      </Link>
    </div>
  );
}
