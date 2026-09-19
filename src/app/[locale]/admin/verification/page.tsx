"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAdminLawyers } from "@/lib/data/hooks";
import { adminReviewLawyer } from "@/lib/data/actions";
import { errorKey } from "@/lib/data/error-key";
import { initials } from "@/lib/utils";
import type { Lawyer } from "@/types";

type Decision = "approve" | "reject" | "request_info";

function ReviewCard({ lawyer, onDone }: { lawyer: Lawyer; onDone: () => void }) {
  const t = useTranslations("admin.verification");
  const tVerify = useTranslations("lawyer.verification");
  const tCases = useTranslations("cases");
  const tSpec = useTranslations("marketplace.specialties");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const decide = async (decision: Decision) => {
    if (decision !== "approve" && !note.trim()) return toast.error(t("noteRequired"));
    setBusy(true);
    const res = await adminReviewLawyer(lawyer.id, decision, note.trim() || undefined);
    setBusy(false);
    if (!res.ok) return toast.error(tCases(`errors.${errorKey(res.error)}` as "errors.unknown"));
    toast.success(t(`done.${decision}`));
    setNote("");
    onDone();
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar>
            {lawyer.avatarUrl && <AvatarImage src={lawyer.avatarUrl} alt={lawyer.fullName} />}
            <AvatarFallback>{initials(lawyer.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{lawyer.fullName}</p>
            <p className="text-xs text-foreground-muted">
              {lawyer.specialties.map((s) => tSpec(s)).join(", ") || "—"} · {lawyer.city || "—"} · {lawyer.yearsExperience} {t("years")}
            </p>
          </div>
          <Badge variant="subtle">{tVerify(`status.${lawyer.verificationStatus}`)}</Badge>
        </div>

        <div className="grid gap-3 rounded-xl bg-surface-muted p-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-foreground-muted">{t("barNumber")}</p>
            <p className="font-medium" dir="ltr">
              {lawyer.barNumber || "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-foreground-muted">{t("info")}</p>
            <p className="whitespace-pre-line">{lawyer.verificationInfo || t("noInfo")}</p>
          </div>
          {lawyer.verificationAdminNote && (
            <div className="sm:col-span-2">
              <p className="text-xs text-foreground-muted">{t("previousNote")}</p>
              <p className="whitespace-pre-line">{lawyer.verificationAdminNote}</p>
            </div>
          )}
        </div>

        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} maxLength={1000} className="min-h-16" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="gold" disabled={busy} onClick={() => decide("approve")}>
            {t("approve")}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("request_info")}>
            {t("requestInfo")}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("reject")}>
            {t("reject")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminVerificationPage() {
  const t = useTranslations("admin.verification");
  const { data: lawyers, refetch } = useAdminLawyers();

  // Lawyers who are waiting on the admin. "More info requested" stays on the list of the lawyer until they respond.
  const queue = lawyers.filter((l) => l.verificationStatus === "pending");
  const waitingOnLawyer = lawyers.filter((l) => l.verificationStatus === "more_info_requested");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {queue.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t("empty")} />
      ) : (
        <div className="space-y-3">
          {queue.map((l) => (
            <ReviewCard key={l.id} lawyer={l} onDone={refetch} />
          ))}
        </div>
      )}

      {waitingOnLawyer.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">{t("waitingOnLawyer")}</h2>
          {waitingOnLawyer.map((l) => (
            <ReviewCard key={l.id} lawyer={l} onDone={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
