"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { demoProfiles } from "@/lib/mock-data/users";
import { initials } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";

export default function AdminUsersPage() {
  const t = useTranslations("admin.nav");
  const tUsers = useTranslations("admin.users");
  const tRoles = useTranslations("common.roles");
  const registeredUsers = useAppStore((s) => s.registeredUsers);
  const setAccountStatus = useAppStore((s) => s.setAccountStatus);

  const demoList = Object.values(demoProfiles);
  const registeredList = Object.values(registeredUsers).map((u) => u.profile);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("users")}</h1>
      <div className="space-y-3">
        {demoList.map((p) => (
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
              <Badge variant="subtle">{tUsers("demoBadge")}</Badge>
            </CardContent>
          </Card>
        ))}
        {registeredList.map((p) => (
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
              <Badge variant={p.accountStatus === "disabled" ? "high" : "low"}>
                {p.accountStatus === "disabled" ? tUsers("statusDisabled") : tUsers("statusActive")}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setAccountStatus(p.id, p.accountStatus === "disabled" ? "active" : "disabled")
                }
              >
                {p.accountStatus === "disabled" ? tUsers("activate") : tUsers("deactivate")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
