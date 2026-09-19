"use client";

import { useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Paperclip, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth/use-session";
import { useDocuments } from "@/lib/data/hooks";
import { CASE_DOC_TYPES, requestCase, uploadCaseDocument, validateCaseFile } from "@/lib/data/actions";
import { errorKey } from "@/lib/data/error-key";
import { initials, cn } from "@/lib/utils";
import type { Analysis, CaseRecord, DocumentClause, Lawyer, LawyerSpecialty, LegalDocument } from "@/types";

const CATEGORIES: LawyerSpecialty[] = ["rental", "employment", "commercial", "family", "criminal", "real_estate", "corporate", "civil"];
const URGENCIES: CaseRecord["urgency"][] = ["low", "medium", "high", "urgent"];

const docTypeToCategory: Record<string, LawyerSpecialty> = {
  rental: "rental",
  employment: "employment",
  service: "commercial",
  sale: "commercial",
  general: "civil",
};

export interface CaseRequestPrefill {
  document: LegalDocument;
  analysis: Analysis;
  clauses: DocumentClause[];
}

/**
 * The core citizen -> lawyer request form. Creates a REAL case through the
 * request_case RPC: the client is the signed-in citizen and the lawyer is the
 * one chosen here, both validated by the database — nothing identity-related
 * is trusted from the browser.
 */
export function CaseRequestDialog({
  open,
  onOpenChange,
  lawyer,
  suggestions,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fixed lawyer (opened from a lawyer's profile). */
  lawyer?: Lawyer;
  /** Ranked lawyers to choose from (opened from an analysis). */
  suggestions?: { lawyer: Lawyer; score: number }[];
  prefill?: CaseRequestPrefill;
}) {
  const t = useTranslations("cases");
  const tSpec = useTranslations("marketplace.specialties");
  const tDocTypes = useTranslations("citizen.upload.types");
  const locale = useLocale();
  const router = useRouter();
  const { session, profile, isDemo } = useSession();
  const { data: myDocuments } = useDocuments();

  const initialCategory: LawyerSpecialty =
    (prefill && docTypeToCategory[prefill.document.documentType]) || lawyer?.specialties[0] || "civil";
  const [pickedLawyerId, setPickedLawyerId] = useState<string | null>(null);
  const [title, setTitle] = useState(prefill ? `${prefill.document.fileName}` : "");
  const [category, setCategory] = useState<LawyerSpecialty>(initialCategory);
  const [description, setDescription] = useState(prefill?.document.citizenDescription || prefill?.analysis.concernsAr.join(" ") || "");
  const [urgency, setUrgency] = useState<CaseRecord["urgency"]>(prefill?.analysis.overallRisk === "high" ? "high" : "medium");
  const [documentId, setDocumentId] = useState<string>(prefill?.document.id ?? "none");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedLawyer = useMemo(() => {
    if (lawyer) return lawyer;
    const id = pickedLawyerId ?? suggestions?.find((s) => s.lawyer.acceptingNewCases)?.lawyer.id;
    return suggestions?.find((s) => s.lawyer.id === id)?.lawyer;
  }, [lawyer, suggestions, pickedLawyerId]);
  const matchScore = suggestions?.find((s) => s.lawyer.id === selectedLawyer?.id)?.score;

  const documentOptions = useMemo(() => {
    const list = [...myDocuments];
    if (prefill && !list.some((d) => d.id === prefill.document.id)) list.unshift(prefill.document);
    return list;
  }, [myDocuments, prefill]);

  const canSubmit = !!selectedLawyer && selectedLawyer.acceptingNewCases && title.trim().length >= 3 && description.trim().length >= 10 && !busy;

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    const ok: File[] = [];
    for (const f of picked) {
      const err = validateCaseFile(f);
      if (err) toast.error(`${f.name}: ${t(`errors.${err}` as "errors.unknown")}`);
      else ok.push(f);
    }
    setFiles((prev) => [...prev, ...ok].slice(0, 5));
  };

  const submit = async () => {
    if (!canSubmit || !selectedLawyer) return;
    setBusy(true);
    const linkedPrefill = prefill && documentId === prefill.document.id ? prefill : undefined;
    const res = await requestCase({
      lawyerId: selectedLawyer.id,
      title: title.trim(),
      category,
      description: description.trim(),
      urgency,
      message: message.trim() || undefined,
      documentIds: documentId !== "none" ? [documentId] : [],
      relevantClauseIds: linkedPrefill ? linkedPrefill.clauses.filter((c) => c.riskLevel !== "low").map((c) => c.id) : [],
      summaryAr: linkedPrefill?.analysis.summaryAr,
      summaryEn: linkedPrefill?.analysis.summaryEn,
      keyDatesAr: linkedPrefill?.analysis.deadlinesAr,
      keyDatesEn: linkedPrefill?.analysis.deadlinesEn,
      questionsAr: linkedPrefill?.analysis.questionsForLawyerAr,
      questionsEn: linkedPrefill?.analysis.questionsForLawyerEn,
      matchScore,
    });
    if (!res.ok) {
      setBusy(false);
      toast.error(t(`errors.${errorKey(res.error)}` as "errors.unknown"));
      return;
    }
    let uploadFailed = false;
    for (const f of files) {
      const up = await uploadCaseDocument(res.data, f, "client");
      if (!up.ok) uploadFailed = true;
    }
    setBusy(false);
    if (uploadFailed) toast.warning(t("request.filesUploadFailed"));
    else toast.success(t("request.success"));
    onOpenChange(false);
    router.push(`/citizen/cases/${res.data}`);
  };

  // ---- gates: sign-in and role ----
  if (!session) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("request.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground-muted">{t("request.loginRequired")}</p>
          <DialogFooter>
            <Button asChild variant="gold" className="w-full">
              <Link href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : `/${locale}`)}`}>
                {locale === "ar" ? "تسجيل الدخول" : "Sign in"}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  if (session.role !== "citizen") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("request.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground-muted">{t("request.onlyCitizens")}</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("request.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isDemo && (
            <p className="rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold">
              {locale === "ar" ? "نسخة تجريبية: لن يُرسل هذا الطلب لأي محامٍ حقيقي." : "Demo: this request will not be sent to any real lawyer."}
            </p>
          )}

          {lawyer ? (
            <div className="flex items-center gap-3 rounded-xl border border-border p-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{initials(lawyer.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{lawyer.fullName}</p>
                <p className="text-xs text-foreground-muted">{lawyer.specialties.map((s) => tSpec(s)).join(" · ")}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{t("request.pickLawyer")}</Label>
              {(suggestions ?? []).length === 0 && <p className="text-sm text-foreground-muted">{t("request.noLawyers")}</p>}
              {(suggestions ?? []).map(({ lawyer: l, score }) => (
                <button
                  key={l.id}
                  type="button"
                  disabled={!l.acceptingNewCases}
                  onClick={() => setPickedLawyerId(l.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-start transition disabled:opacity-50",
                    selectedLawyer?.id === l.id ? "border-gold bg-gold/5" : "border-border hover:bg-surface-muted"
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initials(l.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.fullName}</p>
                    <p className="text-xs text-foreground-muted">
                      {l.acceptingNewCases ? l.specialties.map((s) => tSpec(s)).join(" · ") : t("request.lawyerNotAccepting")}
                    </p>
                  </div>
                  <Badge variant="gold">{score}%</Badge>
                  {selectedLawyer?.id === l.id && <Check className="h-4 w-4 shrink-0 text-gold" />}
                </button>
              ))}
            </div>
          )}

          {selectedLawyer && !selectedLawyer.acceptingNewCases && (
            <p className="rounded-lg bg-risk-high-bg px-3 py-2 text-sm text-risk-high">{t("request.lawyerNotAccepting")}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="req-title">{t("request.titleLabel")}</Label>
            <Input id="req-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("request.titlePlaceholder")} maxLength={200} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("request.categoryLabel")}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as LawyerSpecialty)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {tSpec(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("request.urgencyLabel")}</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as CaseRecord["urgency"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCIES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {t(`urgency.${u}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="req-desc">{t("request.descriptionLabel")}</Label>
            <Textarea
              id="req-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("request.descriptionPlaceholder")}
              className="min-h-28"
              maxLength={5000}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("request.contractLabel")}</Label>
            <Select value={documentId} onValueChange={setDocumentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("request.noContract")}</SelectItem>
                {documentOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.fileName} · {tDocTypes(d.documentType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("request.messageLabel")}</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} />
          </div>

          <div className="space-y-1.5">
            <Label>{t("request.filesLabel")}</Label>
            <input ref={fileRef} type="file" multiple accept={Object.values(CASE_DOC_TYPES).join(",")} className="hidden" onChange={pickFiles} />
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={files.length >= 5}>
              <Paperclip className="h-3.5 w-3.5" />
              {t("documents.upload")}
            </Button>
            <p className="text-xs text-foreground-muted">{t("request.filesHelp")}</p>
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-1.5 text-xs">
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} aria-label="remove">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {profile?.fullName && <p className="text-[11px] text-foreground-muted">{profile.fullName}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          <Button variant="gold" onClick={submit} disabled={!canSubmit}>
            {busy ? t("request.sending") : t("request.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
