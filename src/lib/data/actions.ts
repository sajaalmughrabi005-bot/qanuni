"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { analysisToPayload, mapAppointment, mapCase, mapDraft, mapMessage } from "@/lib/supabase/mappers";
import type {
  Analysis,
  AppNotification,
  Appointment,
  CaseRecord,
  DocumentClause,
  DocumentType,
  LegalDraft,
  Locale,
  Message,
} from "@/types";

/** Inserts a `documents` row with status "processing" and returns its real (DB-generated) id. */
export async function createDraftDocument(input: {
  userId: string;
  fileName: string;
  documentType: DocumentType;
  language: Locale;
  citizenDescription?: string;
}): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: input.userId,
      file_name: input.fileName,
      document_type: input.documentType,
      language: input.language,
      status: "processing",
      citizen_description: input.citizenDescription,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

/** Persists the AI-produced clauses + analysis against a real document id, then marks the document analyzed. */
export async function finalizeDocumentAnalysis(
  documentId: string,
  userId: string,
  clauses: DocumentClause[],
  analysis: Omit<Analysis, "id" | "documentId" | "userId" | "createdAt">
): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return false;

  if (clauses.length > 0) {
    const { error: clausesError } = await supabase.from("document_clauses").insert(
      clauses.map((c) => ({
        document_id: documentId,
        clause_number: c.clauseNumber,
        clause_text_ar: c.clauseTextAr,
        clause_text_en: c.clauseTextEn,
        risk_level: c.riskLevel,
        category: c.category,
        explanation_ar: c.explanationAr,
        explanation_en: c.explanationEn,
        concern_ar: c.concernAr,
        concern_en: c.concernEn,
        confidence: c.confidence,
      }))
    );
    if (clausesError) return false;
  }

  const { error: analysisError } = await supabase.from("analyses").insert({
    document_id: documentId,
    user_id: userId,
    overall_risk: analysis.overallRisk,
    summary_ar: analysis.summaryAr,
    summary_en: analysis.summaryEn,
    payload: analysisToPayload(analysis),
  });
  if (analysisError) return false;

  await supabase.from("documents").update({ status: "analyzed" }).eq("id", documentId);
  return true;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.from("documents").delete().eq("id", documentId);
}

export async function createCase(
  input: Omit<CaseRecord, "id" | "createdAt" | "updatedAt">
): Promise<CaseRecord | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("cases")
    .insert({
      client_id: input.clientId,
      client_name: input.clientName,
      lawyer_id: input.lawyerId,
      title: input.title,
      category: input.category,
      status: input.status,
      priority: input.priority,
      summary_ar: input.summaryAr,
      summary_en: input.summaryEn,
      client_story_ar: input.clientStoryAr,
      client_story_en: input.clientStoryEn,
      opposing_party: input.opposingParty,
      relevant_clause_ids: input.relevantClauseIds,
      document_ids: input.documentIds,
      key_dates_ar: input.keyDatesAr,
      key_dates_en: input.keyDatesEn,
      questions_ar: input.questionsAr,
      questions_en: input.questionsEn,
      suggested_specialty: input.suggestedSpecialty,
      match_score: input.matchScore,
      next_action_ar: input.nextActionAr,
      next_action_en: input.nextActionEn,
      deadline: input.deadline,
      legal_stage: input.legalStage,
      total_fees: input.totalFees,
      payments_received: input.paymentsReceived,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapCase(data);
}

export async function updateCase(id: string, patch: Partial<CaseRecord>): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return false;
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.lawyerId !== undefined) row.lawyer_id = patch.lawyerId;
  if (patch.opposingParty !== undefined) row.opposing_party = patch.opposingParty;
  if (patch.nextActionAr !== undefined) row.next_action_ar = patch.nextActionAr;
  if (patch.nextActionEn !== undefined) row.next_action_en = patch.nextActionEn;
  if (patch.deadline !== undefined) row.deadline = patch.deadline;
  if (patch.legalStage !== undefined) row.legal_stage = patch.legalStage;
  if (patch.totalFees !== undefined) row.total_fees = patch.totalFees;
  if (patch.paymentsReceived !== undefined) row.payments_received = patch.paymentsReceived;
  const { error } = await supabase.from("cases").update(row).eq("id", id);
  return !error;
}

export async function addAppointment(input: Omit<Appointment, "id">): Promise<Appointment | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      client_id: input.clientId,
      client_name: input.clientName,
      lawyer_id: input.lawyerId,
      case_id: input.caseId,
      title: input.title,
      start_time: input.startTime,
      end_time: input.endTime,
      type: input.type,
      status: input.status,
      location: input.location,
      notes: input.notes,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapAppointment(data);
}

export async function deleteAppointment(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.from("appointments").delete().eq("id", id);
}

export async function addDraft(
  input: Omit<LegalDraft, "id" | "createdAt" | "updatedAt">
): Promise<LegalDraft | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("drafts")
    .insert({
      case_id: input.caseId,
      lawyer_id: input.lawyerId,
      title: input.title,
      instructions: input.instructions,
      content: input.content,
      status: input.status,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapDraft(data);
}

export async function updateDraft(id: string, patch: Partial<LegalDraft>): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return false;
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.instructions !== undefined) row.instructions = patch.instructions;
  if (patch.content !== undefined) row.content = patch.content;
  if (patch.status !== undefined) row.status = patch.status;
  const { error } = await supabase.from("drafts").update(row).eq("id", id);
  return !error;
}

export async function addMessage(input: Omit<Message, "id" | "createdAt">): Promise<Message | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("messages")
    .insert({
      case_id: input.caseId,
      sender_id: input.senderId,
      sender_name: input.senderName,
      sender_role: input.senderRole,
      message: input.message,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapMessage(data);
}

/** Inserts a notification for the caller's own account (RLS requires user_id = auth.uid() for a client-side insert). */
export async function addOwnNotification(
  input: Omit<AppNotification, "id" | "createdAt">
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title_ar: input.titleAr,
    title_en: input.titleEn,
    body_ar: input.bodyAr,
    body_en: input.bodyEn,
    read: input.read,
    is_demo: input.isDemo,
    href: input.href,
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}
