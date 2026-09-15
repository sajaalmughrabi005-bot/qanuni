"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, Star, Briefcase, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth/use-session";
import { lawyers } from "@/lib/mock-data";
import { initials } from "@/lib/utils";

export default function LawyerProfileSettingsPage() {
  const t = useTranslations("lawyer.profile");
  const tSpec = useTranslations("marketplace.specialties");
  const { session } = useSession();
  const lawyer = lawyers.find((l) => l.id === session?.userId) || lawyers[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 text-lg">
              <AvatarFallback>{initials(lawyer.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{lawyer.fullName}</p>
              <p className="flex items-center gap-1 text-sm text-foreground-muted">
                <MapPin className="h-3.5 w-3.5" />
                {lawyer.city}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {lawyer.specialties.map((s) => (
              <Badge key={s} variant="subtle">
                {tSpec(s)}
              </Badge>
            ))}
          </div>

          <p className="mt-4 text-sm text-foreground-muted">{lawyer.bio}</p>

          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-border pt-5 text-sm">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-gold text-gold" />
              {lawyer.rating}
            </div>
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-foreground-muted" />
              {lawyer.completedCases}
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-gold" />
              {t("verificationStatus")}: {lawyer.verificationStatus === "demo_verified" ? "✓" : "—"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
