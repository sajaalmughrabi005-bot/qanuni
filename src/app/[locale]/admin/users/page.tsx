"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapProfile } from "@/lib/supabase/mappers";
import { initials } from "@/lib/utils";
import type { Profile } from "@/types";

export default function AdminUsersPage() {
  const t = useTranslations("admin.nav");
  const tUsers = useTranslations("admin.users");
  const tRoles = useTranslations("common.roles");
  const [users, setUsers] = useState<Profile[]>([]);

  const load = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers((data || []).map(mapProfile));
  };

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setUsers((data || []).map(mapProfile)));
  }, []);

  const toggleStatus = async (p: Profile) => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const nextStatus = p.accountStatus === "disabled" ? "active" : "disabled";
    await supabase.from("profiles").update({ account_status: nextStatus }).eq("id", p.id);
    load();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("users")}</h1>
      <div className="space-y-3">
        {users.map((p) => (
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
              {p.role !== "admin" && (
                <>
                  <Badge variant={p.accountStatus === "disabled" ? "high" : "low"}>
                    {p.accountStatus === "disabled" ? tUsers("statusDisabled") : tUsers("statusActive")}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(p)}>
                    {p.accountStatus === "disabled" ? tUsers("activate") : tUsers("deactivate")}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
