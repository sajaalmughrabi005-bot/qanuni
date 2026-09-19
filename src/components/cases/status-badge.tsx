"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { CaseStatus } from "@/types";

const VARIANT: Record<CaseStatus, "gold" | "low" | "default" | "medium" | "outline" | "subtle" | "high"> = {
  requested: "gold",
  accepted: "low",
  active: "default",
  waiting_for_client: "medium",
  waiting_for_lawyer: "medium",
  resolved: "low",
  closed: "subtle",
  rejected: "high",
};

export function CaseStatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  const t = useTranslations("cases.status");
  return (
    <Badge variant={VARIANT[status]} className={className}>
      {t(status)}
    </Badge>
  );
}
