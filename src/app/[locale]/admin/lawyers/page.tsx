"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { lawyers } from "@/lib/mock-data";
import { initials } from "@/lib/utils";

export default function AdminLawyersPage() {
  const t = useTranslations("admin.nav");
  const tSpec = useTranslations("marketplace.specialties");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("lawyers")}</h1>
      <div className="space-y-3">
        {lawyers.map((l) => (
          <Link key={l.id} href={`/lawyers/${l.id}`}>
            <Card className="transition hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <Avatar>
                  <AvatarFallback>{initials(l.fullName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{l.fullName}</p>
                  <p className="text-xs text-foreground-muted">
                    {l.city} · {l.specialties.map((s) => tSpec(s)).join(", ")}
                  </p>
                </div>
                <Badge variant={l.verificationStatus === "demo_verified" ? "gold" : "subtle"}>
                  {l.verificationStatus}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
