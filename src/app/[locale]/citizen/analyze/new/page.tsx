"use client";

import { useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Upload, FileText, Sparkles, Check, ShieldAlert } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { analyzeDocumentAction } from "@/lib/ai/actions";
import { DEMO_DOCUMENT_ID } from "@/lib/mock-data";
import type { DocumentType, LegalDocument } from "@/types";

const STEPS = ["uploading", "extracting", "identifying", "comparing", "generating"] as const;

export default function NewAnalysisPage() {
  const t = useTranslations("citizen.upload");
  const tProcessing = useTranslations("citizen.processing");
  const locale = useLocale();
  const router = useRouter();
  const { session } = useSession();
  const addDocument = useAppStore((s) => s.addDocument);
  const addNotification = useAppStore((s) => s.addNotification);

  const [phase, setPhase] = useState<"form" | "processing">("form");
  const [stepIndex, setStepIndex] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [docType, setDocType] = useState<DocumentType>("rental");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const useDemo = () => {
    router.push(`/citizen/analyze/${DEMO_DOCUMENT_ID}`);
  };

  const runAnalysis = async () => {
    if (!session) return;
    setPhase("processing");

    const documentId = `doc-${Date.now()}`;
    const fileName = file?.name || (locale === "ar" ? "مستند-ملصق.txt" : "pasted-document.txt");
    const text =
      pastedText.trim() ||
      `Document: ${fileName}\nType: ${docType}\n(No extracted text available — file uploaded in demo mode without OCR. Paste contract text for a fully grounded analysis.)`;

    for (let i = 0; i < STEPS.length; i++) {
      setStepIndex(i);
      await new Promise((r) => setTimeout(r, 650));
    }

    const { clauses, analysis } = await analyzeDocumentAction({
      text,
      fileName,
      documentId,
      userId: session.userId,
      documentType: docType,
      locale: locale as "ar" | "en",
    });

    const doc: LegalDocument = {
      id: documentId,
      userId: session.userId,
      fileName,
      documentType: docType,
      language: locale as "ar" | "en",
      status: "analyzed",
      createdAt: new Date().toISOString(),
    };

    addDocument(doc, clauses, analysis);
    addNotification({
      userId: session.userId,
      type: "analysis_ready",
      titleAr: "تحليل العقد جاهز",
      titleEn: "Contract analysis ready",
      bodyAr: `انتهينا من تحليل "${fileName}"`,
      bodyEn: `We finished analyzing "${fileName}"`,
      read: false,
      isDemo: true,
      href: `/citizen/analyze/${documentId}`,
    });

    router.push(`/citizen/analyze/${documentId}`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  if (phase === "processing") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-24 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-navy text-gold"
        >
          <Sparkles className="h-7 w-7" />
        </motion.div>
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
                {tProcessing(step)}
              </span>
            </div>
          ))}
        </div>
        <Progress value={((stepIndex + 1) / STEPS.length) * 100} className="mt-8" />
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
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragOver ? "border-gold bg-gold/5" : "border-border hover:bg-surface-muted/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
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

          <div className="space-y-1.5">
            <Label>{t("orPasteText")}</Label>
            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={t("pasteTextPlaceholder")}
              className="min-h-32"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("documentType")}</Label>
            <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
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
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-foreground-muted">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t("privacyNotice")}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" onClick={runAnalysis} disabled={!file && !pastedText.trim()}>
              {t("analyzeButton")}
            </Button>
            <Button variant="outline" className="flex-1" onClick={useDemo}>
              {t("useDemo")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
