"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Check, Inbox, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { RejectDialog } from "@/components/cases/reject-dialog";
import { useCases } from "@/lib/data/hooks";
import { respondToCase } from "@/lib/data/actions";
import { errorKey } from "@/lib/data/error-key";
import { formatDateTime } from "@/lib/utils";
import type { RejectionReason } from "@/types";

/** Incoming case requests waiting for the lawyer's decision. */
export default function LawyerRequestsPage() {
  const t = useTranslations("cases");
  const tSpec = useTranslations("marketplace.specialties");
  const locale = useLocale();
  const { data: cases, refetch } = useCases();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const requests = cases
    .filter((c) => c.status === "requested")
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  const accept = async (id: string) => {
    setBusy(true);
    const res = await respondToCase(id, true);
    setBusy(false);
    if (!res.ok) return toast.error(t(`errors.${errorKey(res.error)}` as "errors.unknown"));
    toast.success(t("requests.accepted"));
    refetch();
  };

  const reject = async (reason: RejectionReason, note: string) => {
    if (!rejectId) return;
    setBusy(true);
    const res = await respondToCase(rejectId, false, reason, note);
    setBusy(false);
    if (!res.ok) return toast.error(t(`errors.${errorKey(res.error)}` as "errors.unknown"));
    toast.success(t("requests.rejected"));
    setRejectId(null);
    refetch();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("requests.title")}</h1>
        <p className="mt-1 text-foreground-muted">{t("requests.subtitle")}</p>
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={Inbox} title={t("requests.empty")} />
      ) : (
        <div className="space-y-3">
          {requests.map((c) => (
            <Card key={c.id} className={c.viewedByLawyerAt ? "" : "border-gold/40"}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-foreground-muted">
                      {c.clientName} · {tSpec(c.category)} · {t("requests.received", { date: formatDateTime(c.requestedAt, locale) })}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {!c.viewedByLawyerAt && <Badge variant="gold">{t("requests.unopened")}</Badge>}
                    <Badge variant={c.urgency === "urgent" || c.urgency === "high" ? "high" : "outline"}>{t(`urgency.${c.urgency}`)}</Badge>
                  </div>
                </div>
                <p className="line-clamp-3 text-sm text-foreground-muted">{c.requestDescription || c.summaryAr}</p>
                {c.documentIds.length > 0 && (
                  <p className="text-xs text-foreground-muted">
                    {t("sections.documents")}: {c.documentIds.length}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/lawyer/cases/${c.id}`}>{t("actions.openCase")}</Link>
                  </Button>
                  <Button size="sm" variant="gold" disabled={busy} onClick={() => accept(c.id)}>
                    <Check className="h-3.5 w-3.5" />
                    {t("actions.accept")}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejectId(c.id)}>
                    <X className="h-3.5 w-3.5" />
                    {t("actions.reject")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RejectDialog open={rejectId !== null} onOpenChange={(o) => !o && setRejectId(null)} busy={busy} onConfirm={reject} />
    </div>
  );
}
