"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCaseDocuments } from "@/lib/data/hooks";
import { CASE_DOC_TYPES, deleteCaseDocument, getCaseDocumentUrl, uploadCaseDocument } from "@/lib/data/actions";
import { errorKey } from "@/lib/data/error-key";
import { canUploadDocuments } from "@/lib/cases/lifecycle";
import { formatDateTime } from "@/lib/utils";
import { useSession } from "@/lib/auth/use-session";
import type { CaseStatus } from "@/types";

/**
 * Documents attached to a case. Files live in a PRIVATE storage bucket:
 * there are no public URLs, downloads use short-lived signed URLs, and both
 * the table rows and the storage objects are limited to the case's two
 * participants by row-level security.
 */
export function CaseDocumentsPanel({
  caseId,
  status,
  role,
  onActivity,
}: {
  caseId: string;
  status: CaseStatus;
  role: "lawyer" | "client";
  onActivity?: () => void;
}) {
  const t = useTranslations("cases.documents");
  const tErr = useTranslations("cases.errors");
  const tBy = useTranslations("cases.timeline.by");
  const locale = useLocale();
  const { session, isDemo } = useSession();
  const { data: docs, refetch } = useCaseDocuments(caseId);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const allowed = canUploadDocuments(role, status);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    for (const file of files) {
      const res = await uploadCaseDocument(caseId, file, role);
      if (!res.ok) toast.error(`${file.name}: ${tErr(errorKey(res.error) as "unknown")}`);
      else toast.success(t("uploaded"));
    }
    setBusy(false);
    await refetch();
    onActivity?.();
  };

  const download = async (id: string) => {
    if (isDemo) {
      toast.info(t("demoDownload"));
      return;
    }
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    const url = await getCaseDocumentUrl(doc);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast.error(tErr("unknown"));
  };

  const remove = async (id: string) => {
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    const res = await deleteCaseDocument(doc);
    if (!res.ok) {
      toast.error(tErr(errorKey(res.error) as "unknown"));
      return;
    }
    toast.success(t("deleted"));
    await refetch();
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-foreground-muted">{t("privateNote")}</p>
      {docs.length === 0 && <p className="text-sm text-foreground-muted">{t("empty")}</p>}
      <ul className="space-y-2">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-gold" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{d.fileName}</p>
              <p className="text-xs text-foreground-muted">
                {t("uploadedBy", {
                  who: tBy(d.uploadedByRole === "client" ? "client" : "lawyer"),
                  date: formatDateTime(d.createdAt, locale),
                })}
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => download(d.id)} aria-label="download">
              <Download className="h-4 w-4" />
            </Button>
            {d.uploadedBy === session?.userId && allowed && (
              <Button size="icon" variant="ghost" onClick={() => remove(d.id)} aria-label="delete">
                <Trash2 className="h-4 w-4 text-risk-high" />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {allowed ? (
        <>
          <input ref={fileRef} type="file" multiple accept={Object.values(CASE_DOC_TYPES).join(",")} className="hidden" onChange={onPick} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="h-3.5 w-3.5" />
            {busy ? t("uploading") : t("upload")}
          </Button>
        </>
      ) : (
        <p className="text-xs text-foreground-muted">{t("closedNotice")}</p>
      )}
    </div>
  );
}
