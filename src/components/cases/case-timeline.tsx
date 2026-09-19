"use client";

import { useLocale, useTranslations } from "next-intl";
import { Circle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { CaseEvent } from "@/types";

/**
 * Read-only audit timeline. Events are written by the database (triggers /
 * RPCs) with server timestamps — users cannot create or edit them.
 */
export function CaseTimeline({ events }: { events: CaseEvent[] }) {
  const t = useTranslations("cases.timeline");
  const tStatus = useTranslations("cases.status");
  const tReason = useTranslations("cases.rejectionReason");
  const locale = useLocale();

  if (events.length === 0) return <p className="text-sm text-foreground-muted">{t("empty")}</p>;

  const label = (e: CaseEvent) => {
    const m = e.metadata || {};
    switch (e.eventType) {
      case "status_changed":
        return t("status_changed", { to: tStatus(String(m.to) as "active") });
      case "rejected":
        return t("rejected", { reason: m.reason_code ? tReason(String(m.reason_code) as "other") : "—" });
      case "document_uploaded":
        return t("document_uploaded", { file_name: String(m.file_name ?? "") });
      default:
        return t(e.eventType as "viewed");
    }
  };

  return (
    <ol className="relative space-y-4 border-s border-border ps-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <Circle className="absolute -start-[1.72rem] top-1 h-3 w-3 fill-gold text-gold" />
          <p className="text-sm font-medium">{label(e)}</p>
          <p className="text-xs text-foreground-muted">
            {formatDateTime(e.createdAt, locale)} · {t(`by.${e.actorRole}` as "by.client")}
          </p>
        </li>
      ))}
    </ol>
  );
}
