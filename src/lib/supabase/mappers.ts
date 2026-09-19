import type {
  Analysis,
  Appointment,
  CaseDocument,
  CaseEvent,
  CaseNote,
  CaseRecord,
  Report,
  SystemEvent,
  DocumentClause,
  LegalDocument,
  LegalDraft,
  LegalSource,
  Lawyer,
  LawyerSpecialty,
  Message,
  AppNotification,
  Profile,
  Review,
} from "@/types";

/** Maps the snake_case DB row shapes to the app's existing camelCase TS types, so every page that already expects e.g. `Lawyer`/`CaseRecord` keeps working unchanged. */

export function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    email: row.email as string,
    phone: (row.phone as string) || undefined,
    role: row.role as Profile["role"],
    language: row.language as Profile["language"],
    city: (row.city as string) || undefined,
    avatarUrl: (row.avatar_url as string) || undefined,
    createdAt: row.created_at as string,
    accountStatus: row.account_status as Profile["accountStatus"],
  };
}

export function mapLawyer(row: Record<string, unknown>): Lawyer {
  return {
    id: row.id as string,
    profileId: row.profile_id as string,
    fullName: row.full_name as string,
    avatarUrl: (row.avatar_url as string) || undefined,
    specialties: (row.specialties as LawyerSpecialty[]) || [],
    bio: (row.bio as string) || "",
    city: (row.city as string) || "",
    languages: (row.languages as Lawyer["languages"]) || [],
    consultationPrice: Number(row.consultation_price) || 0,
    availabilityStatus: row.availability_status as Lawyer["availabilityStatus"],
    consultationTypes: (row.consultation_types as Lawyer["consultationTypes"]) || [],
    verificationStatus: row.verification_status as Lawyer["verificationStatus"],
    yearsExperience: Number(row.years_experience) || 0,
    rating: Number(row.rating) || 0,
    reviewCount: Number(row.review_count) || 0,
    completedCases: Number(row.completed_cases) || 0,
    responseTimeHours: Number(row.response_time_hours) || 24,
    acceptingNewCases: row.accepting_new_cases !== false,
    preferredCategories: (row.preferred_categories as LawyerSpecialty[]) || [],
    barNumber: (row.bar_number as string) || undefined,
    verificationInfo: (row.verification_info as string) || undefined,
    verificationAdminNote: (row.verification_admin_note as string) || undefined,
  };
}

export function mapReview(row: Record<string, unknown>): Review {
  return {
    id: row.id as string,
    lawyerId: row.lawyer_id as string,
    clientName: row.client_name as string,
    rating: Number(row.rating),
    review: (row.review as string) || "",
    createdAt: row.created_at as string,
    demo: (row.is_demo as boolean) || undefined,
  };
}

export function mapLegalSource(row: Record<string, unknown>): LegalSource {
  return {
    id: row.id as string,
    titleAr: row.title_ar as string,
    titleEn: row.title_en as string,
    article: (row.article as string) || "",
    excerptAr: (row.excerpt_ar as string) || undefined,
    excerptEn: (row.excerpt_en as string) || undefined,
    sourceUrl: (row.source_url as string) || undefined,
    sourceType: row.source_type as string,
    verified: row.verified as boolean,
    lastVerifiedAt: (row.last_verified_at as string) || undefined,
    isDemoPlaceholder: row.is_demo_placeholder as boolean,
  };
}

export function mapDocument(row: Record<string, unknown>): LegalDocument {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    fileName: row.file_name as string,
    fileUrl: (row.file_url as string) || undefined,
    documentType: row.document_type as LegalDocument["documentType"],
    language: row.language as LegalDocument["language"],
    status: row.status as LegalDocument["status"],
    createdAt: row.created_at as string,
    parties: (row.parties as LegalDocument["parties"]) || undefined,
    effectiveDate: (row.effective_date as string) || undefined,
    durationMonths: (row.duration_months as number) || undefined,
    keyAmounts: (row.key_amounts as LegalDocument["keyAmounts"]) || undefined,
    citizenDescription: (row.citizen_description as string) || undefined,
  };
}

export function mapClause(row: Record<string, unknown>): DocumentClause {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    clauseNumber: row.clause_number as string,
    clauseTextAr: (row.clause_text_ar as string) || "",
    clauseTextEn: (row.clause_text_en as string) || "",
    riskLevel: row.risk_level as DocumentClause["riskLevel"],
    category: row.category as DocumentClause["category"],
    explanationAr: (row.explanation_ar as string) || "",
    explanationEn: (row.explanation_en as string) || "",
    concernAr: (row.concern_ar as string) || undefined,
    concernEn: (row.concern_en as string) || undefined,
    confidence: Number(row.confidence) || 0,
    legalSourceId: (row.legal_source_id as string) || undefined,
  };
}

export function mapAnalysis(row: Record<string, unknown>): Analysis {
  const payload = (row.payload as Record<string, unknown>) || {};
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    userId: row.user_id as string,
    overallRisk: row.overall_risk as Analysis["overallRisk"],
    riskCategories: (payload.riskCategories as Analysis["riskCategories"]) || [],
    summaryAr: (row.summary_ar as string) || "",
    summaryEn: (row.summary_en as string) || "",
    yourObligationsAr: (payload.yourObligationsAr as string[]) || [],
    yourObligationsEn: (payload.yourObligationsEn as string[]) || [],
    otherPartyObligationsAr: (payload.otherPartyObligationsAr as string[]) || [],
    otherPartyObligationsEn: (payload.otherPartyObligationsEn as string[]) || [],
    deadlinesAr: (payload.deadlinesAr as string[]) || [],
    deadlinesEn: (payload.deadlinesEn as string[]) || [],
    paymentTermsAr: (payload.paymentTermsAr as string[]) || [],
    paymentTermsEn: (payload.paymentTermsEn as string[]) || [],
    cancellationTermsAr: (payload.cancellationTermsAr as string[]) || [],
    cancellationTermsEn: (payload.cancellationTermsEn as string[]) || [],
    concernsAr: (payload.concernsAr as string[]) || [],
    concernsEn: (payload.concernsEn as string[]) || [],
    questionsForLawyerAr: (payload.questionsForLawyerAr as string[]) || [],
    questionsForLawyerEn: (payload.questionsForLawyerEn as string[]) || [],
    createdAt: row.created_at as string,
  };
}

export function analysisToPayload(a: Omit<Analysis, "id" | "documentId" | "userId" | "createdAt">) {
  return {
    riskCategories: a.riskCategories,
    yourObligationsAr: a.yourObligationsAr,
    yourObligationsEn: a.yourObligationsEn,
    otherPartyObligationsAr: a.otherPartyObligationsAr,
    otherPartyObligationsEn: a.otherPartyObligationsEn,
    deadlinesAr: a.deadlinesAr,
    deadlinesEn: a.deadlinesEn,
    paymentTermsAr: a.paymentTermsAr,
    paymentTermsEn: a.paymentTermsEn,
    cancellationTermsAr: a.cancellationTermsAr,
    cancellationTermsEn: a.cancellationTermsEn,
    concernsAr: a.concernsAr,
    concernsEn: a.concernsEn,
    questionsForLawyerAr: a.questionsForLawyerAr,
    questionsForLawyerEn: a.questionsForLawyerEn,
  };
}

export function mapCase(row: Record<string, unknown>): CaseRecord {
  return {
    id: row.id as string,
    clientId: (row.client_id as string) || undefined,
    clientName: row.client_name as string,
    lawyerId: (row.lawyer_id as string) || undefined,
    title: row.title as string,
    category: row.category as LawyerSpecialty,
    status: row.status as CaseRecord["status"],
    priority: row.priority as CaseRecord["priority"],
    summaryAr: (row.summary_ar as string) || "",
    summaryEn: (row.summary_en as string) || "",
    clientStoryAr: (row.client_story_ar as string) || "",
    clientStoryEn: (row.client_story_en as string) || "",
    opposingParty: (row.opposing_party as string) || undefined,
    relevantClauseIds: (row.relevant_clause_ids as string[]) || [],
    documentIds: (row.document_ids as string[]) || [],
    keyDatesAr: (row.key_dates_ar as string[]) || [],
    keyDatesEn: (row.key_dates_en as string[]) || [],
    questionsAr: (row.questions_ar as string[]) || [],
    questionsEn: (row.questions_en as string[]) || [],
    suggestedSpecialty: row.suggested_specialty as LawyerSpecialty,
    matchScore: (row.match_score as number) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    nextActionAr: (row.next_action_ar as string) || undefined,
    nextActionEn: (row.next_action_en as string) || undefined,
    deadline: (row.deadline as string) || undefined,
    legalStage: row.legal_stage as CaseRecord["legalStage"],
    totalFees: row.total_fees != null ? Number(row.total_fees) : undefined,
    paymentsReceived: row.payments_received != null ? Number(row.payments_received) : undefined,
    urgency: ((row.urgency as string) || "medium") as CaseRecord["urgency"],
    requestDescription: (row.request_description as string) || undefined,
    requestMessage: (row.request_message as string) || undefined,
    requestedAt: (row.requested_at as string) || (row.created_at as string),
    acceptedAt: (row.accepted_at as string) || undefined,
    acceptedBy: (row.accepted_by as string) || undefined,
    rejectedAt: (row.rejected_at as string) || undefined,
    rejectionReason: (row.rejection_reason as CaseRecord["rejectionReason"]) || undefined,
    rejectionNote: (row.rejection_note as string) || undefined,
    viewedByLawyerAt: (row.viewed_by_lawyer_at as string) || undefined,
    resolvedAt: (row.resolved_at as string) || undefined,
    closedAt: (row.closed_at as string) || undefined,
    isManual: (row.is_manual as boolean) || false,
  };
}

export function mapCaseEvent(row: Record<string, unknown>): CaseEvent {
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    actorId: (row.actor_id as string) || undefined,
    actorRole: row.actor_role as CaseEvent["actorRole"],
    eventType: row.event_type as CaseEvent["eventType"],
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at as string,
  };
}

export function mapCaseDocument(row: Record<string, unknown>): CaseDocument {
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    uploadedBy: row.uploaded_by as string,
    uploadedByRole: row.uploaded_by_role as CaseDocument["uploadedByRole"],
    fileName: row.file_name as string,
    storagePath: row.storage_path as string,
    mimeType: (row.mime_type as string) || undefined,
    sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : undefined,
    createdAt: row.created_at as string,
  };
}

export function mapCaseNote(row: Record<string, unknown>): CaseNote {
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    lawyerId: row.lawyer_id as string,
    note: row.note as string,
    createdAt: row.created_at as string,
  };
}

export function mapReport(row: Record<string, unknown>): Report {
  return {
    id: row.id as string,
    reporterId: row.reporter_id as string,
    targetType: row.target_type as Report["targetType"],
    targetId: row.target_id as string,
    reason: row.reason as string,
    details: (row.details as string) || undefined,
    status: row.status as Report["status"],
    adminNote: (row.admin_note as string) || undefined,
    createdAt: row.created_at as string,
    resolvedAt: (row.resolved_at as string) || undefined,
  };
}

export function mapSystemEvent(row: Record<string, unknown>): SystemEvent {
  return {
    id: row.id as string,
    kind: row.kind as string,
    severity: row.severity as SystemEvent["severity"],
    message: row.message as string,
    createdAt: row.created_at as string,
  };
}

export function mapAppointment(row: Record<string, unknown>): Appointment {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    clientName: row.client_name as string,
    lawyerId: row.lawyer_id as string,
    caseId: (row.case_id as string) || undefined,
    title: row.title as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    type: row.type as Appointment["type"],
    status: row.status as Appointment["status"],
    location: (row.location as string) || undefined,
    notes: (row.notes as string) || undefined,
  };
}

export function mapMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    senderId: row.sender_id as string,
    senderName: row.sender_name as string,
    senderRole: row.sender_role as Message["senderRole"],
    receiverId: (row.receiver_id as string) || undefined,
    readAt: (row.read_at as string) || undefined,
    kind: ((row.kind as string) || "text") as Message["kind"],
    message: row.message as string,
    createdAt: row.created_at as string,
  };
}

export function mapDraft(row: Record<string, unknown>): LegalDraft {
  return {
    id: row.id as string,
    caseId: (row.case_id as string) || undefined,
    lawyerId: row.lawyer_id as string,
    title: (row.title as string) || "",
    instructions: (row.instructions as string) || "",
    content: (row.content as string) || "",
    status: row.status as LegalDraft["status"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as AppNotification["type"],
    titleAr: row.title_ar as string,
    titleEn: row.title_en as string,
    bodyAr: row.body_ar as string,
    bodyEn: row.body_en as string,
    read: row.read as boolean,
    createdAt: row.created_at as string,
    isDemo: (row.is_demo as boolean) || undefined,
    href: (row.href as string) || undefined,
  };
}
