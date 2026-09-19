"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { transitionCase } from "@/lib/data/actions";
import { errorKey } from "@/lib/data/error-key";
import { allowedTransitions } from "@/lib/cases/lifecycle";
import type { CaseStatus } from "@/types";

/**
 * Only offers transitions the lifecycle allows for this role. The database
 * re-checks every transition (transition_case), so this is convenience, not
 * the security boundary.
 */
export function CaseStatusActions({
  caseId,
  status,
  role,
  onDone,
}: {
  caseId: string;
  status: CaseStatus;
  role: "lawyer" | "client";
  onDone: () => void;
}) {
  const t = useTranslations("cases");
  const [busy, setBusy] = useState<CaseStatus | null>(null);
  const options = allowedTransitions(role, status);
  if (options.length === 0) return null;

  const label = (to: CaseStatus) => {
    if (role === "client") return to === "closed" ? t("actions.confirmClose") : t("actions.iResponded");
    if (status === "accepted" && to === "active") return t("actions.start");
    if (status === "resolved" && to === "active") return t("actions.reopen");
    if (to === "closed") return t("actions.close");
    if (to === "resolved") return t("actions.resolve");
    return t(`transitionTo.${to}` as "transitionTo.active");
  };

  const go = async (to: CaseStatus) => {
    setBusy(to);
    const res = await transitionCase(caseId, to, role);
    setBusy(null);
    if (!res.ok) {
      toast.error(t(`errors.${errorKey(res.error)}` as "errors.unknown"));
      return;
    }
    onDone();
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((to) => (
        <Button
          key={to}
          size="sm"
          variant={to === "resolved" || to === "closed" ? "gold" : "outline"}
          disabled={busy !== null}
          onClick={() => go(to)}
        >
          {label(to)}
        </Button>
      ))}
    </div>
  );
}
