"use client";
import { DataLoadError } from "@/components/shared/data-load-error";

import { useLocale, useTranslations } from "next-intl";
import { Bell, CheckCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useSession } from "@/lib/auth/use-session";
import { useNotifications } from "@/lib/data/hooks";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/data/actions";
import { toast } from "sonner";
import { useState, type KeyboardEvent } from "react";
import { formatDateTime, cn } from "@/lib/utils";

export function NotificationsList({ namespace }: { namespace: "citizen" | "lawyer" | "admin" }) {
  const t = useTranslations(`${namespace}.notifications`);
  const tCommon = useTranslations("common.status");
  const locale = useLocale();
  const { session } = useSession();
  const { data: allNotifications, loading, error, refetch } = useNotifications();
  const [busy,setBusy]=useState(false);
  const notifications = [...allNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const markRead = async (id: string) => {
    try {
      const result=await markNotificationRead(id);
      if(!result.ok)return toast.error(tCommon("error"));
      await refetch();
    }catch{toast.error(tCommon("error"));}
  };

  const markAllRead = async () => {
    if (!session || busy) return;
    setBusy(true);
    try {
      const result=await markAllNotificationsRead(session.userId);
      if(!result.ok)return toast.error(tCommon("error"));
      await refetch();
    }catch{toast.error(tCommon("error"));}finally{setBusy(false);}
  };

  if(error)return <DataLoadError/>;
  if(loading && !allNotifications.length)return <p role="status">{tCommon("loading")}</p>;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {notifications.some((n) => !n.read) && (
          <Button variant="ghost" size="sm" onClick={markAllRead} disabled={busy}>
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
                // Only the href-less fallback below needs its own keyboard semantics:
                // the n.href branch is already wrapped in a keyboard-accessible Link.
                {...(!n.href && {
                  role: "button" as const,
                  tabIndex: 0,
                  onKeyDown: (ev: KeyboardEvent<HTMLDivElement>) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      markRead(n.id);
                    }
                  },
                })}
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
