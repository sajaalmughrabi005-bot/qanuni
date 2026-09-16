"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileQuestion, CalendarPlus, Send, MessageCircleQuestion, BellRing, CheckCircle2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

const actions = [
  { key: "requestDocument", icon: FileQuestion, href: "/lawyer/documents" },
  { key: "scheduleConsultation", icon: CalendarPlus, href: "/lawyer/calendar" },
  { key: "sendProposal", icon: Send, href: "/lawyer/messages" },
  { key: "askClarification", icon: MessageCircleQuestion, href: "/lawyer/messages" },
  { key: "sendReminder", icon: BellRing, href: "/lawyer/messages" },
  { key: "markReviewed", icon: CheckCircle2, href: "/lawyer/cases" },
] as const;

export function QuickActionsBar() {
  const t = useTranslations("lawyer.quickActions");
  const router = useRouter();

  const run = (key: (typeof actions)[number]["key"], href: string) => {
    toast.success(t("sentDemo"), { description: t(key) });
    router.push(href);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ key, icon: Icon, href }) => (
        <Button key={key} variant="outline" size="sm" onClick={() => run(key, href)}>
          <Icon className="h-3.5 w-3.5" />
          {t(key)}
        </Button>
      ))}
    </div>
  );
}
