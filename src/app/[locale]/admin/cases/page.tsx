"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";
import { CaseRecord, CaseStatus } from "@/types";
import { formatDate, cn } from "@/lib/utils";

const columns: CaseStatus[] = ["new", "contacted", "reviewing", "in_progress", "court", "closed"];

const statusDot: Record<CaseStatus, string> = {
  new: "bg-gold",
  contacted: "bg-sky-500",
  reviewing: "bg-violet-500",
  in_progress: "bg-navy",
  court: "bg-risk-high",
  closed: "bg-foreground-muted",
};

const priorityVariant: Record<CaseRecord["priority"], "low" | "medium" | "high"> = {
  low: "low",
  medium: "medium",
  high: "high",
  urgent: "high",
};

function CaseCard({ item, tPriority }: { item: CaseRecord; tPriority: ReturnType<typeof useTranslations> }) {
  const locale = useLocale();
  return (
    <Card>
      <CardContent className="space-y-2 p-3.5">
        <p className="text-sm font-medium">{item.title}</p>
        <p className="text-xs text-foreground-muted">{item.clientName}</p>
        <div className="flex items-center justify-between text-[11px]">
          <Badge variant={priorityVariant[item.priority]} className="text-[10px]">
            {tPriority(item.priority)}
          </Badge>
          <span className="text-foreground-muted">{formatDate(item.updatedAt, locale)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminCasesInner() {
  const t = useTranslations("admin.nav");
  const tCol = useTranslations("lawyer.cases.columns");
  const tPriority = useTranslations("lawyer.cases.priority");
  const tCases = useTranslations("lawyer.cases");
  const locale = useLocale();
  const params = useSearchParams();
  const statusFilter = params.get("status") as CaseStatus | null;
  const allCases = useAppStore((s) => s.cases);
  const [view, setView] = useState<"list" | "kanban">(statusFilter ? "list" : "kanban");

  const cases = useMemo(
    () => (statusFilter ? allCases.filter((c) => c.status === statusFilter) : allCases),
    [allCases, statusFilter]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("cases")}</h1>
          {statusFilter && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground-muted">
              <span className={cn("h-2 w-2 rounded-full", statusDot[statusFilter])} />
              {tCol(statusFilter)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}>
            <LayoutGrid className="h-3.5 w-3.5" />
            {tCases("kanban")}
          </Button>
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}>
            <ListIcon className="h-3.5 w-3.5" />
            {tCases("list")}
          </Button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex flex-col gap-4">
          {columns.map((status) => {
            const items = cases.filter((c) => c.status === status);
            return (
              <div key={status} className="rounded-2xl bg-surface-muted/60 p-3">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={cn("h-2 w-2 rounded-full", statusDot[status])} />
                  <p className="text-sm font-semibold">{tCol(status)}</p>
                  <Badge variant="subtle">{items.length}</Badge>
                </div>
                {items.length === 0 ? (
                  <p className="px-1 text-sm text-foreground-muted">{tCases("empty")}</p>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <CaseCard key={item.id} item={item} tPriority={tPriority} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {cases.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-foreground-muted">
                    {c.clientName} · {formatDate(c.createdAt, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[c.status])} />
                    {tCol(c.status)}
                  </Badge>
                  <Badge variant={priorityVariant[c.priority]}>{tPriority(c.priority)}</Badge>
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
