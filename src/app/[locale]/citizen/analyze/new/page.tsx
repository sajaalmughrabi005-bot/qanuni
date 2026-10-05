"use client";

import { useState, useRef } from "react";
import { LegalMotion } from "@/components/shared/legal-motion";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Upload, FileText, Sparkles, Check, ShieldAlert } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useSession } from "@/lib/auth/use-session";
import { createDraftDocument, finalizeDocumentAnalysis } from "@/lib/data/actions";
import { storeCitizenSourceAction } from "@/lib/documents/storage-actions";
import { useDemoStore } from "@/lib/demo/store";
import { analyzeDocumentAction } from "@/lib/ai/actions";
import { extractTextFromFileAction } from "@/lib/documents/extract-text";
import { DEMO_DOCUMENT_ID } from "@/lib/mock-data";
import type { DocumentType } from "@/types";

const STEPS = ["uploading", "generating", "saving"] as const;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, matches the UI copy
// All supported files use authenticated server ingestion; the browser-only list is empty.
const BROWSER_READABLE_EXTENSIONS: string[] = [];
const SERVER_EXTRACTABLE_EXTENSIONS = [".txt", ".pdf", ".docx", ".jpg", ".jpeg", ".png", ".webp"];

export default function NewAnalysisPage() {
  const t = useTranslations("citizen.upload");
  const tProcessing = useTranslations("citizen.processing");
  const locale = useLocale();
  const router = useRouter();
  const { session, isDemo } = useSession();

  const [phase, setPhase] = useState<"form" | "processing">("form");
  const [stepIndex, setStepIndex] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [docType, setDocType] = useState<DocumentType>("general");
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef=useRef<HTMLInputElement>(null);
  const pendingDocument = useRef<{text:string;id:string;fingerprint:string} | null>(null);
  const analysisBusy=useRef(false);

  const openSample = () => {
    router.push(`/citizen/analyze/${DEMO_DOCUMENT_ID}`);
  };

  const acceptFile = async (f: File) => {
    if (extracting || phase === "processing") return;
    const ext = "." + (f.name.split(".").pop() || "").toLowerCase();
    const readable = BROWSER_READABLE_EXTENSIONS.includes(ext);
    const extractable = SERVER_EXTRACTABLE_EXTENSIONS.includes(ext);
    if (!readable && !extractable) {
      toast.error(t("fileTypeNotSupported"));
      return;
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      toast.error(t("fileTooLarge"));
      return;
    }

    if (readable) {
      setFile(f);
      setPastedText(await f.text());
      return;
    }

    // PDF/DOCX: extract server-side, then drop the text into the exact same
    // pastedText flow the .txt path already uses — nothing downstream changes.
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.set("file", f);
      const result = await extractTextFromFileAction(fd);
      if (result.status !== "ok") {
        toast.error(locale === "ar" ? result.reasonAr : result.reasonEn);
        return;
      }
      setFile(f);
      setPastedText(result.text);
      if(result.warningAr || result.warningEn) toast.warning(locale === "ar" ? result.warningAr : result.warningEn);
    } catch {
      // extractTextFromFileAction is designed to always return a typed
      // result, never throw — but if the server action call itself fails
      // unexpectedly (a crash, a network error, ...), await above rejects
      // instead of resolving, which would otherwise skip straight past
      // setExtracting(false) and leave the dropzone stuck on "extracting…"
      // forever. This is the one path that must never be allowed to hang.
      toast.error(t("extractionFailed"));
    } finally {
      setExtracting(false);
    }
  };

  const runAnalysis = async () => {
    if (!session || analysisBusy.current || phase === "processing" || extracting) return;
    if(pastedText.length > 240000) { toast.error(locale === "ar" ? "النص يتجاوز 240000 حرف. قسّمه قبل التحليل." : "Text exceeds 240,000 characters. Split it before analysis."); return; }
    analysisBusy.current=true;
    setPhase("processing");
    setStepIndex(0);
    try {

    const fileName = file?.name || (locale === "ar" ? "مستند-ملصق.txt" : "pasted-document.txt");
    const text = pastedText.trim();

    const fingerprint=JSON.stringify({text,fileName,size:file?.size,lastModified:file?.lastModified});
    if(pendingDocument.current?.fingerprint!==fingerprint) pendingDocument.current={id:crypto.randomUUID(),text,fingerprint};
    const documentId = await createDraftDocument({
      id:pendingDocument.current.id,
      userId: session.userId,
      fileName,
      documentType: docType,
      language: locale as "ar" | "en",
      citizenDescription: pastedText.trim() || undefined,
    });
    if (!documentId) {
      setPhase("form");
      toast.error(locale === "ar" ? "تعذر حفظ المستند. حاول مرة أخرى." : "Couldn't save the document. Please try again.");
      return;
    }

    pendingDocument.current = { text: pastedText.trim(), id: documentId, fingerprint };
    if(file) {
      if(isDemo) useDemoStore.getState().setSourceFile(documentId,file);
      else { const fd=new FormData();fd.set("file",file);const stored=await storeCitizenSourceAction(documentId,fd);if(!stored.ok) throw new Error(stored.error); }
    }
    setStepIndex(1);

    const result = await analyzeDocumentAction({
      text,
      // The user's actual content, with none of the role/purpose context
      // line mixed in — used by the pre-analysis gates so that boilerplate
      // can't artificially pad obviously-empty or gibberish input past them.
      rawContent: pastedText.trim(),
      fileName,
      documentId,
      userId: session.userId,
      documentType: docType,
      locale: locale as "ar" | "en",
    });

    if (result.status !== "ok") {
      setPhase("form");
      toast.error(locale === "ar" ? result.reasonAr : result.reasonEn);
      return;
    }

    setStepIndex(2);
    const saved = await finalizeDocumentAnalysis(documentId, session.userId, result.clauses, { ...result.analysis, detectedDocumentType:result.documentType });
    if (!saved) {
      setPhase("form");
      toast.error(locale === "ar" ? "تعذر حفظ نتيجة التحليل. حاول مرة أخرى." : "Couldn't save the analysis. Please try again.");
      return;
    }

    router.push(`/citizen/analyze/${documentId}`);
    } catch { toast.error(locale === "ar" ? "تعذر إتمام العملية. النص محفوظ في النموذج؛ حاول مجدداً." : "Unable to finish. Your text is retained in the form; please retry."); } finally { analysisBusy.current=false; setPhase("form"); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void acceptFile(f);
  };

  if (phase === "processing") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-24 text-center">
        <LegalMotion processing />
        <div className="mt-8 w-full space-y-4">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-3 text-start">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  i < stepIndex ? "bg-risk-low text-white" : i === stepIndex ? "bg-gold text-white" : "bg-surface-muted text-foreground-muted"
                }`}
              >
                {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={i <= stepIndex ? "text-foreground" : "text-foreground-muted"}>
                {step === "saving" ? (locale === "ar" ? "حفظ النتيجة" : "Saving result") : tProcessing(step)}
              </span>
            </div>
          ))}
        </div>
        <p role="status" className="mt-6 text-sm">{locale === "ar" ? "جارٍ تنفيذ المرحلة الحالية…" : "Processing the current stage…"}</p>
        <p className="mt-8 text-xs leading-relaxed text-foreground-muted">{tProcessing("disclaimer")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-foreground-muted">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            role="button" tabIndex={0}
            aria-label={t("dropzone")}
            onKeyDown={(e) => { if(e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragOver ? "border-gold bg-gold/5" : "border-border hover:bg-surface-muted/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.docx,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) acceptFile(f);
              }}
            />
            {extracting ? (
              <>
                <Sparkles className="h-8 w-8 animate-pulse text-gold" />
                <p className="font-medium">{t("extractingFile")}</p>
              </>
            ) : file ? (
              <>
                <FileText className="h-8 w-8 text-gold" />
                <p className="font-medium">{file.name}</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-foreground-muted" />
                <p className="font-medium">{t("dropzone")}</p>
                <p className="text-xs text-foreground-muted">{t("dropzoneHint")}</p>
              </>
            )}
          </div>

          <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void acceptFile(f);}}/>
          <Button variant="outline" size="sm" disabled={extracting} onClick={()=>cameraInputRef.current?.click()}>{locale === "ar" ? "التقاط صورة (على الأجهزة المدعومة)" : "Take a photo (on supported devices)"}</Button>

          <div className="space-y-1.5">
            <Label htmlFor="contract-text">{t("orPasteText")}</Label>
            <Textarea
              id="contract-text"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={t("pasteTextPlaceholder")}
              className="min-h-32"
            />
          </div>

          <details className="space-y-1.5">
            <summary className="cursor-pointer text-sm">{locale === "ar" ? "نوع المستند (اختياري؛ يتم التعرف عليه آلياً)" : "Document type hint (optional; detected automatically)"}</summary>
            <Label>{t("documentType")}</Label>
            <Select
              value={docType}
              onValueChange={(v) => {
                setDocType(v as DocumentType);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["rental", "employment", "service", "sale", "general"] as const).map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </details>

          <div className="flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-foreground-muted">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t("privacyNotice")}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" onClick={runAnalysis} disabled={extracting || !pastedText.trim()}>
              {t("analyzeButton")}
            </Button>
            {isDemo && (
              <Button variant="outline" className="flex-1" onClick={openSample}>
                {t("useDemo")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
