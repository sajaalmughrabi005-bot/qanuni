"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useDocuments } from "@/lib/data/hooks";
import { deleteDocument } from "@/lib/data/actions";
import { useSession } from "@/lib/auth/use-session";
import { formatDate } from "@/lib/utils";

export default function DocumentsPage() {
  const t = useTranslations("citizen.documents");
  const tTypes = useTranslations("citizen.upload.types");
  const locale = useLocale();
  const { data: documents, refetch } = useDocuments();
  const { isDemo } = useSession();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const remove = async (id: string) => {
    await deleteDocument(id);
    setConfirmId(null);
    toast.success(t("deleted"));
    await refetch();
  };

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
            <div key={doc.id} className="relative">
            <Link href={`/citizen/analyze/${doc.id}`}>
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
            {!isDemo && (
              <div className="absolute end-3 bottom-3 flex items-center gap-2">
                {confirmId === doc.id ? (
                  <>
                    <Button size="sm" variant="outline" className="border-risk-high/40 text-risk-high" onClick={() => remove(doc.id)}>
                      {t("confirmDelete")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                      {t("cancel")}
                    </Button>
                  </>
                ) : (
                  <Button size="icon" variant="ghost" aria-label={t("delete")} onClick={() => setConfirmId(doc.id)}>
                    <Trash2 className="h-4 w-4 text-foreground-muted" />
                  </Button>
                )}
              </div>
            )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
