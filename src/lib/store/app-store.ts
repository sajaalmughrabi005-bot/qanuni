"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Analysis,
  Appointment,
  CaseRecord,
  ChatMessage,
  DocumentClause,
  LegalDocument,
  LegalDraft,
  Message,
  AppNotification,
  UserRole,
  Lawyer,
} from "@/types";
import {
  appointments as seedAppointments,
  cases as seedCases,
  demoAnalysis,
  demoClauses,
  demoDocument,
  drafts as seedDrafts,
  notifications as seedNotifications,
  DEMO_LAWYER_ID,
  DEMO_USER_ID,
  ADMIN_USER_ID,
} from "@/lib/mock-data";

export interface Session {
  userId: string;
  role: UserRole;
}

interface AppState {
  hydrated: boolean;
  session: Session | null;
  documents: LegalDocument[];
  clauses: DocumentClause[];
  analyses: Analysis[];
  cases: CaseRecord[];
  appointments: Appointment[];
  drafts: LegalDraft[];
  notifications: AppNotification[];
  messages: Message[];
  scenarioChats: Record<string, ChatMessage[]>;
  savedLawyerIds: string[];
  toggleSavedLawyer: (lawyerId: string) => void;
  lawyerOverrides: Record<string, Partial<Lawyer>>;
  updateLawyerProfile: (lawyerId: string, patch: Partial<Lawyer>) => void;

  setHydrated: () => void;
  loginDemo: (role: UserRole) => Session;
  logout: () => void;

  addDocument: (doc: LegalDocument, clauses: DocumentClause[], analysis: Analysis) => void;
  createCase: (data: Omit<CaseRecord, "id" | "createdAt" | "updatedAt">) => CaseRecord;
  updateCaseStatus: (id: string, status: CaseRecord["status"]) => void;
  updateCase: (id: string, patch: Partial<CaseRecord>) => void;

  addAppointment: (a: Omit<Appointment, "id">) => Appointment;
  deleteAppointment: (id: string) => void;

  addDraft: (d: Omit<LegalDraft, "id" | "createdAt" | "updatedAt">) => LegalDraft;
  updateDraft: (id: string, patch: Partial<LegalDraft>) => void;

  addMessage: (m: Omit<Message, "id" | "createdAt">) => Message;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  addNotification: (n: Omit<AppNotification, "id" | "createdAt">) => AppNotification;

  appendScenarioChat: (docId: string, msg: ChatMessage) => void;
}

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      session: null,
      documents: [demoDocument],
      clauses: [...demoClauses],
      analyses: [demoAnalysis],
      cases: [...seedCases],
      appointments: [...seedAppointments],
      drafts: [...seedDrafts],
      notifications: [...seedNotifications],
      messages: [],
      scenarioChats: {},
      savedLawyerIds: [],
      lawyerOverrides: {},

      toggleSavedLawyer: (lawyerId) =>
        set((s) => ({
          savedLawyerIds: s.savedLawyerIds.includes(lawyerId)
            ? s.savedLawyerIds.filter((id) => id !== lawyerId)
            : [...s.savedLawyerIds, lawyerId],
        })),

      updateLawyerProfile: (lawyerId, patch) =>
        set((s) => ({
          lawyerOverrides: {
            ...s.lawyerOverrides,
            [lawyerId]: { ...s.lawyerOverrides[lawyerId], ...patch },
          },
        })),

      setHydrated: () => set({ hydrated: true }),

      loginDemo: (role) => {
        const userId =
          role === "citizen" ? DEMO_USER_ID : role === "lawyer" ? DEMO_LAWYER_ID : ADMIN_USER_ID;
        const session = { userId, role };
        set({ session });
        return session;
      },

      logout: () => set({ session: null }),

      addDocument: (doc, clauses, analysis) =>
        set((s) => ({
          documents: [doc, ...s.documents.filter((d) => d.id !== doc.id)],
          clauses: [...clauses, ...s.clauses.filter((c) => c.documentId !== doc.id)],
          analyses: [analysis, ...s.analyses.filter((a) => a.documentId !== doc.id)],
        })),

      createCase: (data) => {
        const newCase: CaseRecord = {
          ...data,
          id: uid("case"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ cases: [newCase, ...s.cases] }));
        get().addNotification({
          userId: newCase.lawyerId || DEMO_LAWYER_ID,
          type: "case_update",
          titleAr: "قضية جديدة بانتظارك",
          titleEn: "A new case is waiting",
          bodyAr: `وصلتك قضية جديدة: ${newCase.title}`,
          bodyEn: `A new case arrived: ${newCase.title}`,
          read: false,
          isDemo: true,
          href: "/lawyer/cases",
        });
        return newCase;
      },

      updateCaseStatus: (id, status) =>
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c
          ),
        })),

      updateCase: (id, patch) =>
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
          ),
        })),

      addAppointment: (a) => {
        const appt: Appointment = { ...a, id: uid("apt") };
        set((s) => ({ appointments: [appt, ...s.appointments] }));
        return appt;
      },

      deleteAppointment: (id) =>
        set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) })),

      addDraft: (d) => {
        const draft: LegalDraft = {
          ...d,
          id: uid("draft"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ drafts: [draft, ...s.drafts] }));
        return draft;
      },

      updateDraft: (id, patch) =>
        set((s) => ({
          drafts: s.drafts.map((d) =>
            d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d
          ),
        })),

      addMessage: (m) => {
        const msg: Message = { ...m, id: uid("msg"), createdAt: new Date().toISOString() };
        set((s) => ({ messages: [...s.messages, msg] }));
        return msg;
      },

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),

      markAllNotificationsRead: (userId) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.userId === userId ? { ...n, read: true } : n
          ),
        })),

      addNotification: (n) => {
        const notif: AppNotification = { ...n, id: uid("notif"), createdAt: new Date().toISOString() };
        set((s) => ({ notifications: [notif, ...s.notifications] }));
        return notif;
      },

      appendScenarioChat: (docId, msg) =>
        set((s) => ({
          scenarioChats: {
            ...s.scenarioChats,
            [docId]: [...(s.scenarioChats[docId] || []), msg],
          },
        })),
    }),
    {
      name: "qanuni-demo-store",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
