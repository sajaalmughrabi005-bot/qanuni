import { getTranslations } from "next-intl/server";
import { CalendarView } from "@/components/lawyer/calendar-view";

export default async function LawyerCalendarPage() {
  const t = await getTranslations("lawyer.calendar");
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>
      <CalendarView />
    </div>
  );
}
