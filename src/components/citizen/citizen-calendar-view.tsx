"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Video, Phone, MapPin, Gavel, AlarmClock, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { lawyers } from "@/lib/mock-data";
import { cn, formatDateTime, formatMonthYear, formatDayNumber, formatWeekdayShort, formatWeekdayLong } from "@/lib/utils";

const typeIcon = { video: Video, phone: Phone, in_person: MapPin, court: Gavel, deadline: AlarmClock, follow_up: RotateCcw };

export function CitizenCalendarView() {
  const t = useTranslations("lawyer.calendar");
  const tAppointments = useTranslations("citizen.appointments");
  const locale = useLocale();
  const router = useRouter();
  const { session } = useSession();
  const allAppointments = useAppStore((s) => s.appointments);

  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const events = allAppointments.filter((a) => a.clientId === session?.userId);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const dayEvents = (day: Date) => events.filter((e) => isSameDay(new Date(e.startTime), day));
  const selectedEvents = dayEvents(selectedDay).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))}>
          <ChevronRight className="h-4 w-4 rtl:hidden" />
          <ChevronLeft className="h-4 w-4 hidden rtl:block" />
        </Button>
        <p className="w-36 text-center font-semibold">{formatMonthYear(month, locale)}</p>
        <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4 rtl:hidden" />
          <ChevronRight className="h-4 w-4 hidden rtl:block" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setMonth(new Date()); setSelectedDay(new Date()); }}>
          {t("today")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-foreground-muted">
              {days.slice(0, 7).map((d) => (
                <div key={d.toISOString()} className="py-1.5">
                  {formatWeekdayShort(d, locale)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dEvents = dayEvents(day);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "flex h-16 flex-col items-center justify-start gap-1 rounded-lg p-1.5 text-sm transition-colors",
                      !isSameMonth(day, month) && "text-foreground-muted/40",
                      isSameDay(day, selectedDay) && "bg-navy text-white",
                      !isSameDay(day, selectedDay) && isSameDay(day, new Date()) && "bg-gold/15 font-semibold",
                      !isSameDay(day, selectedDay) && "hover:bg-surface-muted"
                    )}
                  >
                    {formatDayNumber(day, locale)}
                    {dEvents.length > 0 && (
                      <span className={cn("h-1.5 w-1.5 rounded-full", isSameDay(day, selectedDay) ? "bg-gold" : "bg-gold")} />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">{formatWeekdayLong(selectedDay, locale)}</p>
            {selectedEvents.length === 0 && <p className="text-sm text-foreground-muted">—</p>}
            {selectedEvents.map((e) => {
              const Icon = typeIcon[e.type] || Video;
              const lawyer = lawyers.find((l) => l.id === e.lawyerId);
              return (
                <div
                  key={e.id}
                  className={cn(
                    "rounded-xl border border-border p-3",
                    e.caseId && "cursor-pointer transition hover:bg-surface-muted"
                  )}
                  onClick={() => e.caseId && router.push(`/citizen/cases/${e.caseId}`)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-gold" />
                    <p className="text-sm font-medium">{e.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {tAppointments("with")}{" "}
                    {lawyer ? (
                      <Link
                        href={`/lawyers/${lawyer.id}`}
                        onClick={(ev) => ev.stopPropagation()}
                        className="font-medium text-gold hover:underline"
                      >
                        {lawyer.fullName}
                      </Link>
                    ) : (
                      "—"
                    )}{" "}
                    · {formatDateTime(e.startTime, locale)}
                  </p>
                  <Badge variant="subtle" className="mt-1.5 text-[10px]">
                    {t(`types.${e.type}`)}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
