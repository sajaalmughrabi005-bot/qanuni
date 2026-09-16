"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { User, Briefcase, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";
import type { UserRole } from "@/types";

const roles: { role: UserRole; icon: typeof User; key: "citizen" | "lawyer" | "admin" }[] = [
  { role: "citizen", icon: User, key: "citizen" },
  { role: "lawyer", icon: Briefcase, key: "lawyer" },
  { role: "admin", icon: ShieldCheck, key: "admin" },
];

export function DemoEntryButtons({ variant = "landing" }: { variant?: "landing" | "login" }) {
  const t = useTranslations(variant === "landing" ? "landing.demoEntry" : "auth.login");
  const router = useRouter();
  const loginDemo = useAppStore((s) => s.loginDemo);

  const enter = (role: UserRole) => {
    loginDemo(role);
    router.push(`/${role}/dashboard`);
  };

  if (variant === "login") {
    return (
      <div className="grid gap-3">
        {roles.map(({ role, icon: Icon }) => (
          <Button key={role} variant="outline" className="justify-start gap-3" onClick={() => enter(role)}>
            <Icon className="h-4 w-4 text-gold" />
            {t(`demo${role.charAt(0).toUpperCase()}${role.slice(1)}` as "demoCitizen")}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {roles.map(({ role, icon: Icon, key }) => (
        <Card key={role} className="group cursor-pointer transition hover:-translate-y-1 hover:shadow-md" onClick={() => enter(role)}>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/5 text-ink group-hover:bg-navy group-hover:text-gold transition-colors">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">{t(`${key}` as "citizen")}</p>
              <p className="mt-1 text-sm text-foreground-muted">{t(`${key}Desc` as "citizenDesc")}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
