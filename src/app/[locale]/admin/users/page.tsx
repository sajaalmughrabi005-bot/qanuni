"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { demoProfiles } from "@/lib/mock-data/users";
import { initials } from "@/lib/utils";

export default function AdminUsersPage() {
  const t = useTranslations("admin.nav");
  const tRoles = useTranslations("common.roles");
  const profiles = Object.values(demoProfiles);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("users")}</h1>
      <div className="space-y-3">
        {profiles.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <Avatar>
                <AvatarFallback>{initials(p.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{p.fullName}</p>
                <p className="text-xs text-foreground-muted">{p.email}</p>
              </div>
              <Badge variant="outline">{tRoles(p.role)}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
