"use client";

import { useTranslations, useLocale } from "next-intl";
import { FileText, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { formatDate } from "@/lib/utils";

export default function DocumentsPage() {
  const t = useTranslations("citizen.documents");
  const tTypes = useTranslations("citizen.upload.types");
  const locale = useLocale();
  const { session } = useSession();
  const allDocuments = useAppStore((s) => s.documents);
  const documents = allDocuments.filter((d) => d.userId === session?.userId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/citizen/analyze/new">
            <Plus className="h-4 w-4" />
            {t("uploadNew")}
          </Link>
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState icon={FileText} title={t("empty")} description={t("emptyDesc")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/citizen/analyze/${doc.id}`}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink/5 text-ink">
                      <FileText className="h-5 w-5" />
                    </span>
                    <Badge variant="subtle">{t(`status.${doc.status}` as "status.analyzed")}</Badge>
                  </div>
                  <p className="mt-3 truncate font-medium">{doc.fileName}</p>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {tTypes(doc.documentType)} · {formatDate(doc.createdAt, locale)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
