"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { analysisToPayload } from "@/lib/supabase/mappers";
import { isDemoActive } from "@/lib/demo/mode";
import { useDemoStore } from "@/lib/demo/store";
import { DEMO_LAWYER_ID } from "@/lib/demo/lawyers";
import type {
  Analysis,
  Appointment,
  CaseDocument,
  CaseRecord,
  CaseStatus,
  DocumentClause,
  DocumentType,
  Lawyer,
  LegalDraft,
  Locale,
  MessageKind,
  Profile,
  RejectionReason,
  Report,
} from "@/types";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

const ok = <T,>(data: T): ActionResult<T> => ({ ok: true, data });
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

/** Postgres RAISE EXCEPTION codes we raise deliberately (see migration 004) -> stable error codes. */
const KNOWN_ERRORS = [
  "not_authenticated", "not_allowed", "forbidden", "lawyer_unavailable", "lawyer_not_accepting",
  "invalid_title", "invalid_description", "invalid_urgency", "invalid_category", "invalid_message",
  "invalid_transition", "case_not_found", "case_not_open_for_messages", "case_not_open_for_documents",
  "rejection_reason_required", "no_recipient", "invalid_storage_path", "invalid_decision", "not_found",
  "invalid_status", "cannot_change_self", "cannot_change_admin",
];

function dbError(error: { message?: string } | null): ActionResult<never> {
  const msg = error?.message || "";
  const found = KNOWN_ERRORS.find((code) => msg.includes(code));
  if (found) return fail(found);
  if (/permission denied|row-level security|violates/i.test(msg)) return fail("forbidden");
  return fail("unknown");
}

const noClient = () => fail("not_configured");

// ================================================================= contracts
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

// ================================================================= case lifecycle
export interface RequestCaseInput {
  lawyerId: string;
  title: string;
  category: CaseRecord["category"];
  description: string;
  urgency: CaseRecord["urgency"];
  message?: string;
  documentIds?: string[];
  relevantClauseIds?: string[];
  summaryAr?: string;
  summaryEn?: string;
  keyDatesAr?: string[];
  keyDatesEn?: string[];
  questionsAr?: string[];
  questionsEn?: string[];
  matchScore?: number;
}

/** Citizen -> lawyer request. Identity (client) is taken from the session on the server, never from this payload. */
export async function requestCase(input: RequestCaseInput): Promise<ActionResult<string>> {
  if (isDemoActive()) {
    return ok(
      useDemoStore.getState().requestCase({
        lawyerId: input.lawyerId,
        title: input.title,
        category: input.category,
        description: input.description,
        urgency: input.urgency,
        message: input.message,
      })
    );
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { data, error } = await supabase.rpc("request_case", {
    p_lawyer_id: input.lawyerId,
    p_title: input.title,
    p_category: input.category,
    p_description: input.description,
    p_urgency: input.urgency,
    p_document_ids: input.documentIds ?? [],
    p_relevant_clause_ids: input.relevantClauseIds ?? [],
    p_message: input.message ?? null,
    p_summary_ar: input.summaryAr ?? "",
    p_summary_en: input.summaryEn ?? "",
    p_key_dates_ar: input.keyDatesAr ?? [],
    p_key_dates_en: input.keyDatesEn ?? [],
    p_questions_ar: input.questionsAr ?? [],
    p_questions_en: input.questionsEn ?? [],
    p_match_score: input.matchScore ?? null,
  });
  if (error) return dbError(error);
  return ok(data as string);
}

export async function respondToCase(
  caseId: string,
  accept: boolean,
  reason?: RejectionReason,
  note?: string
): Promise<ActionResult> {
  if (isDemoActive()) {
    useDemoStore.getState().respondCase(caseId, accept, reason, note);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = await supabase.rpc("respond_case", {
    p_case_id: caseId,
    p_accept: accept,
    p_reason_code: reason ?? null,
    p_reason_note: note ?? null,
  });
  return error ? dbError(error) : ok(undefined);
}

export async function transitionCase(
  caseId: string,
  to: CaseStatus,
  role: "lawyer" | "client"
): Promise<ActionResult> {
  if (isDemoActive()) {
    const err = useDemoStore.getState().transitionCase(caseId, to, role);
    return err ? fail(err) : ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = await supabase.rpc("transition_case", { p_case_id: caseId, p_to: to });
  return error ? dbError(error) : ok(undefined);
}

export async function markCaseViewed(caseId: string): Promise<void> {
  if (isDemoActive()) {
    useDemoStore.getState().markViewed(caseId);
    return;
  }
  const supabase = createSupabaseBrowserClient();
  await supabase?.rpc("mark_case_viewed", { p_case_id: caseId });
}

/** Fields a lawyer may edit on their own case (everything else is locked by column privileges). */
export type CaseWorkingFields = Partial<
  Pick<
    CaseRecord,
    | "priority"
    | "summaryAr"
    | "summaryEn"
    | "opposingParty"
    | "keyDatesAr"
    | "keyDatesEn"
    | "questionsAr"
    | "questionsEn"
    | "nextActionAr"
    | "nextActionEn"
    | "deadline"
    | "legalStage"
    | "totalFees"
    | "paymentsReceived"
  >
>;

export async function updateCaseFields(caseId: string, patch: CaseWorkingFields): Promise<ActionResult> {
  if (isDemoActive()) {
    useDemoStore.getState().patchCase(caseId, patch);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const row: Record<string, unknown> = {};
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.summaryAr !== undefined) row.summary_ar = patch.summaryAr;
  if (patch.summaryEn !== undefined) row.summary_en = patch.summaryEn;
  if (patch.opposingParty !== undefined) row.opposing_party = patch.opposingParty;
  if (patch.keyDatesAr !== undefined) row.key_dates_ar = patch.keyDatesAr;
  if (patch.keyDatesEn !== undefined) row.key_dates_en = patch.keyDatesEn;
  if (patch.questionsAr !== undefined) row.questions_ar = patch.questionsAr;
  if (patch.questionsEn !== undefined) row.questions_en = patch.questionsEn;
  if (patch.nextActionAr !== undefined) row.next_action_ar = patch.nextActionAr;
  if (patch.nextActionEn !== undefined) row.next_action_en = patch.nextActionEn;
  if (patch.deadline !== undefined) row.deadline = patch.deadline;
  if (patch.legalStage !== undefined) row.legal_stage = patch.legalStage;
  if (patch.totalFees !== undefined) row.total_fees = patch.totalFees;
  if (patch.paymentsReceived !== undefined) row.payments_received = patch.paymentsReceived;
  const { error } = await supabase.from("cases").update(row).eq("id", caseId);
  return error ? dbError(error) : ok(undefined);
}

export async function createManualCase(input: {
  title: string;
  clientName: string;
  category: CaseRecord["category"];
  summaryAr: string;
  summaryEn: string;
  story: string;
  opposingParty?: string;
  keyDates: string[];
  deadline?: string;
}): Promise<ActionResult<string>> {
  if (isDemoActive()) {
    const id = useDemoStore.getState().requestCase({
      lawyerId: DEMO_LAWYER_ID,
      title: input.title,
      category: input.category,
      description: input.story || input.title,
      urgency: "medium",
    });
    useDemoStore.getState().respondCase(id, true);
    return ok(id);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { data, error } = await supabase.rpc("lawyer_create_manual_case", {
    p_title: input.title,
    p_client_name: input.clientName,
    p_category: input.category,
    p_summary_ar: input.summaryAr,
    p_summary_en: input.summaryEn,
    p_story: input.story,
    p_opposing_party: input.opposingParty ?? null,
    p_key_dates: input.keyDates,
    p_deadline: input.deadline ?? null,
  });
  if (error) return dbError(error);
  return ok(data as string);
}

// ================================================================= messages
export async function sendMessage(
  caseId: string,
  text: string,
  role: "lawyer" | "client",
  kind: MessageKind = "text"
): Promise<ActionResult> {
  const clean = text.trim();
  if (!clean) return fail("invalid_message");
  if (isDemoActive()) {
    useDemoStore.getState().addMessage(caseId, clean, kind, role);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  // sender_id / name / role / receiver are overwritten server-side by a trigger.
  const { error } = await supabase.from("messages").insert({ case_id: caseId, message: clean, kind });
  return error ? dbError(error) : ok(undefined);
}

export async function markMessagesRead(caseId: string, role: "lawyer" | "client"): Promise<void> {
  if (isDemoActive()) {
    useDemoStore.getState().markMessagesRead(caseId, role);
    return;
  }
  const supabase = createSupabaseBrowserClient();
  await supabase?.rpc("mark_messages_read", { p_case_id: caseId });
}

// ================================================================= case documents
export const CASE_DOC_MAX_BYTES = 10 * 1024 * 1024;
export const CASE_DOC_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "text/plain": ".txt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

export function validateCaseFile(file: File): string | null {
  if (file.size > CASE_DOC_MAX_BYTES) return "file_too_large";
  if (!CASE_DOC_TYPES[file.type]) return "file_type_not_allowed";
  return null;
}

export async function uploadCaseDocument(caseId: string, file: File, role: "lawyer" | "client"): Promise<ActionResult> {
  const invalid = validateCaseFile(file);
  if (invalid) return fail(invalid);
  if (isDemoActive()) {
    useDemoStore.getState().addCaseDocument(caseId, file.name, role);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const safeName = file.name.replace(/[^\w.\-؀-ۿ]+/g, "_").slice(-120) || "file";
  const path = `${caseId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("case-documents").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return dbError(uploadError);
  const { error } = await supabase.from("case_documents").insert({
    case_id: caseId,
    file_name: file.name.slice(0, 255),
    storage_path: path,
    mime_type: file.type,
    size_bytes: file.size,
  });
  if (error) {
    await supabase.storage.from("case-documents").remove([path]);
    return dbError(error);
  }
  return ok(undefined);
}

/** Short-lived signed URL (private bucket — there are no public file URLs). */
export async function getCaseDocumentUrl(doc: CaseDocument): Promise<string | null> {
  if (isDemoActive()) return null;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.storage.from("case-documents").createSignedUrl(doc.storagePath, 60);
  return data?.signedUrl ?? null;
}

export async function deleteCaseDocument(doc: CaseDocument): Promise<ActionResult> {
  if (isDemoActive()) return ok(undefined);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = await supabase.from("case_documents").delete().eq("id", doc.id);
  if (error) return dbError(error);
  await supabase.storage.from("case-documents").remove([doc.storagePath]);
  return ok(undefined);
}

// ================================================================= private notes
export async function addCaseNote(caseId: string, lawyerId: string, note: string): Promise<ActionResult> {
  const clean = note.trim();
  if (!clean) return fail("invalid_message");
  if (isDemoActive()) {
    useDemoStore.getState().addNote(caseId, clean);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = await supabase.from("case_notes").insert({ case_id: caseId, lawyer_id: lawyerId, note: clean });
  return error ? dbError(error) : ok(undefined);
}

// ================================================================= scheduling
export async function addAppointment(input: Omit<Appointment, "id">): Promise<ActionResult> {
  if (isDemoActive()) {
    useDemoStore.getState().addAppointment(input);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = await supabase.from("appointments").insert({
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
  });
  return error ? dbError(error) : ok(undefined);
}

export async function deleteAppointment(id: string): Promise<ActionResult> {
  if (isDemoActive()) {
    useDemoStore.getState().deleteAppointment(id);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  return error ? dbError(error) : ok(undefined);
}

// ================================================================= drafts
export async function addDraft(input: Omit<LegalDraft, "id" | "createdAt" | "updatedAt">): Promise<ActionResult<string>> {
  if (isDemoActive()) return ok(useDemoStore.getState().addDraft(input));
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
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
    .select("id")
    .single();
  if (error || !data) return dbError(error);
  return ok(data.id as string);
}

export async function updateDraft(id: string, patch: Partial<LegalDraft>): Promise<ActionResult> {
  if (isDemoActive()) {
    useDemoStore.getState().updateDraft(id, patch);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.instructions !== undefined) row.instructions = patch.instructions;
  if (patch.content !== undefined) row.content = patch.content;
  if (patch.status !== undefined) row.status = patch.status;
  const { error } = await supabase.from("drafts").update(row).eq("id", id);
  return error ? dbError(error) : ok(undefined);
}

// ================================================================= notifications
export async function markNotificationRead(id: string): Promise<void> {
  if (isDemoActive()) {
    useDemoStore.getState().markNotificationRead(id);
    return;
  }
  const supabase = createSupabaseBrowserClient();
  await supabase?.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (isDemoActive()) {
    useDemoStore.getState().markAllNotificationsRead(userId);
    return;
  }
  const supabase = createSupabaseBrowserClient();
  await supabase?.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

// ================================================================= saved lawyers
export async function setLawyerSaved(userId: string, lawyerId: string, saved: boolean): Promise<ActionResult> {
  if (isDemoActive()) {
    const cur = useDemoStore.getState().savedLawyerIds.includes(lawyerId);
    if (cur !== saved) useDemoStore.getState().toggleSavedLawyer(lawyerId);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = saved
    ? await supabase.from("saved_lawyers").upsert({ user_id: userId, lawyer_id: lawyerId }, { onConflict: "user_id,lawyer_id", ignoreDuplicates: true })
    : await supabase.from("saved_lawyers").delete().eq("user_id", userId).eq("lawyer_id", lawyerId);
  return error ? dbError(error) : ok(undefined);
}

// ================================================================= AI history
export interface AiHistoryEntry {
  id: string;
  kind: "ask" | "scenario";
  documentId?: string;
  prompt: string;
  answer: Record<string, unknown>;
  createdAt: string;
}

/** Persists one AI exchange to the signed-in user's private history (no-op in the demo). */
export async function saveAiHistory(input: {
  userId: string;
  kind: "ask" | "scenario";
  documentId?: string;
  prompt: string;
  answer: Record<string, unknown>;
}): Promise<ActionResult> {
  if (isDemoActive()) return ok(undefined);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = await supabase.from("ai_history").insert({
    user_id: input.userId,
    kind: input.kind,
    document_id: input.documentId ?? null,
    prompt: input.prompt.slice(0, 4000),
    answer: input.answer,
  });
  return error ? dbError(error) : ok(undefined);
}

export async function deleteAiHistory(id: string): Promise<ActionResult> {
  if (isDemoActive()) return ok(undefined);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = await supabase.from("ai_history").delete().eq("id", id);
  return error ? dbError(error) : ok(undefined);
}

// ================================================================= own profile
export type ProfilePatch = Partial<Pick<Profile, "fullName" | "phone" | "city" | "avatarUrl">>;

/** Updates the signed-in user's own profile row (role/status columns are not writable by clients). */
export async function updateMyProfile(userId: string, patch: ProfilePatch): Promise<ActionResult> {
  if (isDemoActive()) {
    useDemoStore.getState().updateProfile(userId, patch);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const row: Record<string, unknown> = {};
  if (patch.fullName !== undefined) {
    const name = patch.fullName.trim();
    if (name.length < 2 || name.length > 120) return fail("invalid_name");
    row.full_name = name;
  }
  if (patch.phone !== undefined) row.phone = patch.phone.trim().slice(0, 30) || null;
  if (patch.city !== undefined) row.city = patch.city.trim().slice(0, 80) || null;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl || null;
  const { error } = await supabase.from("profiles").update(row).eq("id", userId);
  return error ? dbError(error) : ok(undefined);
}

// ================================================================= lawyer profile
/** Columns a lawyer may edit on their own profile (verification/rating are server-controlled). */
export type LawyerProfilePatch = Partial<
  Pick<
    Lawyer,
    | "avatarUrl"
    | "bio"
    | "city"
    | "languages"
    | "specialties"
    | "consultationPrice"
    | "availabilityStatus"
    | "consultationTypes"
    | "yearsExperience"
    | "acceptingNewCases"
    | "preferredCategories"
  >
>;

export async function updateMyLawyerProfile(lawyerId: string, patch: LawyerProfilePatch): Promise<ActionResult> {
  if (isDemoActive()) {
    useDemoStore.getState().updateLawyer(lawyerId, patch);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const row: Record<string, unknown> = {};
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.languages !== undefined) row.languages = patch.languages;
  if (patch.specialties !== undefined) row.specialties = patch.specialties;
  if (patch.consultationPrice !== undefined) row.consultation_price = patch.consultationPrice;
  if (patch.availabilityStatus !== undefined) row.availability_status = patch.availabilityStatus;
  if (patch.consultationTypes !== undefined) row.consultation_types = patch.consultationTypes;
  if (patch.yearsExperience !== undefined) row.years_experience = patch.yearsExperience;
  if (patch.acceptingNewCases !== undefined) row.accepting_new_cases = patch.acceptingNewCases;
  if (patch.preferredCategories !== undefined) row.preferred_categories = patch.preferredCategories;
  const { error } = await supabase.from("lawyers").update(row).eq("id", lawyerId);
  return error ? dbError(error) : ok(undefined);
}

export async function updateVerificationInfo(info: string): Promise<ActionResult> {
  if (isDemoActive()) return ok(undefined);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = await supabase.rpc("lawyer_update_verification_info", { p_info: info });
  return error ? dbError(error) : ok(undefined);
}

// ================================================================= reports
export async function createReport(input: {
  reporterId: string;
  targetType: Report["targetType"];
  targetId: string;
  reason: string;
  details?: string;
}): Promise<ActionResult> {
  if (isDemoActive()) return ok(undefined);
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details || null,
  });
  return error ? dbError(error) : ok(undefined);
}

// ================================================================= admin
export async function adminReviewLawyer(
  lawyerId: string,
  decision: "approve" | "reject" | "request_info",
  note?: string
): Promise<ActionResult> {
  if (isDemoActive()) {
    useDemoStore.getState().reviewLawyer(lawyerId, decision, note);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = await supabase.rpc("admin_review_lawyer", {
    p_lawyer_id: lawyerId,
    p_decision: decision,
    p_note: note ?? null,
  });
  return error ? dbError(error) : ok(undefined);
}

export async function adminSetAccountStatus(userId: string, status: "active" | "disabled"): Promise<ActionResult> {
  if (isDemoActive()) {
    useDemoStore.getState().setAccountStatus(userId, status);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = await supabase.rpc("admin_set_account_status", { p_user: userId, p_status: status });
  return error ? dbError(error) : ok(undefined);
}

export async function adminResolveReport(
  reportId: string,
  status: "reviewing" | "resolved" | "dismissed",
  note?: string
): Promise<ActionResult> {
  if (isDemoActive()) {
    useDemoStore.getState().resolveReport(reportId, status, note);
    return ok(undefined);
  }
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return noClient();
  const { error } = await supabase.rpc("admin_resolve_report", { p_id: reportId, p_status: status, p_note: note ?? null });
  return error ? dbError(error) : ok(undefined);
}
