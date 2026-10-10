"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { FileQuestion, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { AiDisclaimer } from "@/components/shared/ai-disclaimer";
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ResultsSummary document={document} analysis={analysis} clauses={clauses}/>
      <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer font-medium">{ar?"معلومات المستند":"Document information"}</summary><div className="mt-4"><DocumentOverview document={document}/></div></details>
      <AiDisclaimer />
      <AnalysisExport document={document} analysis={analysis} clauses={clauses}/>
      {isSample && <p role="note">{locale === "ar" ? "مثال ثابت للتوضيح — ليس تحليلاً لمستندك." : "Static illustration — this is not an analysis of your document."}</p>}


      <div className="flex flex-wrap gap-3 text-sm"><button type="button" className="underline underline-offset-4" onClick={() => {
        setActiveTab("risk");
        requestAnimationFrame(() => window.document.getElementById("original-document")?.scrollIntoView());
      }}>{ar?"عرض المستند الأصلي":"View original document"}</button><Link href="/lawyers" className="underline underline-offset-4">{ar?"تواصل مع محامٍ":"Contact a lawyer"}</Link></div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="risk">{t("tabRisk")}</TabsTrigger>
          <TabsTrigger value="summary">{t("tabSummary")}</TabsTrigger>
          <TabsTrigger value="ask">{ar?"اسأل حق":t("tabAsk")}</TabsTrigger>
          <TabsTrigger value="scenario">{ar?"شو بصير لو…؟":t("tabScenario")}</TabsTrigger>
        </TabsList>

        <TabsContent value="risk" className="space-y-6">
          <ResultsFindings document={document} analysis={analysis} clauses={clauses}/>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-semibold">{ar?"خطوتك التالية":"Your next step"}</h2>
            <p className="mb-3 text-sm text-foreground-muted">{ar?"قارن الشرح بالنص الأصلي، واطلب توضيح البنود غير المفهومة. يمكن لمحامٍ مراجعة أثرها على ظروفك قبل التوقيع أو التصرف.":"Compare this explanation with the original and ask about unclear terms. A lawyer can review their effect on your circumstances before you sign or act."}</p>
            {questions.length>0&&<details className="mb-4 text-sm"><summary className="cursor-pointer">{t("questionsForLawyer")}</summary><ul className="mt-3 list-disc space-y-2 ps-5">{questions.map((q,i)=><li key={i}>{q}</li>)}</ul></details>}
            <Button asChild variant="outline"><Link href="/lawyers">{locale === "ar" ? "\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u062d\u0627\u0645\u064d" : "Find a lawyer"}</Link></Button>
            {directoryError?<div className="mt-4"><DataLoadError onRetry={retryDirectory}/></div>:directoryLoading?<p role="status" className="mt-3 text-sm">{ar?"جارٍ تحميل المحامين…":"Loading lawyers…"}</p>:null}
            <p className="mt-3 font-semibold">{t("createCase")}</p>
            <p className="mt-1 text-sm text-foreground-muted">{t("createCaseDesc")}</p>
            <Button variant="gold" className="mt-4 text-navy" onClick={() => setCaseDialogOpen(true)}>
              <Briefcase className="h-4 w-4" />
              {t("createCase")}
            </Button>
          </div>
          <LegalEvidence sourceIds={(analysis.legalSources||[]).map(s=>s.id)}/>
          <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer font-medium">{ar?"التفاصيل المتقدمة وجميع البنود":"Advanced details and all clauses"}</summary><div className="mt-5 space-y-5"><RiskOverview analysis={analysis}/><ClauseMap clauses={sortedClauses}/></div></details>
          <div id="original-document"><SourceDocument document={document} clauses={clauses}/></div>
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
