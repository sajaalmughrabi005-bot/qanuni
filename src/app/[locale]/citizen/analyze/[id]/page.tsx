"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { FileQuestion, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { AnalysisExport } from "@/components/citizen/analysis-export";
import { SourceDocument } from "@/components/citizen/source-document";
import { Link } from "@/i18n/navigation";
import { LegalEvidence } from "@/components/citizen/legal-evidence";
import { DocumentOverview } from "@/components/citizen/document-overview";
import { ClauseMap } from "@/components/citizen/clause-map";
import { CaseUnderstanding } from "@/components/citizen/case-understanding";
import { RiskOverview } from "@/components/citizen/risk-overview";
import { AskTheLawPanel } from "@/components/citizen/ask-the-law-panel";
import { ScenarioSimulatorPanel } from "@/components/citizen/scenario-simulator-panel";
import { TermSimplifierCard } from "@/components/citizen/term-simplifier-card";
import { CaseRequestDialog } from "@/components/cases/case-request-dialog";
import { useLawyerDirectory } from "@/lib/auth/use-lawyer";
import { DataLoadError } from "@/components/shared/data-load-error";
import { ResultsSummary, ResultsFindings } from "@/components/citizen/results-brief";
import { useScopedQuery } from "@/lib/data/use-scoped-query";
import { useSession } from "@/lib/auth/use-session";
import { matchLawyersToCase } from "@/lib/ai/engine";
import { governorateKey } from "@/lib/governorates";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapAnalysis, mapClause, mapDocument } from "@/lib/supabase/mappers";
import { demoAnalysis, demoClauses, demoDocument, DEMO_DOCUMENT_ID } from "@/lib/mock-data";
import { useDemoStore } from "@/lib/demo/store";
import { deriveNextSteps, stepText } from "@/lib/legal/next-steps";
import { curatedSources } from "@/lib/legal/corpus";
import type { Analysis, DocumentClause, LegalDocument } from "@/types";

export default function AnalysisResultsPage() {
  const params = useParams<{ id: string }>();
  const locale = useLocale();
  const demoDocuments = useDemoStore(s => s.documents);
  const demoAnalyses = useDemoStore(s => s.analyses);
  const demoLiveClauses = useDemoStore(s => s.clauses);
  const t = useTranslations("citizen.results");
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("risk");
  const { session,loading:sessionLoading,isDemo: demoSession, profile } = useSession();
  const { lawyers,error:directoryError,loading:directoryLoading,refetch:retryDirectory } = useLawyerDirectory();
  // The bundled sample analysis is only reachable from the isolated demo, never from a real account.
  const isDemo = demoSession;
  const isSample = isDemo && params.id === DEMO_DOCUMENT_ID;
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const key=JSON.stringify([session?.userId,params.id]);
  const read=useCallback(async()=>{
    if(!supabase)throw new Error("not_configured");
    const [docRes,clausesRes,analysisRes]=await Promise.all([
      supabase.from("documents").select("*").eq("id",params.id).single(),
      supabase.from("document_clauses").select("*").eq("document_id",params.id),
      supabase.from("analyses").select("*").eq("document_id",params.id).single(),
    ]);
    if(docRes.error||clausesRes.error||analysisRes.error||!docRes.data||!analysisRes.data)throw new Error("query_failed");
    return {document:mapDocument(docRes.data),clauses:(clausesRes.data||[]).map(mapClause),analysis:mapAnalysis(analysisRes.data)};
  },[supabase,params.id]);
  const real=useScopedQuery<{document:LegalDocument;clauses:DocumentClause[];analysis:Analysis}|undefined>(key,isDemo||sessionLoading?null:read,undefined);
  const document = isDemo ? (isSample ? demoDocument : demoDocuments.find(d => d.id === params.id)) : real.data?.document;
  const clauses = isDemo ? (isSample ? demoClauses : demoLiveClauses.filter(c => c.documentId === params.id)) : real.data?.clauses||[];
  const analysis = isDemo ? (isSample ? demoAnalysis : demoAnalyses.find(a => a.documentId === params.id)) : real.data?.analysis;
  const loading=real.loading,loadError=real.error;

  const suggestions = useMemo(() => {
    if (!document) return [];
    const category = ({ rental: "rental", employment: "employment", sale: "commercial", service: "commercial", general: "civil" } as const)[document.documentType];
    return matchLawyersToCase(lawyers.filter((l) => l.acceptingNewCases).map((l) => ({ ...l, city: governorateKey(l.city) ?? l.city })), category, governorateKey(profile?.city) ?? profile?.city, "ar").slice(0, 6);
  }, [lawyers, document, profile?.city]);

  if (loading && !isDemo) return <p role="status">{locale === "ar" ? "جارٍ تحميل النتيجة…" : "Loading result…"}</p>;
  if(loadError && !isDemo) return <DataLoadError onRetry={real.refetch}/>;

  if (!document || !analysis) {
    return <EmptyState icon={FileQuestion} title={t("overview")} className="mx-auto mt-12 max-w-lg" />;
  }

  const riskOrder = { high: 0, unknown: 1, medium: 2, low: 3 };
  const sortedClauses = [...clauses].sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
  const ar=locale==="ar";
  const questions=ar?analysis.questionsForLawyerAr:analysis.questionsForLawyerEn;
  const nextSteps = deriveNextSteps(document, analysis, clauses, curatedSources);
  // Presentation only: native disclosure reveals the existing viewer. Focus a clause
  // only if that viewer's unchanged exact-text validator actually rendered its marker.
  const viewOriginal = (clause?: DocumentClause) => {
    setActiveTab("risk");
    requestAnimationFrame(() => {
      const original = window.document.getElementById("original-document") as HTMLDetailsElement | null;
      if (!original) return;
      original.open = true;
      const match = clause && Array.from(original.querySelectorAll<HTMLButtonElement>("[data-source-clause]")).find(node => node.dataset.sourceClause === clause.id);
      const target = match || original.querySelector("summary");
      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ResultsSummary document={document} analysis={analysis} clauses={clauses}/>
      <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer font-medium">{ar?"معلومات المستند":"Document information"}</summary><div className="mt-4"><DocumentOverview document={document}/></div></details>
      <AnalysisExport document={document} analysis={analysis} clauses={clauses}/>
      {isSample && <p role="note">{locale === "ar" ? "مثال ثابت للتوضيح — ليس تحليلاً لمستندك." : "Static illustration — this is not an analysis of your document."}</p>}


      <div className="text-sm"><button type="button" className="underline underline-offset-4" onClick={() => viewOriginal()}>{ar?"عرض المستند الأصلي":"View original document"}</button></div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="risk">{t("tabRisk")}</TabsTrigger>
          <TabsTrigger value="summary">{t("tabSummary")}</TabsTrigger>
          <TabsTrigger value="ask">{ar?"اسأل حق":t("tabAsk")}</TabsTrigger>
          <TabsTrigger value="scenario">{ar?"شو بصير لو…؟":t("tabScenario")}</TabsTrigger>
        </TabsList>

        <TabsContent value="risk" className="space-y-6">
          <ResultsFindings document={document} analysis={analysis} clauses={clauses} onViewOriginalAction={viewOriginal}/>
          <section data-next-actions className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <h2 className="text-base font-semibold">{ar?"خطوتك التالية":"Your next step"}</h2>
            <ul className="mt-3 list-disc space-y-2 ps-5 text-sm text-foreground-muted">{nextSteps.generalSteps.filter(s => s.category !== "information").map(s => <li key={s.category}>{stepText(s, ar ? "ar" : "en")}</li>)}
              {!nextSteps.generalSteps.some(s => s.category === "professional_review") && <li>{ar ? "ناقش البنود وأثرها على ظروفك مع محامٍ قبل اتخاذ قرار." : "Discuss these clauses and their effect on your circumstances with a lawyer before deciding."}</li>}
            </ul>
            <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">{ar ? "أسئلة وخيارات التواصل" : "Questions and contact options"}</summary>
              {questions.length>0&&<div className="mt-3"><h3 className="font-medium">{t("questionsForLawyer")}</h3><ul className="mt-2 list-disc space-y-2 ps-5">{questions.map((q,i)=><li key={i}>{q}</li>)}</ul></div>}
              <Link href="/lawyers" className="mt-3 inline-block underline underline-offset-4">{ar ? "تصفح دليل المحامين" : "Browse the lawyer directory"}</Link>
            </details>
            {directoryError?<div className="mt-4"><DataLoadError onRetry={retryDirectory}/></div>:directoryLoading?<p role="status" className="mt-3 text-sm">{ar?"جارٍ تحميل المحامين…":"Loading lawyers…"}</p>:null}
            <p className="mt-3 text-xs text-foreground-muted">{t("createCaseDesc")}</p>
            <Button variant="gold" className="mt-4 text-navy" onClick={() => setCaseDialogOpen(true)}>
              <Briefcase className="h-4 w-4" />
              {t("createCase")}
            </Button>
          </section>
          <LegalEvidence sourceIds={(analysis.legalSources||[]).map(s=>s.id)}/>
          <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer font-medium">{ar?"التفاصيل المتقدمة وجميع البنود":"Advanced details and all clauses"}</summary><div className="mt-5 space-y-5"><RiskOverview analysis={analysis}/><ClauseMap clauses={sortedClauses}/></div></details>
          <details id="original-document" className="rounded-xl border border-border bg-surface p-4"><summary className="cursor-pointer font-medium">{ar ? "النص الأصلي والتظليل" : "Original text and highlights"}</summary><div className="mt-4"><SourceDocument document={document} clauses={clauses}/></div></details>
        </TabsContent>
        <TabsContent value="summary" className="space-y-4">
          <CaseUnderstanding analysis={analysis} />
          <TermSimplifierCard />
        </TabsContent>
        <TabsContent value="ask">
          <AskTheLawPanel clauses={clauses} documentId={document.id} />
        </TabsContent>
        <TabsContent value="scenario">
          <ScenarioSimulatorPanel clauses={clauses} documentId={document.id} documentType={document.documentType} />
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
