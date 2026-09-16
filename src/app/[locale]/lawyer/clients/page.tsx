"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { initials } from "@/lib/utils";

export default function ClientsPage() {
  const t = useTranslations("lawyer.clients");
  const { session } = useSession();
  const allCases = useAppStore((s) => s.cases);
  const myCases = allCases.filter((c) => c.lawyerId === session?.userId);

  const clients = Array.from(
    myCases.reduce((map, c) => {
      const existing = map.get(c.clientId) || { name: c.clientName, total: 0, active: 0, activeCaseId: undefined as string | undefined };
      existing.total += 1;
      if (c.status !== "closed") {
        existing.active += 1;
        existing.activeCaseId = existing.activeCaseId || c.id;
      }
      map.set(c.clientId, existing);
      return map;
    }, new Map<string, { name: string; total: number; active: number; activeCaseId?: string }>())
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {clients.length === 0 ? (
        <EmptyState icon={Users} title={t("empty")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {clients.map(([id, c]) => (
            <Card key={id}>
              <CardContent className="flex items-center gap-3 p-4">
                <Avatar>
                  <AvatarFallback>{initials(c.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{c.name}</p>
                  <div className="mt-1 flex gap-3 text-xs text-foreground-muted">
                    <span>{t("activeCases")}: {c.active}</span>
                    <span>{t("totalCases")}: {c.total}</span>
                  </div>
                </div>
                {c.active > 0 && c.activeCaseId && (
                  <Link href={`/lawyer/cases/${c.activeCaseId}`}>
                    <Badge variant="gold" className="cursor-pointer hover:opacity-80">
                      {c.active}
                    </Badge>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
