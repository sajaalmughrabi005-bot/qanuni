"use client";

import { useEffect, useRef, useState } from "react";
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
import { useMyLawyer } from "@/lib/auth/use-lawyer";
import { addAppointment } from "@/lib/data/actions";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: { transcript: string }[][] } & Record<string, unknown>) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceCommandWidget() {
  const t = useTranslations("lawyer.voice");
  const locale = useLocale();
  const { session } = useSession();
  const { lawyer } = useMyLawyer();

  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<VoiceCommandResult | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => setSpeechSupported(!!getSpeechRecognition()));
  }, []);

  const finishTranscript = async (text: string) => {
    setTranscript(text);
    setListening(false);
    setProcessing(true);
    const res = await processVoiceCommandAction(text);
    setResult(res);
    setProcessing(false);
  };

  const startListening = async () => {
    setResult(null);
    const SpeechRecognitionCtor = getSpeechRecognition();

    // No fake transcript: without browser speech recognition the lawyer types the command instead.
    if (!SpeechRecognitionCtor) return;

    try {
      const recognition = new SpeechRecognitionCtor();
      // "ar-SA" is the most broadly supported Arabic locale across browsers'
      // speech engines; regional accents (Jordanian included) are still
      // recognized fine since the transcript is only used for keyword parsing.
      recognition.lang = locale === "ar" ? "ar-SA" : "en-US";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const text = event.results?.[0]?.[0]?.transcript || "";
        if (text) finishTranscript(text);
        else setListening(false);
      };
      recognition.onerror = (event) => {
        setListening(false);
        const errorCode = event?.error;
        if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
          toast.error(t("micPermissionDenied"));
        } else if (errorCode === "no-speech") {
          toast.error(t("micNoSpeech"));
        } else {
          toast.error(t("micError"));
        }
        if (process.env.NODE_ENV !== "production") {
          console.warn("SpeechRecognition error:", errorCode);
        }
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      toast.error(t("micError"));
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const confirm = async () => {
    if (!session || !lawyer || !result) return;
    if (!lawyer.id) return;
    const start = new Date();
    if (result.date === "tomorrow") start.setDate(start.getDate() + 1);
    const saved = await addAppointment({
      clientId: session.userId,
      clientName: result.clientName || "—",
      lawyerId: lawyer.id,
      title: locale === "ar" ? `تذكير: التواصل مع ${result.clientName || ""}` : `Reminder: follow up with ${result.clientName || ""}`,
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + 15 * 60000).toISOString(),
      type: "follow_up",
      status: "confirmed",
      notes: transcript,
    });
    if (!saved.ok) return toast.error(t("micError"));
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
            onClick={listening ? stopListening : startListening}
            disabled={processing || !speechSupported}
            aria-label={t("title")}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors ${
              listening ? "animate-pulse bg-risk-high text-white" : "bg-navy text-gold hover:bg-navy-light"
            }`}
          >
            <Mic className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <Input
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={t("transcript")}
              readOnly={listening}
              maxLength={300}
            />
          </div>
          <Button size="sm" variant="outline" disabled={processing || listening || !transcript.trim()} onClick={() => finishTranscript(transcript.trim())}>
            {t("analyzeText")}
          </Button>
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

        {result && result.action === "unknown" && !processing && (
          <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm text-foreground-muted">
            {t("notUnderstood")}
          </div>
        )}

        <p className="text-[11px] text-foreground-muted">
          {speechSupported ? t("realMicNotice") : t("simulatedNotice")}
        </p>
      </CardContent>
    </Card>
  );
}
