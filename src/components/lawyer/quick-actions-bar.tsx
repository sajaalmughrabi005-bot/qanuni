"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileQuestion, CalendarPlus, Send, MessageCircleQuestion, BellRing, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { key: "requestDocument", icon: FileQuestion },
  { key: "scheduleConsultation", icon: CalendarPlus },
  { key: "sendProposal", icon: Send },
  { key: "askClarification", icon: MessageCircleQuestion },
  { key: "sendReminder", icon: BellRing },
  { key: "markReviewed", icon: CheckCircle2 },
] as const;

export function QuickActionsBar() {
  const t = useTranslations("lawyer.quickActions");

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ key, icon: Icon }) => (
        <Button
          key={key}
          variant="outline"
          size="sm"
          onClick={() => toast.success(t("sentDemo"), { description: t(key) })}
        >
          <Icon className="h-3.5 w-3.5" />
          {t(key)}
        </Button>
      ))}
    </div>
  );
}
