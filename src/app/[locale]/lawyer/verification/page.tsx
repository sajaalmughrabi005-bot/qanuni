"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyLawyer } from "@/lib/auth/use-lawyer";
import { updateVerificationInfo } from "@/lib/data/actions";

/** Lawyer-facing verification state: the only place that describes the real review status. */
export default function LawyerVerificationPage() {
  const t = useTranslations("lawyer.verification");
  const { lawyer, refresh } = useMyLawyer();
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!lawyer) return null;

  const status = lawyer.verificationStatus;
  const value = info ?? lawyer.verificationInfo ?? "";
  const editable = status !== "approved";
  const Icon = status === "approved" ? ShieldCheck : status === "pending" ? Clock : ShieldAlert;
  const variant = status === "approved" ? "gold" : status === "rejected" ? "high" : "subtle";

  const submit = async () => {
    if (value.trim().length < 20) return toast.error(t("tooShort"));
    setSaving(true);
    const res = await updateVerificationInfo(value.trim());
    if (res.ok) await refresh();
    setSaving(false);
    if (!res.ok) return toast.error(t("failed"));
    setInfo(null);
    toast.success(t("saved"));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-foreground-muted">{t("subtitle")}</p>
      </div>

      <Card className={status === "approved" ? "border-gold/40" : undefined}>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-gold" />
            <Badge variant={variant}>{t(`status.${status}`)}</Badge>
          </div>
          <p className="text-sm text-foreground-muted">{t(`statusText.${status}`)}</p>
          {lawyer.verificationAdminNote && (status === "rejected" || status === "more_info_requested") && (
            <div className="rounded-lg bg-surface-muted p-3 text-sm">
              <p className="text-xs font-medium text-foreground-muted">{t("adminNote")}</p>
              <p className="mt-1 whitespace-pre-line">{lawyer.verificationAdminNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("infoLabel")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lawyer.barNumber && (
            <div className="text-sm">
              <p className="text-xs text-foreground-muted">{t("barNumber")}</p>
              <p className="mt-0.5 font-medium" dir="ltr">
                {lawyer.barNumber}
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{t("infoLabel")}</Label>
            <Textarea
              value={value}
              onChange={(e) => setInfo(e.target.value)}
              placeholder={t("infoPlaceholder")}
              className="min-h-32"
              maxLength={2000}
              disabled={!editable}
            />
            <p className="text-xs text-foreground-muted">{t("infoHelp")}</p>
          </div>
          {editable && (
            <Button variant="gold" onClick={submit} disabled={saving}>
              {t("submit")}
            </Button>
          )}
          <p className="text-xs text-foreground-muted">{t("hiddenNotice")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
