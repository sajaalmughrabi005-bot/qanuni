"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CaseStatusBadge } from "@/components/cases/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useAdminCases } from "@/lib/data/hooks";
import { formatDate } from "@/lib/utils";
import type { CaseStatus } from "@/types";

const STATUSES: CaseStatus[] = ["requested", "accepted", "active", "waiting_for_client", "waiting_for_lawyer", "resolved", "closed", "rejected"];

/**
 * Oversight view. Admins see case *metadata* only (title, parties, status,
 * dates) — never messages, notes, documents or the citizen's description.
 */
function AdminCasesInner() {
  const t = useTranslations("admin.cases");
  const tNav = useTranslations("admin.nav");
  const tStatus = useTranslations("cases.status");
  const tSpec = useTranslations("marketplace.specialties");
  const locale = useLocale();
  const params = useSearchParams();
  const [status, setStatus] = useState<CaseStatus | "all">((params.get("status") as CaseStatus | null) ?? "all");
  const [query, setQuery] = useState("");
  const { data: allCases } = useAdminCases();

  const cases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCases.filter(
      (c) =>
        (status === "all" || c.status === status) &&
        (!q || [c.title, c.clientName, c.lawyerName ?? ""].some((v) => v.toLowerCase().includes(q)))
    );
  }, [allCases, status, query]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{tNav("cases")}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground-muted">
          <ShieldAlert className="h-3.5 w-3.5" />
          {t("privacy")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} className="max-w-xs" />
        <Button size="sm" variant={status === "all" ? "default" : "outline"} onClick={() => setStatus("all")}>
          {t("all")} ({allCases.length})
        </Button>
        {STATUSES.map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
            {tStatus(s)} ({allCases.filter((c) => c.status === s).length})
          </Button>
        ))}
      </div>

      {cases.length === 0 ? (
        <EmptyState icon={ShieldAlert} title={t("empty")} />
      ) : (
        <div className="space-y-2.5">
          {cases.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-foreground-muted">
                    {c.clientName} → {c.lawyerName ?? t("unassigned")} · {tSpec(c.category as "rental")} · {formatDate(c.updatedAt, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.isManual && <Badge variant="subtle">{t("manual")}</Badge>}
                  <CaseStatusBadge status={c.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCasesPage() {
  return (
    <Suspense>
      <AdminCasesInner />
    </Suspense>
  );
}
