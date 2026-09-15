"use client";

import { useState } from "react";
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
import { CreateCaseDialog } from "@/components/citizen/create-case-dialog";
import { useAppStore } from "@/lib/store/app-store";

export default function AnalysisResultsPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("citizen.results");
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);

  const documents = useAppStore((s) => s.documents);
  const allClauses = useAppStore((s) => s.clauses);
  const analyses = useAppStore((s) => s.analyses);

  const document = documents.find((d) => d.id === params.id);
  const clauses = allClauses.filter((c) => c.documentId === params.id);
  const analysis = analyses.find((a) => a.documentId === params.id);

  if (!document || !analysis) {
    return <EmptyState icon={FileQuestion} title={t("overview")} className="mx-auto mt-12 max-w-lg" />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <DocumentOverview document={document} />
      <AiDisclaimer />

      <Tabs defaultValue="clauses">
        <TabsList className="flex-wrap">
          <TabsTrigger value="clauses">{t("tabClauses")}</TabsTrigger>
          <TabsTrigger value="summary">{t("tabSummary")}</TabsTrigger>
          <TabsTrigger value="risk">{t("tabRisk")}</TabsTrigger>
          <TabsTrigger value="ask">{t("tabAsk")}</TabsTrigger>
          <TabsTrigger value="scenario">{t("tabScenario")}</TabsTrigger>
        </TabsList>

        <TabsContent value="clauses">
          <ClauseMap clauses={clauses} />
        </TabsContent>
        <TabsContent value="summary" className="space-y-4">
          <CaseUnderstanding analysis={analysis} />
          <TermSimplifierCard />
        </TabsContent>
        <TabsContent value="risk">
          <RiskOverview analysis={analysis} />
        </TabsContent>
        <TabsContent value="ask">
          <AskTheLawPanel documentId={document.id} clauses={clauses} />
        </TabsContent>
        <TabsContent value="scenario">
          <ScenarioSimulatorPanel clauses={clauses} />
        </TabsContent>
      </Tabs>

      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-6 text-center">
        <p className="font-semibold">{t("createCase")}</p>
        <p className="mt-1 text-sm text-foreground-muted">{t("createCaseDesc")}</p>
        <Button variant="gold" className="mt-4" onClick={() => setCaseDialogOpen(true)}>
          <Briefcase className="h-4 w-4" />
          {t("createCase")}
        </Button>
      </div>

      <CreateCaseDialog
        document={document}
        analysis={analysis}
        clauses={clauses}
        open={caseDialogOpen}
        onOpenChange={setCaseDialogOpen}
      />
    </div>
  );
}
