"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth/use-session";
import { useAdminUsers } from "@/lib/data/hooks";
import { adminSetAccountStatus } from "@/lib/data/actions";
import { errorKey } from "@/lib/data/error-key";
import { initials } from "@/lib/utils";
import type { Profile, UserRole } from "@/types";

const ROLE_FILTERS: (UserRole | "all")[] = ["all", "citizen", "lawyer", "admin"];

export default function AdminUsersPage() {
  const t = useTranslations("admin.nav");
  const tUsers = useTranslations("admin.users");
  const tRoles = useTranslations("common.roles");
  const tCases = useTranslations("cases");
  const { profile: me } = useSession();
  const { data: users, refetch } = useAdminUsers();
  const [role, setRole] = useState<UserRole | "all">("all");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => (role === "all" || u.role === role) && (!q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  }, [users, role, query]);

  const toggleStatus = async (p: Profile) => {
    const next = p.accountStatus === "disabled" ? "active" : "disabled";
    const res = await adminSetAccountStatus(p.id, next);
    if (!res.ok) return toast.error(tCases(`errors.${errorKey(res.error)}` as "errors.unknown"));
    toast.success(tUsers(next === "active" ? "activated" : "deactivated"));
    refetch();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("users")}</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tUsers("search")} className="max-w-xs" />
        {ROLE_FILTERS.map((r) => (
          <Button key={r} size="sm" variant={role === r ? "default" : "outline"} onClick={() => setRole(r)}>
            {r === "all" ? tUsers("all") : tRoles(r)} ({r === "all" ? users.length : users.filter((u) => u.role === r).length})
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <Avatar>
                {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.fullName} />}
                <AvatarFallback>{initials(p.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{p.fullName}</p>
                <p className="text-xs text-foreground-muted">{p.email}</p>
              </div>
              <Badge variant="outline">{tRoles(p.role)}</Badge>
              {p.role !== "admin" && (
                <>
                  <Badge variant={p.accountStatus === "disabled" ? "high" : "low"}>
                    {p.accountStatus === "disabled" ? tUsers("statusDisabled") : tUsers("statusActive")}
                  </Badge>
                  {p.id !== me?.id && (
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(p)}>
                      {p.accountStatus === "disabled" ? tUsers("activate") : tUsers("deactivate")}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
