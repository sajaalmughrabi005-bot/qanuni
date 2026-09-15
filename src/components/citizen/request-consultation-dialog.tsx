"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { Lawyer, ConsultationType } from "@/types";

export function RequestConsultationDialog({
  lawyer,
  open,
  onOpenChange,
}: {
  lawyer: Lawyer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("marketplace.consultation");
  const tTypes = useTranslations("lawyer.calendar.types");
  const locale = useLocale();
  const { session, profile } = useSession();
  const addAppointment = useAppStore((s) => s.addAppointment);
  const addNotification = useAppStore((s) => s.addNotification);
  const [type, setType] = useState<ConsultationType>(lawyer.consultationTypes[0] || "video");
  const [message, setMessage] = useState("");

  const submit = () => {
    if (!session || !profile) return;
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(11, 0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60000);

    addAppointment({
      clientId: session.userId,
      clientName: profile.fullName,
      lawyerId: lawyer.id,
      title: locale === "ar" ? `استشارة مع ${lawyer.fullName}` : `Consultation with ${lawyer.fullName}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      type,
      status: "pending",
      notes: message,
    });

    addNotification({
      userId: lawyer.id,
      type: "appointment",
      titleAr: "طلب استشارة جديد",
      titleEn: "New consultation request",
      bodyAr: `طلب ${profile.fullName} استشارة جديدة`,
      bodyEn: `${profile.fullName} requested a new consultation`,
      read: false,
      isDemo: true,
      href: "/lawyer/calendar",
    });

    toast.success(t("successDemo"));
    onOpenChange(false);
    setMessage("");
  };

  if (!session || !profile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground-muted">
            {locale === "ar" ? "يجب تسجيل الدخول أولاً لطلب استشارة." : "Please log in first to request a consultation."}
          </p>
          <DialogFooter>
            <Button asChild variant="gold" className="w-full">
              <Link href="/login">{locale === "ar" ? "تسجيل الدخول" : "Log in"}</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("selectType")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as ConsultationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lawyer.consultationTypes.map((ct) => (
                  <SelectItem key={ct} value={ct}>
                    {tTypes(ct)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("message")}</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="gold" onClick={submit} className="w-full">
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
