"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useMyLawyer } from "@/lib/auth/use-lawyer";
import { updateMyLawyerProfile } from "@/lib/data/actions";
import type { Lawyer } from "@/types";

/** Availability controls that are persisted for real (they drive the public directory and request blocking). */
export default function LawyerSettingsPage() {
  const t = useTranslations("lawyer.settings");
  const tAvail = useTranslations("marketplace.availability");
  const tProfile = useTranslations("common.profile");
  const { lawyer, refresh } = useMyLawyer();

  if (!lawyer) return null;

  const save = async (patch: Partial<Pick<Lawyer, "acceptingNewCases" | "availabilityStatus">>) => {
    const res = await updateMyLawyerProfile(lawyer.id, patch);
    if (!res.ok) return toast.error(tProfile("saveFailed"));
    await refresh();
    toast.success(tProfile("saved"));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("acceptingTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="accepting">{t("acceptingLabel")}</Label>
            <Switch id="accepting" checked={lawyer.acceptingNewCases} onCheckedChange={(v) => save({ acceptingNewCases: v })} />
          </div>
          <p className="text-xs text-foreground-muted">{t("acceptingHelp")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("availability")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={lawyer.availabilityStatus} onValueChange={(v) => save({ availabilityStatus: v as Lawyer["availabilityStatus"] })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["available_today", "available_this_week", "busy"] as const).map((v) => (
                <SelectItem key={v} value={v}>
                  {tAvail(v)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <p className="text-sm text-foreground-muted">
        <Link href="/lawyer/profile" className="text-gold hover:underline">
          {t("moreInProfile")}
        </Link>
      </p>
    </div>
  );
}
