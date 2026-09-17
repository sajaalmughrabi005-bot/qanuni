"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLawyersWithOverrides } from "@/lib/auth/use-lawyer";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";
import type { Lawyer } from "@/types";

export default function AdminVerificationPage() {
  const t = useTranslations("admin.verification");
  const tSpec = useTranslations("marketplace.specialties");
  const lawyers = useLawyersWithOverrides();

  const pending = lawyers.filter((l) => l.verificationStatus === "pending");

  const setVerification = async (lawyerId: string, status: Lawyer["verificationStatus"]) => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.from("lawyers").update({ verification_status: status }).eq("id", lawyerId);
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {pending.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t("empty")} />
      ) : (
        <div className="space-y-3">
          {pending.map((l) => (
            <Card key={l.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <Avatar>
                  <AvatarFallback>{initials(l.fullName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{l.fullName}</p>
                  <p className="text-xs text-foreground-muted">
                    {l.specialties.map((s) => tSpec(s)).join(", ") || "—"}
                  </p>
                </div>
                <Badge variant="subtle">{t("pendingBadge")}</Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="gold" onClick={() => setVerification(l.id, "demo_verified")}>
                    {t("approve")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setVerification(l.id, "unverified")}>
                    {t("reject")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
