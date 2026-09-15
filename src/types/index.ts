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
  verificationStatus: "demo_verified" | "pending" | "unverified";
  yearsExperience: number;
  rating: number;
  reviewCount: number;
  completedCases: number;
  responseTimeHours: number;
}

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
  | "new"
  | "contacted"
  | "reviewing"
  | "in_progress"
  | "court"
  | "closed";

export type CasePriority = "low" | "medium" | "high" | "urgent";

export interface CaseRecord {
  id: string;
  clientId: string;
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

export interface Message {
  id: string;
  caseId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
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
    | "system";
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
