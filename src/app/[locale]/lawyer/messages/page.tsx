"use client";

import { useTranslations, useLocale } from "next-intl";
import { MessageSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { formatDateTime } from "@/lib/utils";

export default function LawyerMessagesPage() {
  const t = useTranslations("lawyer.messages");
  const locale = useLocale();
  const { session } = useSession();
  const allCases = useAppStore((s) => s.cases);
  const allMessages = useAppStore((s) => s.messages);

  const myCases = allCases.filter((c) => c.lawyerId === session?.userId);
  const threads = myCases
    .map((c) => ({
      case: c,
      last: [...allMessages].filter((m) => m.caseId === c.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
    }))
    .filter((thread) => thread.last)
    .sort((a, b) => new Date(b.last.createdAt).getTime() - new Date(a.last.createdAt).getTime());

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {threads.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t("empty")} />
      ) : (
        <div className="space-y-2.5">
          {threads.map(({ case: c, last }) => (
            <Link key={c.id} href={`/lawyer/cases/${c.id}`}>
              <Card className="transition hover:shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{c.clientName}</p>
                    <span className="text-xs text-foreground-muted">{formatDateTime(last.createdAt, locale)}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-foreground-muted">{last.message}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
