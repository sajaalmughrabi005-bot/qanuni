"use client";

import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { LawyerCard } from "@/components/shared/lawyer-card";
import { useAppStore } from "@/lib/store/app-store";
import { useLawyersWithOverrides } from "@/lib/auth/use-lawyer";

export default function SavedLawyersPage() {
  const t = useTranslations("citizen.lawyers");
  const savedLawyerIds = useAppStore((s) => s.savedLawyerIds);
  const lawyers = useLawyersWithOverrides();
  const saved = lawyers.filter((l) => savedLawyerIds.includes(l.id));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {saved.length === 0 ? (
        <EmptyState icon={Heart} title={t("empty")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((l) => (
            <LawyerCard key={l.id} lawyer={l} />
          ))}
        </div>
      )}
    </div>
  );
}
