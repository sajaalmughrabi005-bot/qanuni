"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileQuestion, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { AiDisclaimer } from "@/components/shared/ai-disclaimer";
import { DocumentOverview } from "@/components/citizen/document-overview";
import { ClauseMap } from "@/components/citizen/clause-map";
import { CaseUnderstanding } from "@/components/citizen/case-understanding";
import { RiskOverview } from "@/components/citizen/risk-overview";
import { AskTheLawPanel } from "@/components/citizen/ask-the-law-panel";
import { ScenarioSimulatorPanel } from "@/components/citizen/scenario-simulator-panel";
import { TermSimplifierCard } from "@/components/citizen/term-simplifier-card";
import { CaseRequestDialog } from "@/components/cases/case-request-dialog";
import { useLawyerDirectory } from "@/lib/auth/use-lawyer";
import { useSession } from "@/lib/auth/use-session";
import { matchLawyersToCase } from "@/lib/ai/engine";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapAnalysis, mapClause, mapDocument } from "@/lib/supabase/mappers";
import { demoAnalysis, demoClauses, demoDocument, DEMO_DOCUMENT_ID } from "@/lib/mock-data";
import type { Analysis, DocumentClause, LegalDocument } from "@/types";

export default function AnalysisResultsPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("citizen.results");
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const { isDemo: demoSession, profile } = useSession();
  const { lawyers } = useLawyerDirectory();
  // The bundled sample analysis is only reachable from the isolated demo, never from a real account.
  const isDemo = demoSession && params.id === DEMO_DOCUMENT_ID;
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [document, setDocument] = useState<LegalDocument | undefined>(isDemo ? demoDocument : undefined);
  const [clauses, setClauses] = useState<DocumentClause[]>(isDemo ? demoClauses : []);
  const [analysis, setAnalysis] = useState<Analysis | undefined>(isDemo ? demoAnalysis : undefined);
  const [loading, setLoading] = useState(!isDemo && !!supabase);

  useEffect(() => {
    if (isDemo || !params.id || !supabase) return;
    Promise.all([
      supabase.from("documents").select("*").eq("id", params.id).single(),
      supabase.from("document_clauses").select("*").eq("document_id", params.id),
      supabase.from("analyses").select("*").eq("document_id", params.id).single(),
    ]).then(([docRes, clausesRes, analysisRes]) => {
      setDocument(docRes.data ? mapDocument(docRes.data) : undefined);
      setClauses((clausesRes.data || []).map(mapClause));
      setAnalysis(analysisRes.data ? mapAnalysis(analysisRes.data) : undefined);
      setLoading(false);
    });
  }, [params.id, isDemo, supabase]);

  const suggestions = useMemo(() => {
    if (!document) return [];
    const category = ({ rental: "rental", employment: "employment", sale: "commercial", service: "commercial", general: "civil" } as const)[document.documentType];
    return matchLawyersToCase(lawyers.filter((l) => l.acceptingNewCases), category, profile?.city, "ar").slice(0, 6);
  }, [lawyers, document, profile?.city]);

  if (loading) return null;

  if (!document || !analysis) {
    return <EmptyState icon={FileQuestion} title={t("overview")} className="mx-auto mt-12 max-w-lg" />;
  }

  const riskOrder = { high: 0, medium: 1, low: 2 };
  const sortedClauses = [...clauses].sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <DocumentOverview document={document} />
      <AiDisclaimer />

      <Tabs defaultValue="risk">
        <TabsList className="flex-wrap">
          <TabsTrigger value="risk">{t("tabRisk")}</TabsTrigger>
          <TabsTrigger value="summary">{t("tabSummary")}</TabsTrigger>
          <TabsTrigger value="ask">{t("tabAsk")}</TabsTrigger>
          <TabsTrigger value="scenario">{t("tabScenario")}</TabsTrigger>
        </TabsList>

        <TabsContent value="risk" className="space-y-6">
          <RiskOverview analysis={analysis} />
          <div>
            <h2 className="mb-3 text-base font-semibold">{t("clauseMap")}</h2>
            <ClauseMap clauses={sortedClauses} />
          </div>
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-6 text-center">
            <p className="font-semibold">{t("createCase")}</p>
            <p className="mt-1 text-sm text-foreground-muted">{t("createCaseDesc")}</p>
            <Button variant="gold" className="mt-4" onClick={() => setCaseDialogOpen(true)}>
              <Briefcase className="h-4 w-4" />
              {t("createCase")}
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="summary" className="space-y-4">
          <CaseUnderstanding analysis={analysis} />
          <TermSimplifierCard />
        </TabsContent>
        <TabsContent value="ask">
          <AskTheLawPanel clauses={clauses} documentId={document.id} />
        </TabsContent>
        <TabsContent value="scenario">
          <ScenarioSimulatorPanel clauses={clauses} documentId={document.id} />
        </TabsContent>
      </Tabs>

      <CaseRequestDialog
        open={caseDialogOpen}
        onOpenChange={setCaseDialogOpen}
        suggestions={suggestions}
        prefill={{ document, analysis, clauses }}
      />
    </div>
  );
}
