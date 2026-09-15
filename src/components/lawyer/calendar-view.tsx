"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, Video, Phone, MapPin, Gavel, AlarmClock, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { Appointment } from "@/types";
import { cn, formatDateTime } from "@/lib/utils";

const typeIcon = { video: Video, phone: Phone, in_person: MapPin, court: Gavel, deadline: AlarmClock, follow_up: RotateCcw };

export function CalendarView() {
  const t = useTranslations("lawyer.calendar");
  const locale = useLocale();
  const { session } = useSession();
  const allAppointments = useAppStore((s) => s.appointments);
  const addAppointment = useAppStore((s) => s.addAppointment);
  const deleteAppointment = useAppStore((s) => s.deleteAppointment);

  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", clientName: "", date: "", time: "10:00", type: "video" });

  const events = allAppointments.filter((a) => a.lawyerId === session?.userId);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const dayEvents = (day: Date) => events.filter((e) => isSameDay(new Date(e.startTime), day));
  const selectedEvents = dayEvents(selectedDay).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const openNewEvent = () => {
    setForm({ title: "", clientName: "", date: format(selectedDay, "yyyy-MM-dd"), time: "10:00", type: "video" });
    setDialogOpen(true);
  };

  const saveEvent = () => {
    if (!session || !form.title || !form.date) return;
    const start = new Date(`${form.date}T${form.time}:00`);
    const end = new Date(start.getTime() + 30 * 60000);
    addAppointment({
      clientId: "manual-entry",
      clientName: form.clientName || "—",
      lawyerId: session.userId,
      title: form.title,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      type: form.type as Appointment["type"],
      status: "confirmed",
    });
    setDialogOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronRight className="h-4 w-4 rtl:hidden" />
            <ChevronLeft className="h-4 w-4 hidden rtl:block" />
          </Button>
          <p className="w-36 text-center font-semibold">{format(month, "MMMM yyyy")}</p>
          <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4 rtl:hidden" />
            <ChevronRight className="h-4 w-4 hidden rtl:block" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setMonth(new Date()); setSelectedDay(new Date()); }}>
            {t("today")}
          </Button>
        </div>
        <Button onClick={openNewEvent}>
          <Plus className="h-4 w-4" />
          {t("newEvent")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-foreground-muted">
              {days.slice(0, 7).map((d) => (
                <div key={d.toISOString()} className="py-1.5">
                  {format(d, "EEEEEE")}
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
                    {format(day, "d")}
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
            <p className="text-sm font-semibold">{format(selectedDay, "EEEE, MMMM d")}</p>
            {selectedEvents.length === 0 && <p className="text-sm text-foreground-muted">—</p>}
            {selectedEvents.map((e) => {
              const Icon = typeIcon[e.type] || Video;
              return (
                <div key={e.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-gold" />
                      <p className="text-sm font-medium">{e.title}</p>
                    </div>
                    <button onClick={() => deleteAppointment(e.id)} aria-label={t("delete")}>
                      <Trash2 className="h-3.5 w-3.5 text-foreground-muted hover:text-risk-high" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {e.clientName} · {formatDateTime(e.startTime, locale)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newEvent")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("eventTitle")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("client")}</Label>
              <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("date")}</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("time")}</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("eventTitle")}</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["video", "phone", "in_person", "court", "deadline", "follow_up"] as const).map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {t(`types.${tp}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="gold" onClick={saveEvent} className="w-full">
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
