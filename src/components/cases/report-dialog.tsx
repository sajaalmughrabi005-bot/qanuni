"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createReport } from "@/lib/data/actions";
import { errorKey } from "@/lib/data/error-key";
import { useSession } from "@/lib/auth/use-session";
import type { Report } from "@/types";

/** Files a report (dispute / misconduct) that only admins can read and triage. */
export function ReportDialog({
  targetType,
  targetId,
  open,
  onOpenChange,
}: {
  targetType: Report["targetType"];
  targetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("cases");
  const { session } = useSession();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!session || reason.trim().length < 3) return;
    setBusy(true);
    const res = await createReport({ reporterId: session.userId, targetType, targetId, reason: reason.trim(), details: details.trim() });
    setBusy(false);
    if (!res.ok) {
      toast.error(t(`errors.${errorKey(res.error)}` as "errors.unknown"));
      return;
    }
    toast.success(t("report.success"));
    setReason("");
    setDetails("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("report.title")}</DialogTitle>
        </DialogHeader>
        {!session ? (
          <p className="text-sm text-foreground-muted">{t("report.loginRequired")}</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("report.reasonLabel")}</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("report.reasonPlaceholder")} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("report.detailsLabel")}</Label>
              <Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={3000} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          {session && (
            <Button variant="gold" onClick={submit} disabled={busy || reason.trim().length < 3}>
              {t("report.submit")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
