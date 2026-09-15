"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { FlaskConical, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RiskBadge } from "@/components/shared/risk-badge";
import { simulateScenarioAction } from "@/lib/ai/actions";
import { legalSources } from "@/lib/mock-data";
import { DocumentClause } from "@/types";

interface ScenarioOutcome {
  question: string;
  consequence: string;
  affectedClause?: DocumentClause;
  questions: string[];
}

export function ScenarioSimulatorPanel({ clauses }: { clauses: DocumentClause[] }) {
  const t = useTranslations("citizen.scenario");
  const tAsk = useTranslations("citizen.askTheLaw");
  const locale = useLocale();
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScenarioOutcome | null>(null);

  const presets = ["leaveEarly", "notPay", "damage"] as const;

  const run = async (question: string) => {
    setLoading(true);
    setResult(null);
    const res = await simulateScenarioAction({
      question,
      clauses,
      sources: legalSources,
      locale: locale as "ar" | "en",
    });
    await new Promise((r) => setTimeout(r, 500));
    setResult({
      question,
      consequence: locale === "ar" ? res.consequenceAr : res.consequenceEn,
      affectedClause: clauses.find((c) => c.id === res.affectedClauseId),
      questions: locale === "ar" ? res.questionsAr : res.questionsEn,
    });
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground-muted">{t("subtitle")}</p>

      <div className="grid gap-2 sm:grid-cols-3">
        {presets.map((key) => (
          <Button key={key} variant="outline" className="h-auto justify-start whitespace-normal py-3 text-start" onClick={() => run(t(`presets.${key}`))}>
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
