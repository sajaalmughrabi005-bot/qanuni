"use client";
import { DataLoadError } from "@/components/shared/data-load-error";
import { toast } from "sonner";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { FlaskConical, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LegalEvidence } from "./legal-evidence";
import { RiskBadge } from "@/components/shared/risk-badge";
import { simulateScenarioAction } from "@/lib/ai/actions";
import { readScenarioHistory } from "@/lib/ai/scenario-history";
import { useSession } from "@/lib/auth/use-session";
import { useAiHistory } from "@/lib/data/hooks";
import { saveAiHistory } from "@/lib/data/actions";
import { curatedSources as legalSources } from "@/lib/legal/corpus";
import { useDemoStore } from "@/lib/demo/store";
import type { DocumentClause, DocumentType } from "@/types";

interface ScenarioOutcome {
  question: string;
  consequence: string;
  affectedClause?: DocumentClause;
  questions: string[];
  sourceIds: string[];
}

export function ScenarioSimulatorPanel({ clauses, documentId, documentType }: { clauses: DocumentClause[]; documentId?: string; documentType?: DocumentType }) {
  const {session}=useSession();
  return <ScopedScenarioPanel key={`${session?.userId}:${documentId||"general"}`} clauses={clauses} documentId={documentId} documentType={documentType}/>;
}

function ScopedScenarioPanel({ clauses, documentId, documentType }: { clauses: DocumentClause[]; documentId?: string; documentType?: DocumentType }) {
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
    const a = readScenarioHistory(h.answer, clauses.map(c => c.id));
    if (!a) { toast.error(locale === "ar" ? "تعذر قراءة النتيجة المحفوظة؛ لم تُنشأ نتيجة بديلة." : "Unable to read the saved result; no substitute was generated."); return; }
    setResult({
      question: h.prompt,
      consequence: a.consequence ?? "",
      affectedClause: clauses.find((c) => c.id === a.affectedClauseId),
      questions: a.questions ?? [],
      sourceIds: a.sourceIds ?? [],
    });
  };

  const presets = documentType === "employment"
    ? locale === "ar" ? ["شو بصير لو صاحب العمل أنهى العقد؟", "شو بصير لو تركت الشغل قبل انتهاء العقد؟", "شو بصير لو تأخر راتبي؟"] : ["What if my employer ends the contract?", "What if I leave before the contract ends?", "What if my salary is delayed?"]
    : documentType === "rental" ? [t("presets.leaveEarly"), t("presets.notPay"), t("presets.damage")]
    : locale === "ar" ? ["شو بصير لو الطرف الآخر أنهى العقد؟", "شو بصير لو تأخر الدفع المذكور؟", "شو بصير لو اختلفنا على معنى البند؟"] : ["What if the other party ends the contract?", "What if the stated payment is delayed?", "What if we disagree on the clause meaning?"];

  const run = async (question: string) => {
    if (loading || !question.trim() || question.length > 4000) return;
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
      sourceIds: res.sourceIds,
    };
    setResult(outcome);

    if (session) {
      try {
      const saved=await saveAiHistory({
        userId: session.userId,
        kind: "scenario",
        documentId,
        prompt: question,
        answer: { consequence: outcome.consequence, affectedClauseId: res.affectedClauseId ?? null, questions: outcome.questions, sourceIds: outcome.sourceIds, citations: res.citations },
      });
      if(saved.ok)await refetchHistory();
      else toast.warning(locale==="ar"?"تعذر حفظ النتيجة.":"Unable to save this result.");
      }catch{toast.warning(locale==="ar"?"تعذر حفظ النتيجة.":"Unable to save this result.");}
    }
    } catch { toast.error(locale === "ar" ? "تعذر الحصول على نتيجة. لم تُنشأ نتيجة بديلة. حاول مجدداً." : "Unable to obtain an AI result. No substitute was generated. Please retry."); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 pb-20">
      {historyError?<DataLoadError/>:historyLoading&&!history.length?<p role="status">{tCommon("loading")}</p>:null}
      <p className="text-sm text-foreground-muted">{t("subtitle")}</p>
      <p role="note" className="rounded-lg bg-surface-muted p-3 text-sm">{locale === "ar" ? "حدد الافتراض الذي تريد فهمه. الإجابة تفسير آلي محتمل وليست توقعاً لقرار محكمة أو استحقاق تعويض. المصادر والتغطية قد تكون محدودة." : "State the assumption you want to explore. The answer is a possible AI interpretation, not a prediction of a court decision or compensation. Source coverage may be limited."}</p>

      <div className="grid gap-2 sm:grid-cols-3">
        {presets.map((question) => (
          <Button
            key={question}
            variant="outline"
            className="h-auto justify-start whitespace-normal py-3 text-start"
            onClick={() => run(question)}
            disabled={loading}
          >
            <FlaskConical className="h-4 w-4 shrink-0 text-gold" />
            {question}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        <label htmlFor="scenario-question" className="block text-sm font-medium">{locale === "ar" ? "شو بصير لو…؟" : "What would happen if…?"}</label>
        <Textarea id="scenario-question" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={4000} placeholder={t("customPlaceholder")} aria-describedby="scenario-question-limit" disabled={loading}/>
        <p id="scenario-question-limit" className="text-xs text-foreground-muted">{locale === "ar" ? "اكتب سؤالاً محدداً عن المستند. بحد أقصى 4000 حرف." : "Ask a specific question about the document. Maximum 4000 characters."}</p>
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
        <div role="status" className="flex items-center gap-2 text-sm text-foreground-muted">
          <Sparkles className="h-4 w-4 text-gold motion-safe:animate-pulse" />
          {t("run")}...
        </div>
      )}

      {result && !loading && (
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="space-y-3 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gold">{t("disclaimer")}</p>
            <p className="text-sm font-medium">{result.question}</p>
            <p className="whitespace-pre-wrap break-words text-sm text-foreground-muted">{result.consequence}</p>
            {!result.sourceIds.length && <p role="note" className="text-sm">{locale === "ar" ? "لا يوجد استشهاد متحقق لهذه النتيجة؛ لا تفترض أنها حكم قانوني مدعوم." : "There is no checked citation for this result; do not assume it is a supported legal conclusion."}</p>}
            <LegalEvidence sourceIds={result.sourceIds}/>

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

            <Button asChild size="sm" variant="gold" className="text-navy">
              <Link href="/lawyers">{tAsk("talkToLawyer")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
