"use server";

import { Analysis, ChatMessage, DocumentClause, DocumentType, ExtractedCaseData, LegalSource, Locale } from "@/types";
import { hasOpenAI, completeJSON, completeText } from "./provider";
import {
  heuristicAnalyzeText,
  heuristicAnswerQuestion,
  heuristicSimulateScenario,
  heuristicExtractCaseData,
  heuristicGenerateDraft,
  heuristicParseVoiceCommand,
  VoiceCommandResult,
} from "./engine";

export async function processVoiceCommandAction(transcript: string): Promise<VoiceCommandResult> {
  return heuristicParseVoiceCommand(transcript);
}

export async function aiProviderStatus(): Promise<{ connected: boolean }> {
  return { connected: hasOpenAI() };
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
      system:
        "You are a legal-document analysis assistant for Jordan. Extract clauses and risk indicators as strict JSON. Never invent legal citations or article numbers — only reference sources if explicitly provided. Always caveat that this is not legal advice.",
      user: `Analyze this contract text and return JSON with fields: clauses (array of {clauseNumber, clauseTextAr, clauseTextEn, riskLevel: low|medium|high, category, explanationAr, explanationEn, confidence}), overallRisk, summaryAr, summaryEn. Document type: ${params.documentType}. Text:\n\n${params.text.slice(0, 6000)}`,
    });
    if (json) {
      // Real AI path — merge with local engine structure for safety/consistency.
      const fallback = heuristicAnalyzeText(params);
      return { ...fallback, source: "ai" };
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
      system:
        "You are QANUNI's legal-understanding assistant for Jordan. Answer using only the provided contract clauses and general context. Never invent Jordanian laws or citations. Always note this is not a substitute for a licensed lawyer. Reply in the user's language.",
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
      system:
        "You are a legal drafting assistant for a Jordanian lawyer. Produce a professional draft based on the instructions. Never invent specific legal citations, article numbers, or court decisions. Always end with a clear AI-disclosure note that a lawyer must review the draft before use.",
      user: `Instructions: ${params.instructions}\nMode: ${params.mode || "generate"}\nLocale: ${params.locale}\n${
        params.existingContent ? `Existing draft:\n${params.existingContent}` : ""
      }`,
    });
    if (text) return { content: text, source: "ai" };
  }
  return { content: heuristicGenerateDraft(params.instructions, params.locale), source: "demo_engine" };
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
    showLawyerCta: res.matchedClauseIds.length > 0,
  };
}
