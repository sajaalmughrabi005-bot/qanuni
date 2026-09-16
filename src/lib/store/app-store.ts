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
  LawyerSpecialty,
  Profile,
  Review,
} from "@/types";
import {
  appointments as seedAppointments,
  cases as seedCases,
  demoAnalysis,
  demoClauses,
  demoDocument,
  drafts as seedDrafts,
  notifications as seedNotifications,
  lawyers as seedLawyers,
  DEMO_LAWYER_ID,
  DEMO_USER_ID,
  ADMIN_USER_ID,
} from "@/lib/mock-data";

export interface Session {
  userId: string;
  role: UserRole;
}

export interface RegisteredUser {
  profile: Profile;
  password: string;
  lawyerId?: string;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  role: "citizen" | "lawyer";
  barNumber?: string;
  specialty?: LawyerSpecialty;
}

export type SignUpResult =
  | { ok: true; session: Session }
  | { ok: false; error: "email_taken" };

export type LoginResult =
  | { ok: true; session: Session }
  | { ok: false; error: "invalid_credentials" | "account_disabled" };

interface AppState {
  hydrated: boolean;
  session: Session | null;
  registeredUsers: Record<string, RegisteredUser>;
  customLawyers: Lawyer[];
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
  profileOverrides: Record<string, Partial<Profile>>;
  updateProfile: (userId: string, patch: Partial<Profile>) => void;
  customReviews: Review[];
  addReview: (input: { lawyerId: string; clientName: string; rating: number; review: string }) => Review;

  setHydrated: () => void;
  loginDemo: (role: UserRole) => Session;
  logout: () => void;
  signUp: (input: SignUpInput) => SignUpResult;
  login: (email: string, password: string) => LoginResult;
  setAccountStatus: (userId: string, status: "active" | "disabled") => void;
  setLawyerVerification: (lawyerId: string, status: Lawyer["verificationStatus"]) => void;

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
      profileOverrides: {},
      registeredUsers: {},
      customLawyers: [],
      customReviews: [],

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

      updateProfile: (userId, patch) =>
        set((s) => ({
          profileOverrides: {
            ...s.profileOverrides,
            [userId]: { ...s.profileOverrides[userId], ...patch },
          },
        })),

      addReview: (input) => {
        const newReview: Review = {
          id: uid("review"),
          lawyerId: input.lawyerId,
          clientName: input.clientName,
          rating: input.rating,
          review: input.review,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ customReviews: [newReview, ...s.customReviews] }));

        const s = get();
        const lawyer = [...seedLawyers, ...s.customLawyers].find((l) => l.id === input.lawyerId);
        if (lawyer) {
          const override = s.lawyerOverrides[input.lawyerId];
          const baseRating = override?.rating ?? lawyer.rating;
          const baseCount = override?.reviewCount ?? lawyer.reviewCount;
          const newCount = baseCount + 1;
          const newRating = Math.round(((baseRating * baseCount + input.rating) / newCount) * 10) / 10;
          get().updateLawyerProfile(input.lawyerId, { rating: newRating, reviewCount: newCount });
        }
        return newReview;
      },

      setHydrated: () => set({ hydrated: true }),

      loginDemo: (role) => {
        const userId =
          role === "citizen" ? DEMO_USER_ID : role === "lawyer" ? DEMO_LAWYER_ID : ADMIN_USER_ID;
        const session = { userId, role };
        set({ session });
        return session;
      },

      logout: () => set({ session: null }),

      signUp: (input) => {
        const email = input.email.trim().toLowerCase();
        const existing = get().registeredUsers[email];
        if (existing) return { ok: false, error: "email_taken" };

        const userId = uid("user");
        const profile: Profile = {
          id: userId,
          fullName: input.fullName,
          email,
          role: input.role,
          language: "ar",
          createdAt: new Date().toISOString(),
          accountStatus: "active",
        };

        let lawyerId: string | undefined;
        if (input.role === "lawyer") {
          lawyerId = uid("lawyer");
          const newLawyer: Lawyer = {
            id: lawyerId,
            profileId: userId,
            fullName: input.fullName,
            specialties: input.specialty ? [input.specialty] : [],
            bio: "",
            city: "",
            languages: ["ar"],
            consultationPrice: 0,
            availabilityStatus: "busy",
            consultationTypes: ["video"],
            verificationStatus: "pending",
            yearsExperience: 0,
            rating: 0,
            reviewCount: 0,
            completedCases: 0,
            responseTimeHours: 24,
          };
          set((s) => ({ customLawyers: [...s.customLawyers, newLawyer] }));
        }

        const registered: RegisteredUser = { profile, password: input.password, lawyerId };
        set((s) => ({
          registeredUsers: { ...s.registeredUsers, [email]: registered },
        }));

        const session: Session = { userId, role: input.role };
        set({ session });
        return { ok: true, session };
      },

      login: (email, password) => {
        const key = email.trim().toLowerCase();
        const registered = get().registeredUsers[key];
        if (!registered || registered.password !== password) {
          return { ok: false, error: "invalid_credentials" };
        }
        if (registered.profile.accountStatus === "disabled") {
          return { ok: false, error: "account_disabled" };
        }
        const session: Session = { userId: registered.profile.id, role: registered.profile.role };
        set({ session });
        return { ok: true, session };
      },

      setAccountStatus: (userId, status) => {
        set((s) => {
          const entry = Object.entries(s.registeredUsers).find(([, u]) => u.profile.id === userId);
          if (!entry) return {};
          const [key, user] = entry;
          return {
            registeredUsers: {
              ...s.registeredUsers,
              [key]: { ...user, profile: { ...user.profile, accountStatus: status } },
            },
          };
        });
      },

      setLawyerVerification: (lawyerId, status) => {
        set((s) => ({
          customLawyers: s.customLawyers.map((l) =>
            l.id === lawyerId ? { ...l, verificationStatus: status } : l
          ),
          lawyerOverrides: s.customLawyers.some((l) => l.id === lawyerId)
            ? s.lawyerOverrides
            : { ...s.lawyerOverrides, [lawyerId]: { ...s.lawyerOverrides[lawyerId], verificationStatus: status } },
        }));
      },

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
