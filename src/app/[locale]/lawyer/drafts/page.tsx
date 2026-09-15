"use client";

import { useTranslations, useLocale } from "next-intl";
import { FileEdit, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { formatDateTime } from "@/lib/utils";

export default function DraftsListPage() {
  const t = useTranslations("lawyer.drafter");
  const locale = useLocale();
  const { session } = useSession();
  const allDrafts = useAppStore((s) => s.drafts);
  const drafts = allDrafts.filter((d) => d.lawyerId === session?.userId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/lawyer/drafts/new">
            <Plus className="h-4 w-4" />
            {t("generate")}
          </Link>
        </Button>
      </div>

      {drafts.length === 0 ? (
        <EmptyState icon={FileEdit} title={t("empty")} />
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{d.title}</p>
                  <Badge variant="outline">{t(`status.${d.status}` as "status.draft")}</Badge>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-foreground-muted">{d.content}</p>
                <p className="mt-2 text-xs text-foreground-muted">{formatDateTime(d.updatedAt, locale)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
