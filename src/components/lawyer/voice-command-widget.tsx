"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Mic, Sparkles, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { processVoiceCommandAction } from "@/lib/ai/actions";
import { VoiceCommandResult } from "@/lib/ai/engine";
import { useSession } from "@/lib/auth/use-session";
import { useAppStore } from "@/lib/store/app-store";

const DEMO_TRANSCRIPTS_AR = [
  "ذكرني أتواصل مع أحمد بكرة الساعة 11",
  "ذكرني أتواصل مع سلمى اليوم الساعة 3",
];
const DEMO_TRANSCRIPTS_EN = ["Remind me to call Ahmad tomorrow at 11", "Remind me to follow up with Salma today at 3"];

export function VoiceCommandWidget() {
  const t = useTranslations("lawyer.voice");
  const locale = useLocale();
  const { session } = useSession();
  const addAppointment = useAppStore((s) => s.addAppointment);

  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<VoiceCommandResult | null>(null);

  const startListening = async () => {
    setListening(true);
    setResult(null);
    const demo = locale === "ar" ? DEMO_TRANSCRIPTS_AR : DEMO_TRANSCRIPTS_EN;
    const pick = demo[Math.floor(Math.random() * demo.length)];
    await new Promise((r) => setTimeout(r, 1400));
    setTranscript(pick);
    setListening(false);
    setProcessing(true);
    const res = await processVoiceCommandAction(pick);
    setResult(res);
    setProcessing(false);
  };

  const confirm = () => {
    if (!session || !result) return;
    const start = new Date();
    if (result.date === "tomorrow") start.setDate(start.getDate() + 1);
    addAppointment({
      clientId: "voice-entry",
      clientName: result.clientName || "—",
      lawyerId: session.userId,
      title: locale === "ar" ? `تذكير: التواصل مع ${result.clientName || ""}` : `Reminder: follow up with ${result.clientName || ""}`,
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + 15 * 60000).toISOString(),
      type: "follow_up",
      status: "confirmed",
      notes: transcript,
    });
    toast.success(t("create"));
    setResult(null);
    setTranscript("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mic className="h-4.5 w-4.5 text-gold" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-foreground-muted">{t("subtitle")}</p>

        <div className="flex items-center gap-3">
          <button
            onClick={startListening}
            disabled={listening || processing}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors ${
              listening ? "animate-pulse bg-risk-high text-white" : "bg-navy text-gold hover:bg-navy-light"
            }`}
          >
            <Mic className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <Input value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder={t("transcript")} readOnly={listening} />
          </div>
        </div>

        {listening && <p className="text-sm text-foreground-muted">{t("listening")}</p>}
        {processing && (
          <p className="flex items-center gap-1.5 text-sm text-foreground-muted">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-gold" />
            {t("processing")}
          </p>
        )}

        {result && result.action === "reminder" && !processing && (
          <div className="space-y-2 rounded-xl border border-gold/30 bg-gold/5 p-4">
            <p className="text-sm font-medium">{t("suggestedReminder")}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{t("client")}: {result.clientName || "—"}</Badge>
              <Badge variant="outline">{t("when")}: {result.date} {result.time}</Badge>
            </div>
            <Button size="sm" variant="gold" onClick={confirm}>
              <Check className="h-3.5 w-3.5" />
              {t("confirmAction")}
            </Button>
          </div>
        )}

        <p className="text-[11px] text-foreground-muted">{t("simulatedNotice")}</p>
      </CardContent>
    </Card>
  );
}
