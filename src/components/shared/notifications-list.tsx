"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bell, CheckCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { formatDateTime, cn } from "@/lib/utils";

export function NotificationsList({ namespace }: { namespace: "citizen" | "lawyer" }) {
  const t = useTranslations(`${namespace}.notifications`);
  const tCommon = useTranslations("common.status");
  const locale = useLocale();
  const { session } = useSession();
  const allNotifications = useAppStore((s) => s.notifications);
  const notifications = [...allNotifications]
    .filter((n) => n.userId === session?.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {notifications.some((n) => !n.read) && (
          <Button variant="ghost" size="sm" onClick={() => session && markAllRead(session.userId)}>
            <CheckCheck className="h-4 w-4" />
            {t("markAllRead")}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title={t("empty")} />
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => {
            const content = (
              <Card
                className={cn("transition hover:shadow-sm", !n.read && "border-gold/40 bg-gold/5")}
                onClick={() => markRead(n.id)}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{locale === "ar" ? n.titleAr : n.titleEn}</p>
                      {n.isDemo && (
                        <Badge variant="subtle" className="text-[10px]">
                          {tCommon("demoNotification")}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-foreground-muted">{locale === "ar" ? n.bodyAr : n.bodyEn}</p>
                    <p className="mt-1.5 text-xs text-foreground-muted">{formatDateTime(n.createdAt, locale)}</p>
                  </div>
                </CardContent>
              </Card>
            );
            return n.href ? (
              <Link key={n.id} href={n.href} onClick={() => markRead(n.id)}>
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
