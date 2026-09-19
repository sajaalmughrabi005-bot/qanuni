export type Locale = "ar" | "en";
export type UserRole = "citizen" | "lawyer" | "admin";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  language: Locale;
  city?: string;
  avatarUrl?: string;
  createdAt: string;
  accountStatus?: "active" | "disabled";
}

export type LawyerSpecialty =
  | "rental"
  | "employment"
  | "commercial"
  | "family"
  | "criminal"
  | "real_estate"
  | "corporate"
  | "civil";

export type ConsultationType = "in_person" | "video" | "phone";

export interface Lawyer {
  id: string;
  profileId: string;
  fullName: string;
  avatarUrl?: string;
  specialties: LawyerSpecialty[];
  bio: string;
  city: string;
  languages: Locale[];
  consultationPrice: number;
  availabilityStatus: "available_today" | "available_this_week" | "busy";
  consultationTypes: ConsultationType[];
  verificationStatus: VerificationStatus;
  yearsExperience: number;
  rating: number;
  reviewCount: number;
  completedCases: number;
  responseTimeHours: number;
  acceptingNewCases: boolean;
  preferredCategories: LawyerSpecialty[];
  /** Private — only present on the lawyer's own row and for admins. */
  barNumber?: string;
  verificationInfo?: string;
  verificationAdminNote?: string;
}

export type VerificationStatus = "pending" | "approved" | "rejected" | "more_info_requested";

export interface Review {
  id: string;
  lawyerId: string;
  clientName: string;
  rating: number;
  review: string;
  createdAt: string;
  demo?: boolean;
}

export type RiskLevel = "low" | "medium" | "high";

export interface LegalSource {
  id: string;
  titleAr: string;
  titleEn: string;
  article: string;
  excerptAr?: string;
  excerptEn?: string;
  sourceUrl?: string;
  sourceType: string;
  verified: boolean;
  lastVerifiedAt?: string;
  isDemoPlaceholder: boolean;
}

export interface DocumentClause {
  id: string;
  documentId: string;
  clauseNumber: string;
  clauseTextAr: string;
  clauseTextEn: string;
  riskLevel: RiskLevel;
  category: "contractual" | "financial" | "deadline" | "termination" | "liability";
  explanationAr: string;
  explanationEn: string;
  concernAr?: string;
  concernEn?: string;
  confidence: number;
  legalSourceId?: string;
}

export type DocumentType =
  | "rental"
  | "employment"
  | "service"
  | "sale"
  | "general";

export interface LegalDocument {
  id: string;
  userId: string;
  fileName: string;
  fileUrl?: string;
  documentType: DocumentType;
  language: Locale;
  status: "uploaded" | "processing" | "analyzed" | "failed";
  createdAt: string;
  parties?: { role: string; name: string }[];
  effectiveDate?: string;
  durationMonths?: number;
  keyAmounts?: { labelAr: string; labelEn: string; amount: number }[];
  citizenDescription?: string;
}

export interface RiskCategory {
  category: "contractual" | "financial" | "deadline" | "termination" | "liability";
  level: RiskLevel;
  reasonAr: string;
  reasonEn: string;
}

export interface Analysis {
  id: string;
  documentId: string;
  userId: string;
  overallRisk: RiskLevel;
  riskCategories: RiskCategory[];
  summaryAr: string;
  summaryEn: string;
  yourObligationsAr: string[];
  yourObligationsEn: string[];
  otherPartyObligationsAr: string[];
  otherPartyObligationsEn: string[];
  deadlinesAr: string[];
  deadlinesEn: string[];
  paymentTermsAr: string[];
  paymentTermsEn: string[];
  cancellationTermsAr: string[];
  cancellationTermsEn: string[];
  concernsAr: string[];
  concernsEn: string[];
  questionsForLawyerAr: string[];
  questionsForLawyerEn: string[];
  createdAt: string;
}

export interface ScenarioResult {
  id: string;
  question: string;
  affectedClauseId?: string;
  consequenceAr: string;
  consequenceEn: string;
  legalSourceId?: string;
  questionsAr: string[];
  questionsEn: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sourceIds?: string[];
  createdAt: string;
  showLawyerCta?: boolean;
}

export type CaseStatus =
  | "requested"
  | "accepted"
  | "active"
  | "waiting_for_client"
  | "waiting_for_lawyer"
  | "resolved"
  | "closed"
  | "rejected";

export type RejectionReason = "out_of_scope" | "no_capacity" | "conflict_of_interest" | "other";

export type CasePriority = "low" | "medium" | "high" | "urgent";

export type LegalStage =
  | "initial_review"
  | "negotiation"
  | "legal_notice"
  | "in_court"
  | "closed";

export interface CaseRecord {
  id: string;
  /** null for a case a lawyer entered manually (client has no account). */
  clientId?: string;
  clientName: string;
  lawyerId?: string;
  title: string;
  category: LawyerSpecialty;
  status: CaseStatus;
  priority: CasePriority;
  summaryAr: string;
  summaryEn: string;
  clientStoryAr: string;
  clientStoryEn: string;
  opposingParty?: string;
  relevantClauseIds: string[];
  documentIds: string[];
  keyDatesAr: string[];
  keyDatesEn: string[];
  questionsAr: string[];
  questionsEn: string[];
  suggestedSpecialty: LawyerSpecialty;
  matchScore?: number;
  createdAt: string;
  updatedAt: string;
  nextActionAr?: string;
  nextActionEn?: string;
  deadline?: string;
  legalStage?: LegalStage;
  totalFees?: number;
  paymentsReceived?: number;
  urgency: CasePriority;
  requestDescription?: string;
  requestMessage?: string;
  requestedAt: string;
  acceptedAt?: string;
  acceptedBy?: string;
  rejectedAt?: string;
  rejectionReason?: RejectionReason;
  rejectionNote?: string;
  viewedByLawyerAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  isManual: boolean;
}

export type CaseEventType =
  | "request_submitted"
  | "viewed"
  | "accepted"
  | "rejected"
  | "status_changed"
  | "document_uploaded"
  | "document_requested"
  | "clarification_requested"
  | "manual_created";

export interface CaseEvent {
  id: string;
  caseId: string;
  actorId?: string;
  actorRole: "client" | "lawyer" | "admin" | "system";
  eventType: CaseEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CaseDocument {
  id: string;
  caseId: string;
  uploadedBy: string;
  uploadedByRole: "client" | "lawyer";
  fileName: string;
  storagePath: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface CaseNote {
  id: string;
  caseId: string;
  lawyerId: string;
  note: string;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: "lawyer" | "case" | "user";
  targetId: string;
  reason: string;
  details?: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  adminNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface SystemEvent {
  id: string;
  kind: string;
  severity: "info" | "warning" | "error";
  message: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  lawyerId: string;
  caseId?: string;
  title: string;
  startTime: string;
  endTime: string;
  type: ConsultationType | "court" | "deadline" | "follow_up";
  status: "pending" | "confirmed" | "completed" | "cancelled";
  location?: string;
  notes?: string;
}

export type MessageKind = "text" | "document_request" | "clarification_request";

export interface Message {
  id: string;
  caseId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  receiverId?: string;
  readAt?: string;
  kind: MessageKind;
  message: string;
  createdAt: string;
}

export type DraftStatus = "draft" | "final" | "sent";

export interface LegalDraft {
  id: string;
  caseId?: string;
  lawyerId: string;
  title: string;
  instructions: string;
  content: string;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type:
    | "analysis_ready"
    | "case_update"
    | "lawyer_response"
    | "appointment"
    | "message"
    | "review_reminder"
    | "system"
    | "case_request"
    | "case_accepted"
    | "case_rejected"
    | "case_status"
    | "document"
    | "verification";
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  read: boolean;
  createdAt: string;
  isDemo?: boolean;
  href?: string;
}

export interface ExtractedCaseData {
  clientName?: string;
  opposingParty?: string;
  caseNumber?: string;
  court?: string;
  importantDates?: string[];
  amounts?: string[];
  claims?: string[];
  deadline?: string;
  confidence: number;
}
