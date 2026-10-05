"use client";

import { useTranslations } from "next-intl";
import { CitizenCalendarView } from "@/components/citizen/citizen-calendar-view";

export default function AppointmentsPage() {
  const t = useTranslations("citizen.appointments");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <CitizenCalendarView />
    </div>
  );
}
