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
import { Progress } from "@/components/ui/progress";
import { extractCaseDataAction } from "@/lib/ai/actions";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";
import { ExtractedCaseData } from "@/types";

export default function LawyerDocumentsPage() {
  const t = useTranslations("lawyer.dataEntry");
  const locale = useLocale();
  const router = useRouter();
  const { session } = useSession();
  const createCase = useAppStore((s) => s.createCase);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExtractedCaseData | null>(null);

  const extract = async () => {
    setLoading(true);
    const demoContent =
      locale === "ar"
        ? `المدعي: أحمد محمد الزعبي\nالمدعى عليه: محمد علي الحوراني\nرقم الدعوى: 2026/451\nمحكمة: محكمة صلح عمّان\nالمبلغ المطالب به: 1000 دينار\nالتاريخ: 2026/09/15`
        : `client: Ahmad Mohammad Al-Zoubi\nopposing party: Mohammad Ali Al-Hourani\ncase number: 2026/451\ncourt: Amman Magistrate Court\namount claimed: 1000 JOD\ndate: 2026/09/15`;
    const content = text.trim() || demoContent;
    await new Promise((r) => setTimeout(r, 900));
    const res = await extractCaseDataAction(content);
    setData(res);
    setLoading(false);
  };

  const confirmSave = () => {
    if (!data || !session) return;
    const name = data.clientName || (locale === "ar" ? "عميل بدون اسم" : "Unnamed client");
    const newCase = createCase({
      clientId: `extracted-${Date.now()}`,
      clientName: name,
      lawyerId: session.userId,
      title:
        locale === "ar"
          ? `قضية مستخرجة${data.caseNumber ? ` — رقم ${data.caseNumber}` : ""}`
          : `Extracted case${data.caseNumber ? ` — No. ${data.caseNumber}` : ""}`,
      category: "civil",
      status: "new",
      priority: "medium",
      summaryAr: `تم استخراج بيانات القضية من مستند: ${name}${data.opposingParty ? ` ضد ${data.opposingParty}` : ""}${data.court ? ` — ${data.court}` : ""}.`,
      summaryEn: `Case data extracted from a document: ${name}${data.opposingParty ? ` vs. ${data.opposingParty}` : ""}${data.court ? ` — ${data.court}` : ""}.`,
      clientStoryAr: text.trim(),
      clientStoryEn: text.trim(),
      opposingParty: data.opposingParty,
      relevantClauseIds: [],
      documentIds: [],
      keyDatesAr: data.importantDates || [],
      keyDatesEn: data.importantDates || [],
      questionsAr: [],
      questionsEn: [],
      suggestedSpecialty: "civil",
      deadline: data.deadline,
    });
    toast.success(t("confirmSave"));
    router.push(`/lawyer/cases/${newCase.id}`);
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
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border px-6 py-8 text-center hover:bg-surface-muted/60"
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
            />
            {fileName ? <FileText className="h-7 w-7 text-gold" /> : <Upload className="h-7 w-7 text-foreground-muted" />}
            <p className="text-sm font-medium">{fileName || t("upload")}</p>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("pasteHint")}
            className="min-h-28"
          />
          <Button className="w-full" onClick={extract} disabled={loading}>
            <Sparkles className="h-4 w-4" />
            {loading ? t("extracting") : t("upload")}
          </Button>
          {loading && <Progress value={70} />}
        </CardContent>
      </Card>

      {data && !loading && (
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <p className="font-medium">{t("reviewTitle")}</p>
              <span className="text-xs text-foreground-muted">{t("confidence")}: {data.confidence}%</span>
            </div>
            <Progress value={data.confidence} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("fields.clientName")} value={data.clientName} onChange={(v) => setData({ ...data, clientName: v })} />
              <Field label={t("fields.opposingParty")} value={data.opposingParty} onChange={(v) => setData({ ...data, opposingParty: v })} />
              <Field label={t("fields.caseNumber")} value={data.caseNumber} onChange={(v) => setData({ ...data, caseNumber: v })} />
              <Field label={t("fields.court")} value={data.court} onChange={(v) => setData({ ...data, court: v })} />
              <Field label={t("fields.importantDates")} value={data.importantDates?.join(", ")} onChange={() => {}} />
              <Field label={t("fields.amounts")} value={data.amounts?.join(", ")} onChange={() => {}} />
            </div>
            <Button variant="gold" className="w-full" onClick={confirmSave}>
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
