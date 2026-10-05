"use client";
import { DataLoadError } from "@/components/shared/data-load-error";
import { toast } from "sonner";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { FlaskConical, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RiskBadge } from "@/components/shared/risk-badge";
import { simulateScenarioAction } from "@/lib/ai/actions";
import { useSession } from "@/lib/auth/use-session";
import { useAiHistory } from "@/lib/data/hooks";
import { saveAiHistory } from "@/lib/data/actions";
import { curatedSources as legalSources } from "@/lib/legal/corpus";
import { useDemoStore } from "@/lib/demo/store";
import { DocumentClause } from "@/types";

interface ScenarioOutcome {
  question: string;
  consequence: string;
  affectedClause?: DocumentClause;
  questions: string[];
}

export function ScenarioSimulatorPanel({ clauses, documentId }: { clauses: DocumentClause[]; documentId?: string }) {
  const {session}=useSession();
  return <ScopedScenarioPanel key={`${session?.userId}:${documentId||"general"}`} clauses={clauses} documentId={documentId}/>;
}

function ScopedScenarioPanel({ clauses, documentId }: { clauses: DocumentClause[]; documentId?: string }) {
  const t = useTranslations("citizen.scenario");
  const tAsk = useTranslations("citizen.askTheLaw");
  const locale = useLocale();
  const tCommon=useTranslations("common.status");
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScenarioOutcome | null>(null);
  const { session } = useSession();
  const { data: history, refetch: refetchHistory, loading:historyLoading,error:historyError } = useAiHistory("scenario", documentId);

  const showSaved = (h: (typeof history)[number]) => {
    const a = h.answer as { consequence?: string; affectedClauseId?: string; questions?: string[] };
    setResult({
      question: h.prompt,
      consequence: a.consequence ?? "",
      affectedClause: clauses.find((c) => c.id === a.affectedClauseId),
      questions: a.questions ?? [],
    });
  };

  const presets = ["leaveEarly", "notPay", "damage"] as const;

  const run = async (question: string) => {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
    const res = await simulateScenarioAction({
      documentId,
      documentText: useDemoStore.getState().documents.find(d=>d.id===documentId)?.citizenDescription,
      question,
      clauses,
      sources: legalSources,
      locale: locale as "ar" | "en",
    });
    const outcome: ScenarioOutcome = {
      question,
      consequence: locale === "ar" ? res.consequenceAr : res.consequenceEn,
      affectedClause: clauses.find((c) => c.id === res.affectedClauseId),
      questions: locale === "ar" ? res.questionsAr : res.questionsEn,
    };
    setResult(outcome);

    if (session) {
      try {
      const saved=await saveAiHistory({
        userId: session.userId,
        kind: "scenario",
        documentId,
        prompt: question,
        answer: { consequence: outcome.consequence, affectedClauseId: res.affectedClauseId ?? null, questions: outcome.questions },
      });
      if(saved.ok)await refetchHistory();
      else toast.warning(locale==="ar"?"تعذر حفظ النتيجة.":"Unable to save this result.");
      }catch{toast.warning(locale==="ar"?"تعذر حفظ النتيجة.":"Unable to save this result.");}
    }
    } catch { toast.error(locale === "ar" ? "تعذر الحصول على نتيجة. لم تُنشأ نتيجة بديلة. حاول مجدداً." : "Unable to obtain an AI result. No substitute was generated. Please retry."); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      {historyError?<DataLoadError/>:historyLoading&&!history.length?<p role="status">{tCommon("loading")}</p>:null}
      <p className="text-sm text-foreground-muted">{t("subtitle")}</p>

      <div className="grid gap-2 sm:grid-cols-3">
        {presets.map((key) => (
          <Button
            key={key}
            variant="outline"
            className="h-auto justify-start whitespace-normal py-3 text-start"
            onClick={() => run(t(`presets.${key}`))}
            disabled={loading}
          >
            <FlaskConical className="h-4 w-4 shrink-0 text-gold" />
            {t(`presets.${key}`)}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={t("customPlaceholder")} />
        <Button onClick={() => custom.trim() && run(custom.trim())} disabled={!custom.trim() || loading}>
          {t("run")}
        </Button>
      </div>

      {history.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground-muted">{t("history")}</p>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 6).map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => showSaved(h)}
                className="max-w-full truncate rounded-full border border-border px-3 py-1 text-xs text-foreground-muted hover:bg-surface-muted"
              >
                {h.prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <Sparkles className="h-4 w-4 animate-pulse text-gold" />
          {t("run")}...
        </div>
      )}

      {result && !loading && (
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="space-y-3 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gold">{t("disclaimer")}</p>
            <p className="text-sm font-medium">{result.question}</p>
            <p className="text-sm text-foreground-muted">{result.consequence}</p>

            {result.affectedClause && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                <RiskBadge level={result.affectedClause.riskLevel} />
                <span className="text-xs text-foreground-muted">
                  {t("affectedClause")}: #{result.affectedClause.clauseNumber}
                </span>
              </div>
            )}

            {result.questions.length > 0 && (
              <div>
                <p className="text-sm font-medium">{t("questionsToAsk")}</p>
                <ul className="mt-1.5 space-y-1 text-sm text-foreground-muted">
                  {result.questions.map((q, i) => (
                    <li key={i}>• {q}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button asChild size="sm" variant="gold">
              <Link href="/lawyers">{tAsk("talkToLawyer")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
