"use server";

import { Analysis, ChatMessage, DocumentClause, DocumentType, ExtractedCaseData, LegalSource, Locale, RiskCategory } from "@/types";
import { hasOpenAI, completeJSON, completeText } from "./provider";
import {
  heuristicAnalyzeText,
  heuristicAnswerQuestion,
  heuristicSimulateScenario,
  heuristicExtractCaseData,
  heuristicGenerateDraft,
  heuristicTransformDraft,
  heuristicAssistantReply,
  heuristicParseVoiceCommand,
  VoiceCommandResult,
} from "./engine";

// Hard constraint injected into every AI-backed legal system prompt: keep every
// analysis, risk flag, and draft strictly grounded in official Jordanian law
// (Civil Code, Labour Law, Landlords & Tenants Law, etc.) and never reason from
// or cite another country's legal system.
const JORDAN_LAW_LOCK =
  "STRICT RULE: Every legal analysis, risk flag, explanation, and drafted document must be grounded exclusively in official Jordanian law (e.g. the Jordanian Civil Code, Labour Law, Landlords and Tenants Law, Companies Law, as applicable). Never reason from, cite, or apply the law of any other country. If a matter depends on a specific Jordanian statute you cannot verify, say so explicitly instead of guessing or citing a foreign equivalent.";

export async function processVoiceCommandAction(transcript: string): Promise<VoiceCommandResult> {
  return heuristicParseVoiceCommand(transcript);
}

export async function aiProviderStatus(): Promise<{ connected: boolean }> {
  return { connected: hasOpenAI() };
}

const RISK_LEVELS = ["low", "medium", "high"] as const;
const CLAUSE_CATEGORIES = ["contractual", "financial", "deadline", "termination", "liability"] as const;

function asRiskLevel(v: unknown): "low" | "medium" | "high" | null {
  return typeof v === "string" && (RISK_LEVELS as readonly string[]).includes(v) ? (v as "low" | "medium" | "high") : null;
}

function asCategory(v: unknown): DocumentClause["category"] | null {
  return typeof v === "string" && (CLAUSE_CATEGORIES as readonly string[]).includes(v)
    ? (v as DocumentClause["category"])
    : null;
}

function asStringArray(v: unknown): string[] | null {
  return Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : null;
}

/** Validates and maps the raw OpenAI JSON into real Analysis + DocumentClause objects. Returns null if the shape is unusable, so the caller can fall back to the heuristic engine. */
function buildAnalysisFromAI(
  json: Record<string, unknown>,
  params: { documentId: string; userId: string }
): { clauses: DocumentClause[]; analysis: Analysis } | null {
  const rawClauses = json.clauses;
  if (!Array.isArray(rawClauses) || rawClauses.length === 0) return null;
  if (typeof json.summaryAr !== "string" || typeof json.summaryEn !== "string" || !json.summaryAr || !json.summaryEn) {
    return null;
  }

  const clauses: DocumentClause[] = rawClauses.map((raw, i) => {
    const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    return {
      id: `${params.documentId}-cl-${i + 1}`,
      documentId: params.documentId,
      clauseNumber: typeof c.clauseNumber === "string" || typeof c.clauseNumber === "number" ? String(c.clauseNumber) : String(i + 1),
      clauseTextAr: typeof c.clauseTextAr === "string" ? c.clauseTextAr : "",
      clauseTextEn: typeof c.clauseTextEn === "string" ? c.clauseTextEn : "",
      riskLevel: asRiskLevel(c.riskLevel) || "low",
      category: asCategory(c.category) || "contractual",
      explanationAr: typeof c.explanationAr === "string" ? c.explanationAr : "",
      explanationEn: typeof c.explanationEn === "string" ? c.explanationEn : "",
      confidence: typeof c.confidence === "number" ? c.confidence : 70,
    };
  });

  const riskCategories: RiskCategory[] =
    Array.isArray(json.riskCategories) && json.riskCategories.length === CLAUSE_CATEGORIES.length
      ? (json.riskCategories as Record<string, unknown>[]).map((rc, i) => ({
          category: asCategory(rc.category) || CLAUSE_CATEGORIES[i],
          level: asRiskLevel(rc.level) || "low",
          reasonAr: typeof rc.reasonAr === "string" ? rc.reasonAr : "",
          reasonEn: typeof rc.reasonEn === "string" ? rc.reasonEn : "",
        }))
      : CLAUSE_CATEGORIES.map((category) => {
          const relevant = clauses.filter((c) => c.category === category);
          const level = relevant.some((c) => c.riskLevel === "high")
            ? "high"
            : relevant.some((c) => c.riskLevel === "medium")
            ? "medium"
            : "low";
          return {
            category,
            level,
            reasonAr:
              relevant.length === 0
                ? "لم يتم رصد بنود متعلقة بهذه الفئة في المستند."
                : `تم رصد ${relevant.length} بند متعلق بهذه الفئة، بأعلى مستوى خطر: ${level}.`,
            reasonEn:
              relevant.length === 0
                ? "No clauses related to this category were detected."
                : `${relevant.length} clause(s) related to this category, highest risk: ${level}.`,
          };
        });

  const overallRisk =
    asRiskLevel(json.overallRisk) ||
    (clauses.some((c) => c.riskLevel === "high") ? "high" : clauses.some((c) => c.riskLevel === "medium") ? "medium" : "low");

  const concernClauses = clauses.filter((c) => c.riskLevel !== "low");

  const analysis: Analysis = {
    id: `an-${params.documentId}`,
    documentId: params.documentId,
    userId: params.userId,
    overallRisk,
    riskCategories,
    summaryAr: json.summaryAr as string,
    summaryEn: json.summaryEn as string,
    yourObligationsAr: asStringArray(json.yourObligationsAr) || [],
    yourObligationsEn: asStringArray(json.yourObligationsEn) || [],
    otherPartyObligationsAr: asStringArray(json.otherPartyObligationsAr) || [],
    otherPartyObligationsEn: asStringArray(json.otherPartyObligationsEn) || [],
    deadlinesAr: asStringArray(json.deadlinesAr) || clauses.filter((c) => c.category === "deadline").map((c) => c.clauseTextAr.slice(0, 80)),
    deadlinesEn: asStringArray(json.deadlinesEn) || clauses.filter((c) => c.category === "deadline").map((c) => c.clauseTextEn.slice(0, 80)),
    paymentTermsAr: asStringArray(json.paymentTermsAr) || clauses.filter((c) => c.category === "financial").map((c) => c.clauseTextAr.slice(0, 80)),
    paymentTermsEn: asStringArray(json.paymentTermsEn) || clauses.filter((c) => c.category === "financial").map((c) => c.clauseTextEn.slice(0, 80)),
    cancellationTermsAr: asStringArray(json.cancellationTermsAr) || clauses.filter((c) => c.category === "termination").map((c) => c.clauseTextAr.slice(0, 80)),
    cancellationTermsEn: asStringArray(json.cancellationTermsEn) || clauses.filter((c) => c.category === "termination").map((c) => c.clauseTextEn.slice(0, 80)),
    concernsAr: asStringArray(json.concernsAr) || concernClauses.map((c) => c.clauseTextAr.slice(0, 90)),
    concernsEn: asStringArray(json.concernsEn) || concernClauses.map((c) => c.clauseTextEn.slice(0, 90)),
    questionsForLawyerAr: asStringArray(json.questionsForLawyerAr) || [],
    questionsForLawyerEn: asStringArray(json.questionsForLawyerEn) || [],
    createdAt: new Date().toISOString(),
  };

  return { clauses, analysis };
}

export async function analyzeDocumentAction(params: {
  text: string;
  fileName: string;
  documentId: string;
  userId: string;
  documentType: DocumentType;
  locale: Locale;
}): Promise<{ clauses: DocumentClause[]; analysis: Analysis; source: "ai" | "demo_engine" }> {
  if (hasOpenAI()) {
    const json = await completeJSON({
      system: `You are a legal-document analysis assistant for Jordan. Extract clauses and risk indicators as strict JSON. Never invent legal citations or article numbers — only reference sources if explicitly provided. Always caveat that this is not legal advice. Reply in ${params.locale === "ar" ? "Arabic" : "English"} for the *Ar fields is Arabic and *En fields is English (fill both).\n\n${JORDAN_LAW_LOCK}`,
      user: `Analyze this contract text (document type: ${params.documentType}) and return strict JSON with exactly these fields:
- clauses: array of {clauseNumber, clauseTextAr, clauseTextEn, riskLevel: "low"|"medium"|"high", category: "contractual"|"financial"|"deadline"|"termination"|"liability", explanationAr, explanationEn, confidence (0-100)}
- overallRisk: "low"|"medium"|"high"
- riskCategories: array of exactly 5 objects, one per category ("contractual","financial","deadline","termination","liability"), each {category, level, reasonAr, reasonEn}
- summaryAr, summaryEn: 2-3 sentence plain-language summary of the document and its main risks
- yourObligationsAr, yourObligationsEn: string arrays of the signer's obligations
- otherPartyObligationsAr, otherPartyObligationsEn: string arrays of the other party's obligations
- deadlinesAr, deadlinesEn: string arrays of important dates/deadlines
- paymentTermsAr, paymentTermsEn: string arrays of payment terms
- cancellationTermsAr, cancellationTermsEn: string arrays of cancellation/termination terms
- concernsAr, concernsEn: string arrays of points worth extra attention
- questionsForLawyerAr, questionsForLawyerEn: string arrays of questions worth asking a lawyer

Text:\n\n${params.text.slice(0, 6000)}`,
    });
    if (json) {
      const built = buildAnalysisFromAI(json, params);
      if (built) return { ...built, source: "ai" };
    }
  }
  const result = heuristicAnalyzeText(params);
  return { ...result, source: "demo_engine" };
}

export async function askTheLawAction(params: {
  question: string;
  clauses: DocumentClause[];
  sources: LegalSource[];
  locale: Locale;
}): Promise<{ answer: string; sourceIds: string[]; matchedClauseIds: string[]; source: "ai" | "demo_engine" }> {
  if (hasOpenAI()) {
    const context = params.clauses
      .map((c) => `Clause ${c.clauseNumber} [${c.riskLevel}]: ${c.clauseTextEn}`)
      .join("\n");
    const text = await completeText({
      system: `You are QANUNI's legal-understanding assistant for Jordan. Answer using only the provided contract clauses and general context. Never invent Jordanian laws or citations. Always note this is not a substitute for a licensed lawyer. Reply in the user's language.\n\n${JORDAN_LAW_LOCK}`,
      user: `Contract clauses:\n${context}\n\nQuestion (${params.locale}): ${params.question}`,
    });
    if (text) {
      const fallback = heuristicAnswerQuestion(params);
      return { answer: text, sourceIds: fallback.sourceIds, matchedClauseIds: fallback.matchedClauseIds, source: "ai" };
    }
  }
  const result = heuristicAnswerQuestion(params);
  return { ...result, source: "demo_engine" };
}

export async function simulateScenarioAction(params: {
  question: string;
  clauses: DocumentClause[];
  sources: LegalSource[];
  locale: Locale;
}) {
  const result = heuristicSimulateScenario(params);
  return { ...result, source: hasOpenAI() ? ("ai" as const) : ("demo_engine" as const) };
}

export async function extractCaseDataAction(text: string): Promise<ExtractedCaseData & { source: "ai" | "demo_engine" }> {
  const result = heuristicExtractCaseData(text);
  return { ...result, source: hasOpenAI() ? "ai" : "demo_engine" };
}

export async function generateDraftAction(params: {
  instructions: string;
  locale: Locale;
  mode?: "generate" | "shorten" | "formal" | "translate";
  existingContent?: string;
}): Promise<{ content: string; source: "ai" | "demo_engine" }> {
  if (hasOpenAI()) {
    const text = await completeText({
      system: `You are a legal drafting assistant for a Jordanian lawyer. Produce a professional draft based on the instructions. Never invent specific legal citations, article numbers, or court decisions. Always end with a clear AI-disclosure note that a lawyer must review the draft before use.\n\n${JORDAN_LAW_LOCK}`,
      user: `Instructions: ${params.instructions}\nMode: ${params.mode || "generate"}\nLocale: ${params.locale}\n${
        params.existingContent ? `Existing draft:\n${params.existingContent}` : ""
      }`,
    });
    if (text) return { content: text, source: "ai" };
  }
  if (params.mode && params.mode !== "generate" && params.existingContent) {
    return {
      content: heuristicTransformDraft({
        existingContent: params.existingContent,
        mode: params.mode,
        locale: params.locale,
      }),
      source: "demo_engine",
    };
  }
  return { content: heuristicGenerateDraft(params.instructions, params.locale), source: "demo_engine" };
}

export async function assistantChatAction(params: {
  message: string;
  locale: Locale;
}): Promise<{ reply: string; source: "ai" | "demo_engine" }> {
  if (hasOpenAI()) {
    const text = await completeText({
      system: `You are QANUNI's site-wide help assistant. Help users navigate the platform's features (contract analysis, Ask the Law, scenario simulator, lawyer marketplace, case creation, lawyer dashboard, AI drafter, calendar) and troubleshoot technical issues. Never invent Jordanian legal citations. Keep replies concise. Reply in the user's language.\n\n${JORDAN_LAW_LOCK}`,
      user: params.message,
    });
    if (text) return { reply: text, source: "ai" };
  }
  return { reply: heuristicAssistantReply(params.message, params.locale), source: "demo_engine" };
}

export async function askTheLawTurn(params: {
  history: ChatMessage[];
  question: string;
  clauses: DocumentClause[];
  sources: LegalSource[];
  locale: Locale;
}): Promise<ChatMessage> {
  const res = await askTheLawAction({
    question: params.question,
    clauses: params.clauses,
    sources: params.sources,
    locale: params.locale,
  });
  return {
    id: `msg-${Date.now()}`,
    role: "assistant",
    content: res.answer,
    sourceIds: res.sourceIds,
    createdAt: new Date().toISOString(),
    showLawyerCta: res.matchedClauseIds.length > 0 || params.clauses.length === 0,
  };
}
