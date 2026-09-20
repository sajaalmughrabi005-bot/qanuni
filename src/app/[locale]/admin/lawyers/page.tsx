"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminLawyers } from "@/lib/data/hooks";
import { initials } from "@/lib/utils";
import { useGovernorateLabel } from "@/components/shared/governorate-select";
import type { VerificationStatus } from "@/types";

const FILTERS: (VerificationStatus | "all")[] = ["all", "pending", "more_info_requested", "approved", "rejected"];

export default function AdminLawyersPage() {
  const t = useTranslations("admin.nav");
  const tAdmin = useTranslations("admin.lawyers");
  const tVerify = useTranslations("lawyer.verification");
  const tSpec = useTranslations("marketplace.specialties");
  const { data: lawyers } = useAdminLawyers();
  const cityLabel = useGovernorateLabel();
  const [filter, setFilter] = useState<VerificationStatus | "all">("all");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lawyers.filter((l) => (filter === "all" || l.verificationStatus === filter) && (!q || l.fullName.toLowerCase().includes(q)));
  }, [lawyers, filter, query]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("lawyers")}</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tAdmin("search")} className="max-w-xs" />
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? tAdmin("all") : tVerify(`status.${f}`)} (
            {f === "all" ? lawyers.length : lawyers.filter((l) => l.verificationStatus === f).length})
          </Button>
        ))}
      </div>

      {shown.length === 0 && <p className="text-sm text-foreground-muted">{tAdmin("empty")}</p>}
      <div className="space-y-3">
        {shown.map((l) => {
          const approved = l.verificationStatus === "approved";
          const needsReview = l.verificationStatus === "pending" || l.verificationStatus === "more_info_requested";
          return (
            <Card key={l.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <Avatar>
                  {l.avatarUrl && <AvatarImage src={l.avatarUrl} alt={l.fullName} />}
                  <AvatarFallback>{initials(l.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{l.fullName}</p>
                  <p className="text-xs text-foreground-muted">
                    {cityLabel(l.city) || "—"} · {l.specialties.map((s) => tSpec(s)).join(", ") || "—"}
                  </p>
                </div>
                {approved && !l.acceptingNewCases && <Badge variant="subtle">{tAdmin("notAccepting")}</Badge>}
                <Badge variant={approved ? "gold" : l.verificationStatus === "rejected" ? "high" : "subtle"}>
                  {tVerify(`status.${l.verificationStatus}`)}
                </Badge>
                {needsReview && (
                  <Button asChild size="sm" variant="gold">
                    <Link href="/admin/verification">{tAdmin("review")}</Link>
                  </Button>
                )}
                {approved && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/lawyers/${l.id}`}>{tAdmin("publicProfile")}</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
