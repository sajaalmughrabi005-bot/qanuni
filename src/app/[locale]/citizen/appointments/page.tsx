"use client";

import { useTranslations, useLocale } from "next-intl";
import { CalendarDays, Video, Phone, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { lawyers } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/utils";

const typeIcon = { video: Video, phone: Phone, in_person: MapPin, court: MapPin, deadline: CalendarDays, follow_up: Phone };

export default function AppointmentsPage() {
  const t = useTranslations("citizen.appointments");
  const locale = useLocale();
  const { session } = useSession();
  const allAppointments = useAppStore((s) => s.appointments);
  const appointments = [...allAppointments]
    .filter((a) => a.clientId === session?.userId)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {appointments.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t("empty")} />
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => {
            const lawyer = lawyers.find((l) => l.id === a.lawyerId);
            const Icon = typeIcon[a.type] || CalendarDays;
            return (
              <Card key={a.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-foreground-muted">
                      {t("with")} {lawyer?.fullName} · {formatDateTime(a.startTime, locale)}
                    </p>
                  </div>
                  <Badge variant={a.status === "confirmed" ? "low" : "subtle"}>
                    {t(`status.${a.status}` as "status.confirmed")}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
