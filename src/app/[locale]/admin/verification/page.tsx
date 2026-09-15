"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function AdminVerificationPage() {
  const t = useTranslations("admin.verification");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <EmptyState icon={ShieldCheck} title={t("empty")} />
    </div>
  );
}
