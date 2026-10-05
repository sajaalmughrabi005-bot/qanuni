"use client";

import { useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Upload, FileText, Sparkles, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractTextFromFileAction } from "@/lib/documents/extract-text";
import { extractCaseDataAction } from "@/lib/ai/actions";
import { useRouter } from "@/i18n/navigation";
import { createManualCase } from "@/lib/data/actions";
import { errorKey } from "@/lib/data/error-key";
import { ExtractedCaseData } from "@/types";

const MAX_TEXT_FILE_BYTES = 10 * 1024 * 1024;

export default function LawyerDocumentsPage() {
  const t = useTranslations("lawyer.dataEntry");
  const tCases = useTranslations("cases");
  const locale = useLocale();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ExtractedCaseData | null>(null);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if(loading) return;
    if (file.size > MAX_TEXT_FILE_BYTES) return toast.error(t("tooLarge"));
    setLoading(true);
    try {
      const fd = new FormData(); fd.set("file", file);
      const res = await extractTextFromFileAction(fd);
      if(res.status !== "ok") return toast.error(locale === "ar" ? res.reasonAr : res.reasonEn);
      if(res.warningAr||res.warningEn)toast.warning(locale==="ar"?res.warningAr:res.warningEn);
      setFileName(file.name); setText(res.text);
      if(res.warningAr || res.warningEn) toast.warning(locale === "ar" ? res.warningAr : res.warningEn);
    } catch { toast.error(locale === "ar" ? "تعذرت قراءة الملف." : "Unable to read file."); } finally { setLoading(false); }
  };

  const extract = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
    const res = await extractCaseDataAction(text.trim());
    setData(res);
    } catch { toast.error(locale === "ar" ? "تعذر الاستخراج بالذكاء الاصطناعي. حاول مجدداً." : "AI extraction failed. Please retry."); } finally { setLoading(false); }
  };

  const confirmSave = async () => {
    if (!data || saving) return;
    setSaving(true);
    const name = data.clientName?.trim() || (locale === "ar" ? "عميل بدون اسم" : "Unnamed client");
    const title =
      locale === "ar"
        ? `قضية مستخرجة${data.caseNumber ? ` — رقم ${data.caseNumber}` : ""}`
        : `Extracted case${data.caseNumber ? ` — No. ${data.caseNumber}` : ""}`;
    try {
    const res = await createManualCase({
      title,
      clientName: name,
      category: "civil",
      summaryAr: `تم استخراج بيانات القضية من مستند: ${name}${data.opposingParty ? ` ضد ${data.opposingParty}` : ""}${data.court ? ` — ${data.court}` : ""}.`,
      summaryEn: `Case data extracted from a document: ${name}${data.opposingParty ? ` vs. ${data.opposingParty}` : ""}${data.court ? ` — ${data.court}` : ""}.`,
      story: text.trim(),
      opposingParty: data.opposingParty,
      keyDates: data.importantDates || [],
      deadline: data.deadline,
    });

    if (!res.ok) return toast.error(tCases(`errors.${errorKey(res.error)}` as "errors.unknown"));
    toast.success(t("confirmSave"));
    router.push(`/lawyer/cases/${res.data}`);
    } catch { toast.error(tCases("errors.unknown")); } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-foreground-muted">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div
            role="button" tabIndex={0} aria-label={t("upload")}
            onKeyDown={(e) => { if(e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border px-6 py-8 text-center hover:bg-surface-muted/60"
          >
            <input ref={fileRef} type="file" accept=".txt,.pdf,.docx,.jpg,.jpeg,.png,.webp" className="hidden" onChange={onPickFile} />
            {fileName ? <FileText className="h-7 w-7 text-gold" /> : <Upload className="h-7 w-7 text-foreground-muted" />}
            <p className="text-sm font-medium">{fileName || t("upload")}</p>
            <p className="text-xs text-foreground-muted">PDF ? DOCX ? TXT ? JPG ? PNG ? WEBP</p>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("pasteHint")}
            className="min-h-28"
            maxLength={240000}
          />
          <Button className="w-full" onClick={extract} disabled={loading || !text.trim()}>
            <Sparkles className="h-4 w-4" />
            {loading ? t("extracting") : t("extractAction")}
          </Button>
          {loading && <p role="status">{t("extracting")}</p>}
        </CardContent>
      </Card>

      {data && !loading && (
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <p className="font-medium">{t("reviewTitle")}</p>

            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("fields.clientName")} value={data.clientName} onChange={(v) => setData({ ...data, clientName: v })} />
              <Field label={t("fields.opposingParty")} value={data.opposingParty} onChange={(v) => setData({ ...data, opposingParty: v })} />
              <Field label={t("fields.caseNumber")} value={data.caseNumber} onChange={(v) => setData({ ...data, caseNumber: v })} />
              <Field label={t("fields.court")} value={data.court} onChange={(v) => setData({ ...data, court: v })} />
              <Field
                label={t("fields.importantDates")}
                value={data.importantDates?.join(", ")}
                onChange={(v) => setData({ ...data, importantDates: v.split(",").map((d) => d.trim()).filter(Boolean) })}
              />
              <Field
                label={t("fields.amounts")}
                value={data.amounts?.join(", ")}
                onChange={(v) => setData({ ...data, amounts: v.split(",").map((d) => d.trim()).filter(Boolean) })}
              />
            </div>
            <Button variant="gold" className="w-full" onClick={confirmSave} disabled={saving}>
              <Check className="h-4 w-4" />
              {t("confirmSave")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
