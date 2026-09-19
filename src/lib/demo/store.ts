"use client";

import { create } from "zustand";
import type {
  AppNotification,
  Appointment,
  CaseRecord,
  CaseStatus,
  LegalDraft,
  Lawyer,
  Message,
  MessageKind,
  Profile,
  RejectionReason,
} from "@/types";
import { allowedTransitions } from "@/lib/cases/lifecycle";
import { buildDemoData, DEMO_ADMIN_ID, type DemoData } from "./dataset";
import { DEMO_LAWYER_ID, DEMO_LAWYER_PROFILE_ID } from "./lawyers";
import { DEMO_USER_ID } from "@/lib/mock-data/contract";

/**
 * In-memory state for the demo experience. Nothing here is persisted or
 * sent anywhere: a page refresh keeps the cookie but the sample data is
 * rebuilt fresh, and every mutation below only edits local sample arrays.
 */
interface DemoStore extends DemoData {
  ready: boolean;
  savedLawyerIds: string[];
  toggleSavedLawyer: (lawyerId: string) => void;
  init: () => void;
  reset: () => void;

  requestCase: (input: {
    lawyerId: string;
    title: string;
    category: CaseRecord["category"];
    description: string;
    urgency: CaseRecord["urgency"];
    message?: string;
  }) => string;
  respondCase: (id: string, accept: boolean, reason?: RejectionReason, note?: string) => void;
  transitionCase: (id: string, to: CaseStatus, role: "lawyer" | "client") => string | null;
  patchCase: (id: string, patch: Partial<CaseRecord>) => void;
  markViewed: (id: string) => void;
  addMessage: (caseId: string, text: string, kind: MessageKind, role: "lawyer" | "client") => void;
  markMessagesRead: (caseId: string, role: "lawyer" | "client") => void;
  addCaseDocument: (caseId: string, fileName: string, role: "lawyer" | "client") => void;
  addNote: (caseId: string, note: string) => void;
  addAppointment: (a: Omit<Appointment, "id">) => void;
  deleteAppointment: (id: string) => void;
  addDraft: (d: Omit<LegalDraft, "id" | "createdAt" | "updatedAt">) => string;
  updateDraft: (id: string, patch: Partial<LegalDraft>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  updateLawyer: (id: string, patch: Partial<Lawyer>) => void;
  updateProfile: (id: string, patch: Partial<Profile>) => void;
  reviewLawyer: (id: string, decision: "approve" | "reject" | "request_info", note?: string) => void;
  setAccountStatus: (id: string, status: "active" | "disabled") => void;
  resolveReport: (id: string, status: "reviewing" | "resolved" | "dismissed", note?: string) => void;
}

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const nowIso = () => new Date().toISOString();

const STATUS_LABEL_AR: Partial<Record<CaseStatus, string>> = {
  active: "قيد المتابعة",
  waiting_for_client: "بانتظار ردّك",
  waiting_for_lawyer: "بانتظار المحامي",
  resolved: "تم الحل",
  closed: "مغلقة",
};
const STATUS_LABEL_EN: Partial<Record<CaseStatus, string>> = {
  active: "In progress",
  waiting_for_client: "Waiting for you",
  waiting_for_lawyer: "Waiting for the lawyer",
  resolved: "Resolved",
  closed: "Closed",
};

const empty = buildDemoData();

export const useDemoStore = create<DemoStore>()((set, get) => {
  const notify = (n: Omit<AppNotification, "id" | "createdAt" | "read">) =>
    set((s) => ({ notifications: [{ ...n, id: uid("n"), read: false, createdAt: nowIso() }, ...s.notifications] }));
  const addEvent = (
    caseId: string,
    actorRole: "client" | "lawyer" | "system",
    eventType: DemoData["events"][number]["eventType"],
    metadata: Record<string, unknown> = {}
  ) =>
    set((s) => ({
      events: [...s.events, { id: uid("ev"), caseId, actorRole, eventType, metadata, createdAt: nowIso() }],
    }));
  const setStatus = (id: string, status: CaseStatus, actor: "client" | "lawyer" | "system", extra: Partial<CaseRecord> = {}) => {
    const c = get().cases.find((x) => x.id === id);
    if (!c) return;
    const from = c.status;
    set((s) => ({
      cases: s.cases.map((x) =>
        x.id === id
          ? {
              ...x,
              ...extra,
              status,
              updatedAt: nowIso(),
              resolvedAt: status === "resolved" ? nowIso() : x.resolvedAt,
              closedAt: status === "closed" ? nowIso() : x.closedAt,
            }
          : x
      ),
    }));
    if (status === "accepted") {
      addEvent(id, actor, "accepted", { from });
      notify({
        userId: c.clientId || "",
        type: "case_accepted",
        titleAr: "تم قبول طلبك",
        titleEn: "Your request was accepted",
        bodyAr: "تم قبول طلبك من قبل المحامي.",
        bodyEn: "Your request was accepted by the lawyer.",
        href: `/citizen/cases/${id}`,
      });
    } else if (status === "rejected") {
      addEvent(id, actor, "rejected", { reason_code: extra.rejectionReason });
      notify({
        userId: c.clientId || "",
        type: "case_rejected",
        titleAr: "تم رفض طلبك",
        titleEn: "Your request was declined",
        bodyAr: "للأسف تم رفض طلبك من قبل المحامي.",
        bodyEn: "Unfortunately your request was declined by the lawyer.",
        href: `/citizen/cases/${id}`,
      });
    } else {
      addEvent(id, actor, "status_changed", { from, to: status });
      notify({
        userId: actor === "client" ? DEMO_LAWYER_PROFILE_ID : c.clientId || "",
        type: "case_status",
        titleAr: actor === "client" ? "تغيّرت حالة القضية" : "تغيّرت حالة قضيتك",
        titleEn: actor === "client" ? "Case status changed" : "Your case status changed",
        bodyAr: `${c.title} — ${STATUS_LABEL_AR[status] ?? status}`,
        bodyEn: `${c.title} — ${STATUS_LABEL_EN[status] ?? status}`,
        href: actor === "client" ? `/lawyer/cases/${id}` : `/citizen/cases/${id}`,
      });
    }
  };

  return {
    ...empty,
    ready: false,
    init: () => {
      if (!get().ready) set({ ...buildDemoData(), ready: true });
    },
    reset: () => set({ ...buildDemoData(), ready: true }),

    requestCase: ({ lawyerId, title, category, description, urgency, message }) => {
      const id = uid("case-demo");
      const now = nowIso();
      const c: CaseRecord = {
        id,
        clientId: DEMO_USER_ID,
        clientName: get().profiles.find((p) => p.id === DEMO_USER_ID)?.fullName || "—",
        lawyerId,
        title,
        category,
        status: "requested",
        priority: urgency,
        urgency,
        summaryAr: description,
        summaryEn: description,
        clientStoryAr: description,
        clientStoryEn: description,
        requestDescription: description,
        requestMessage: message,
        relevantClauseIds: [],
        documentIds: [],
        keyDatesAr: [],
        keyDatesEn: [],
        questionsAr: [],
        questionsEn: [],
        suggestedSpecialty: category,
        createdAt: now,
        updatedAt: now,
        requestedAt: now,
        isManual: false,
      };
      set((s) => ({ cases: [c, ...s.cases] }));
      addEvent(id, "client", "request_submitted", { urgency });
      return id;
    },

    respondCase: (id, accept, reason, note) => {
      if (accept) setStatus(id, "accepted", "lawyer", { acceptedAt: nowIso(), acceptedBy: DEMO_LAWYER_PROFILE_ID });
      else setStatus(id, "rejected", "lawyer", { rejectedAt: nowIso(), rejectionReason: reason, rejectionNote: note });
    },

    transitionCase: (id, to, role) => {
      const c = get().cases.find((x) => x.id === id);
      if (!c) return "case_not_found";
      if (!allowedTransitions(role, c.status).includes(to)) return "invalid_transition";
      setStatus(id, to, role);
      return null;
    },

    patchCase: (id, patch) =>
      set((s) => ({ cases: s.cases.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c)) })),

    markViewed: (id) => {
      const c = get().cases.find((x) => x.id === id);
      if (!c || c.viewedByLawyerAt) return;
      set((s) => ({ cases: s.cases.map((x) => (x.id === id ? { ...x, viewedByLawyerAt: nowIso() } : x)) }));
      addEvent(id, "lawyer", "viewed");
    },

    addMessage: (caseId, text, kind, role) => {
      const c = get().cases.find((x) => x.id === caseId);
      if (!c) return;
      const senderId = role === "lawyer" ? DEMO_LAWYER_PROFILE_ID : DEMO_USER_ID;
      const sender = get().profiles.find((p) => p.id === senderId);
      const msg: Message = {
        id: uid("msg"),
        caseId,
        senderId,
        senderName: sender?.fullName || "—",
        senderRole: role === "lawyer" ? "lawyer" : "citizen",
        receiverId: role === "lawyer" ? c.clientId : DEMO_LAWYER_PROFILE_ID,
        kind,
        message: text,
        createdAt: nowIso(),
      };
      set((s) => ({ messages: [...s.messages, msg] }));
      if (kind !== "text") {
        addEvent(caseId, "lawyer", kind === "document_request" ? "document_requested" : "clarification_requested", { text: text.slice(0, 80) });
        if (c.status === "active" || c.status === "waiting_for_lawyer") setStatus(caseId, "waiting_for_client", "system");
      } else if (role === "client" && c.status === "waiting_for_client") {
        setStatus(caseId, "waiting_for_lawyer", "system");
      }
      notify({
        userId: (role === "lawyer" ? c.clientId : DEMO_LAWYER_PROFILE_ID) || "",
        type: kind === "document_request" ? "document" : "message",
        titleAr: role === "lawyer" ? "رسالة جديدة من المحامي" : "رد جديد من العميل",
        titleEn: role === "lawyer" ? "New message from your lawyer" : "New reply from your client",
        bodyAr: text.slice(0, 80),
        bodyEn: text.slice(0, 80),
        href: role === "lawyer" ? `/citizen/cases/${caseId}` : `/lawyer/cases/${caseId}`,
      });
    },

    markMessagesRead: (caseId, role) => {
      const me = role === "lawyer" ? DEMO_LAWYER_PROFILE_ID : DEMO_USER_ID;
      set((s) => ({
        messages: s.messages.map((m) => (m.caseId === caseId && m.receiverId === me && !m.readAt ? { ...m, readAt: nowIso() } : m)),
      }));
    },

    addCaseDocument: (caseId, fileName, role) => {
      const c = get().cases.find((x) => x.id === caseId);
      if (!c) return;
      set((s) => ({
        caseDocuments: [
          ...s.caseDocuments,
          {
            id: uid("cdoc"),
            caseId,
            uploadedBy: role === "lawyer" ? DEMO_LAWYER_PROFILE_ID : DEMO_USER_ID,
            uploadedByRole: role,
            fileName,
            storagePath: `demo/${caseId}/${fileName}`,
            createdAt: nowIso(),
          },
        ],
      }));
      addEvent(caseId, role, "document_uploaded", { file_name: fileName });
      if (role === "client" && c.status === "waiting_for_client") setStatus(caseId, "waiting_for_lawyer", "system");
    },

    addNote: (caseId, note) =>
      set((s) => ({ caseNotes: [...s.caseNotes, { id: uid("note"), caseId, lawyerId: DEMO_LAWYER_ID, note, createdAt: nowIso() }] })),

    addAppointment: (a) => set((s) => ({ appointments: [{ ...a, id: uid("apt") }, ...s.appointments] })),
    deleteAppointment: (id) => set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) })),

    addDraft: (d) => {
      const id = uid("draft");
      set((s) => ({ drafts: [{ ...d, id, createdAt: nowIso(), updatedAt: nowIso() }, ...s.drafts] }));
      return id;
    },
    updateDraft: (id, patch) =>
      set((s) => ({ drafts: s.drafts.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: nowIso() } : d)) })),

    markNotificationRead: (id) =>
      set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
    markAllNotificationsRead: (userId) =>
      set((s) => ({ notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)) })),

    updateLawyer: (id, patch) =>
      set((s) => ({ lawyers: s.lawyers.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

    reviewLawyer: (id, decision, note) =>
      set((s) => ({
        pendingLawyers: s.pendingLawyers
          .map((l) =>
            l.id === id
              ? {
                  ...l,
                  verificationStatus:
                    decision === "approve" ? ("approved" as const) : decision === "reject" ? ("rejected" as const) : ("more_info_requested" as const),
                  verificationAdminNote: note,
                }
              : l
          ),
      })),

    savedLawyerIds: [],
    toggleSavedLawyer: (lawyerId) =>
      set((s) => ({
        savedLawyerIds: s.savedLawyerIds.includes(lawyerId) ? s.savedLawyerIds.filter((x) => x !== lawyerId) : [...s.savedLawyerIds, lawyerId],
      })),

    updateProfile: (id, patch) =>
      set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

    setAccountStatus: (id, status) =>
      set((s) => ({ profiles: s.profiles.map((p) => (p.id === id && p.id !== DEMO_ADMIN_ID ? { ...p, accountStatus: status } : p)) })),

    resolveReport: (id, status, note) =>
      set((s) => ({ reports: s.reports.map((r) => (r.id === id ? { ...r, status, adminNote: note, resolvedAt: status === "reviewing" ? undefined : nowIso() } : r)) })),
  };
});
