"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Briefcase } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { CaseStatusBadge } from "@/components/cases/status-badge";
import { useCases } from "@/lib/data/hooks";
import { useLawyerDirectory } from "@/lib/auth/use-lawyer";
import { formatDate } from "@/lib/utils";
import type { CaseRecord, CaseStatus } from "@/types";

type Group = "all" | "pending" | "accepted" | "active" | "resolved" | "rejected";

const GROUPS: Record<Exclude<Group, "all">, CaseStatus[]> = {
  pending: ["requested"],
  accepted: ["accepted"],
  active: ["active", "waiting_for_client", "waiting_for_lawyer"],
  resolved: ["resolved", "closed"],
  rejected: ["rejected"],
};

export default function CitizenCasesPage() {
  const t = useTranslations("citizen.cases");
  const tCases = useTranslations("cases");
  const locale = useLocale();
  const router = useRouter();
  const { data: cases } = useCases();
  const { lawyers } = useLawyerDirectory();
  const [group, setGroup] = useState<Group>("all");

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: cases.length };
    (Object.keys(GROUPS) as Exclude<Group, "all">[]).forEach((g) => {
      out[g] = cases.filter((c) => GROUPS[g].includes(c.status)).length;
    });
    return out;
  }, [cases]);

  const shown: CaseRecord[] = group === "all" ? cases : cases.filter((c) => GROUPS[group].includes(c.status));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <Tabs value={group} onValueChange={(v) => setGroup(v as Group)}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="all">
            {tCases("list.all")} ({counts.all})
          </TabsTrigger>
          {(Object.keys(GROUPS) as Exclude<Group, "all">[]).map((g) => (
            <TabsTrigger key={g} value={g}>
              {tCases(`list.${g}`)} ({counts[g]})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {shown.length === 0 ? (
        <EmptyState icon={Briefcase} title={cases.length === 0 ? t("empty") : tCases("list.empty")} description={cases.length === 0 ? t("emptyDesc") : undefined} />
      ) : (
        <div className="space-y-4">
          {shown.map((c) => {
            const lawyer = lawyers.find((l) => l.id === c.lawyerId);
            return (
              <Card key={c.id} className="cursor-pointer transition hover:shadow-md">
                <CardContent
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => router.push(`/citizen/cases/${c.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground-muted">{c.requestDescription || (locale === "ar" ? c.summaryAr : c.summaryEn)}</p>
                    <p className="mt-2 text-xs text-foreground-muted">
                      {lawyer && (
                        <Link
                          href={`/lawyers/${lawyer.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-gold hover:underline"
                        >
                          {lawyer.fullName}
                        </Link>
                      )}{" "}
                      · {formatDate(c.updatedAt, locale)}
                    </p>
                    <p className="mt-2 text-xs">{tCases(`citizenLine.${c.status}`)}</p>
                  </div>
                  <CaseStatusBadge status={c.status} className="w-fit shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
