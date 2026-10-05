"use client";

import { useCallback, useMemo, useState } from "react";
import { useSession } from "@/lib/auth/use-session";
import { useScopedQuery } from "./use-scoped-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  mapAnalysis,
  mapAppointment,
  mapCase,
  mapCaseDocument,
  mapCaseEvent,
  mapCaseNote,
  mapClause,
  mapDocument,
  mapDraft,
  mapLawyer,
  mapMessage,
  mapNotification,
  mapProfile,
  mapReport,
  mapSystemEvent,
} from "@/lib/supabase/mappers";
import { useDemoStore } from "@/lib/demo/store";
import type { AiHistoryEntry } from "@/lib/data/actions";
import { useDemoRole, demoProfileId, DEMO_LAWYER_ID, DEMO_USER_ID } from "@/lib/demo/use-demo";
import { demoClauses } from "@/lib/mock-data";
import type {
  Analysis,
  Appointment,
  CaseDocument,
  CaseEvent,
  CaseNote,
  CaseRecord,
  DocumentClause,
  Lawyer,
  LegalDocument,
  LegalDraft,
  Message,
  AppNotification,
  Profile,
  Report,
  SystemEvent,
} from "@/types";

export interface ListResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<boolean | void>;
}

const NOOP = async () => {};

/**
 * Generic "fetch rows visible to me" hook. Row-level security already scopes
 * each table to the caller, so every role shares the same unfiltered select.
 * While the isolated demo is active there is no Supabase client at all, so
 * this never fetches; the demo-aware wrappers below return sample data.
 */
function useSupabaseList<Row extends Record<string, unknown>, T>(
  table: string,
  mapper: (row: Row) => T,
  orderBy: string,
  options: { ascending?: boolean; pollMs?: number; filter?: { column: string; value: string } | null } = {}
): ListResult<T> {
  const { ascending = false, pollMs, filter = undefined } = options;
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const { session, isDemo, loading: sessionLoading } = useSession();
  const filterKey = filter ? JSON.stringify([filter.column, filter.value]) : "";
  const key = JSON.stringify([session?.userId, isDemo, sessionLoading, table, filterKey, orderBy, ascending]);
  const read = useCallback(async () => {
    if (!supabase) throw new Error("not_configured");
    let query = supabase.from(table).select("*");
    if (filter) query = query.eq(filter.column, filter.value);
    const { data: rows, error } = await query.order(orderBy, { ascending });
    if (error) throw new Error("query_failed");
    return ((rows as Row[]) || []).map(mapper);
    // Mapper/filter are represented by the stable table and serialized filter key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, key]);
  return useScopedQuery<T[]>(key, isDemo || sessionLoading || filter === null ? null : read, [], pollMs);
}

function demoResult<T>(data: T[]): ListResult<T> {
  return { data, loading: false, error:null, refetch: NOOP };
}

// ---------------------------------------------------------------- contracts
export function useDocuments(): ListResult<LegalDocument> {
  const documents = useDemoStore(s => s.documents);
  const demoRole = useDemoRole();
  const real = useSupabaseList<Record<string, unknown>, LegalDocument>("documents", mapDocument, "created_at");
  return useMemo(() => (demoRole ? demoResult(demoRole === "citizen" || demoRole === "lawyer" ? documents : []) : real), [demoRole, real, documents]);
}

export function useAnalyses(): ListResult<Analysis> {
  const analyses = useDemoStore(s => s.analyses);
  const demoRole = useDemoRole();
  const real = useSupabaseList<Record<string, unknown>, Analysis>("analyses", mapAnalysis, "created_at");
  return useMemo(() => (demoRole ? demoResult(demoRole === "citizen" || demoRole === "lawyer" ? analyses : []) : real), [demoRole, real, analyses]);
}

export function useClausesByIds(clauseIds: string[]) {
  const demoRole = useDemoRole();
  const liveClauses=useDemoStore(s=>s.clauses);
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const { session, isDemo, loading: sessionLoading } = useSession();
  const key = JSON.stringify([session?.userId, clauseIds.slice().sort()]);
  const read = useCallback(async () => {
    if (!supabase) throw new Error("not_configured");
    const {data,error}=await supabase.from("document_clauses").select("*").in("id", clauseIds);
    if(error)throw new Error("query_failed");
    return (data || []).map(mapClause);
    // key contains every requested ID and caller identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, key]);
  const real=useScopedQuery<DocumentClause[]>(key, isDemo || sessionLoading || !clauseIds.length ? null : read, []);
  if (demoRole) return { data: [...liveClauses,...demoClauses].filter((c) => clauseIds.includes(c.id)), loading: false,error:null };
  return real;
}

// ---------------------------------------------------------------- cases
export function useCases(): ListResult<CaseRecord> {
  const demoRole = useDemoRole();
  const demoCases = useDemoStore((s) => s.cases);
  const real = useSupabaseList<Record<string, unknown>, CaseRecord>("cases", mapCase, "updated_at", { pollMs: 20000 });
  const demo = useMemo(() => {
    if (demoRole === "citizen") return demoCases.filter((c) => c.clientId === DEMO_USER_ID);
    if (demoRole === "lawyer") return demoCases.filter((c) => c.lawyerId === DEMO_LAWYER_ID);
    return [];
  }, [demoRole, demoCases]);
  return demoRole ? demoResult(demo) : real;
}

export function useCaseEvents(caseId: string | undefined): ListResult<CaseEvent> {
  const demoRole = useDemoRole();
  const demoEvents = useDemoStore((s) => s.events);
  const real = useSupabaseList<Record<string, unknown>, CaseEvent>("case_events", mapCaseEvent, "created_at", {
    ascending: true,
    filter: caseId ? { column: "case_id", value: caseId } : null,
    pollMs: 20000,
  });
  const demo = useMemo(
    () => demoEvents.filter((e) => e.caseId === caseId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [demoEvents, caseId]
  );
  return demoRole ? demoResult(demo) : real;
}

export function useCaseDocuments(caseId: string | undefined): ListResult<CaseDocument> {
  const demoRole = useDemoRole();
  const demoDocs = useDemoStore((s) => s.caseDocuments);
  const real = useSupabaseList<Record<string, unknown>, CaseDocument>("case_documents", mapCaseDocument, "created_at", {
    ascending: true,
    filter: caseId ? { column: "case_id", value: caseId } : null,
    pollMs: 20000,
  });
  const demo = useMemo(() => demoDocs.filter((d) => d.caseId === caseId), [demoDocs, caseId]);
  return demoRole ? demoResult(demo) : real;
}

/** Private lawyer notes — RLS returns them to the authoring lawyer only. */
export function useCaseNotes(caseId: string | undefined): ListResult<CaseNote> {
  const demoRole = useDemoRole();
  const demoNotes = useDemoStore((s) => s.caseNotes);
  const real = useSupabaseList<Record<string, unknown>, CaseNote>("case_notes", mapCaseNote, "created_at", {
    ascending: true,
    filter: caseId ? { column: "case_id", value: caseId } : null,
  });
  const demo = useMemo(() => demoNotes.filter((n) => n.caseId === caseId), [demoNotes, caseId]);
  return demoRole ? demoResult(demoRole === "lawyer" ? demo : []) : real;
}

// ---------------------------------------------------------------- scheduling
export function useAppointments(): ListResult<Appointment> {
  const demoRole = useDemoRole();
  const demoAppts = useDemoStore((s) => s.appointments);
  const real = useSupabaseList<Record<string, unknown>, Appointment>("appointments", mapAppointment, "start_time", {
    ascending: true,
  });
  const demo = useMemo(() => {
    if (demoRole === "citizen") return demoAppts.filter((a) => a.clientId === DEMO_USER_ID);
    if (demoRole === "lawyer") return demoAppts.filter((a) => a.lawyerId === DEMO_LAWYER_ID);
    return [];
  }, [demoRole, demoAppts]);
  return demoRole ? demoResult(demo) : real;
}

export function useDrafts(): ListResult<LegalDraft> {
  const demoRole = useDemoRole();
  const demoDrafts = useDemoStore((s) => s.drafts);
  const real = useSupabaseList<Record<string, unknown>, LegalDraft>("drafts", mapDraft, "updated_at");
  const demo = useMemo(() => (demoRole === "lawyer" ? demoDrafts.filter((d) => d.lawyerId === DEMO_LAWYER_ID) : []), [demoRole, demoDrafts]);
  return demoRole ? demoResult(demo) : real;
}

export function useNotifications(): ListResult<AppNotification> {
  const demoRole = useDemoRole();
  const demoNotifs = useDemoStore((s) => s.notifications);
  const real = useSupabaseList<Record<string, unknown>, AppNotification>("notifications", mapNotification, "created_at", {
    pollMs: 30000,
  });
  const demo = useMemo(() => {
    if (!demoRole) return [];
    const me = demoProfileId(demoRole);
    return demoNotifs.filter((n) => n.userId === me);
  }, [demoRole, demoNotifs]);
  return demoRole ? demoResult(demo) : real;
}

// ---------------------------------------------------------------- messages
export function useAllMessages(): ListResult<Message> {
  const demoRole = useDemoRole();
  const demoMessages = useDemoStore((s) => s.messages);
  const demoCases = useDemoStore((s) => s.cases);
  const real = useSupabaseList<Record<string, unknown>, Message>("messages", mapMessage, "created_at", { pollMs: 15000 });
  const demo = useMemo(() => {
    const mine = new Set(
      demoCases
        .filter((c) => (demoRole === "citizen" ? c.clientId === DEMO_USER_ID : demoRole === "lawyer" ? c.lawyerId === DEMO_LAWYER_ID : false))
        .map((c) => c.id)
    );
    return demoMessages.filter((m) => mine.has(m.caseId));
  }, [demoRole, demoMessages, demoCases]);
  return demoRole ? demoResult(demo) : real;
}

export function useMessages(caseId: string | undefined): ListResult<Message> {
  const demoRole = useDemoRole();
  const demoMessages = useDemoStore((s) => s.messages);
  const real = useSupabaseList<Record<string, unknown>, Message>("messages", mapMessage, "created_at", {
    ascending: true,
    filter: caseId ? { column: "case_id", value: caseId } : null,
    pollMs: 8000,
  });
  const demo = useMemo(() => demoMessages.filter((m) => m.caseId === caseId), [demoMessages, caseId]);
  return demoRole ? demoResult(demo) : real;
}

// ---------------------------------------------------------------- admin
export interface AdminStats {
  citizens: number;
  lawyers_approved: number;
  lawyers_pending: number;
  documents: number;
  analyses: number;
  appointments: number;
  open_reports: number;
  cases_by_status: Record<string, number>;
  cases_by_category: Record<string, number>;
  weekly: { week: string; analyses: number; requests: number }[];
}

export interface AdminCaseRow {
  id: string;
  title: string;
  category: string;
  status: CaseRecord["status"];
  priority: CaseRecord["priority"];
  urgency: CaseRecord["urgency"];
  clientName: string;
  lawyerName?: string;
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
}

const mapAdminCase = (r: Record<string, unknown>): AdminCaseRow => ({
  id: r.id as string,
  title: r.title as string,
  category: r.category as string,
  status: r.status as AdminCaseRow["status"],
  priority: r.priority as AdminCaseRow["priority"],
  urgency: r.urgency as AdminCaseRow["urgency"],
  clientName: r.client_name as string,
  lawyerName: (r.lawyer_name as string) || undefined,
  isManual: !!r.is_manual,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
});

/** Metadata-only case oversight for admins (no case content). */
export function useAdminCases(): ListResult<AdminCaseRow> {
  const demoRole = useDemoRole();
  const demoCases = useDemoStore((s) => s.cases);
  const demoLawyers = useDemoStore((s) => s.lawyers);
  const real = useSupabaseList<Record<string, unknown>, AdminCaseRow>("admin_cases_overview", mapAdminCase, "updated_at");
  const demo = useMemo<AdminCaseRow[]>(
    () =>
      demoCases.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        status: c.status,
        priority: c.priority,
        urgency: c.urgency,
        clientName: c.clientName,
        lawyerName: demoLawyers.find((l) => l.id === c.lawyerId)?.fullName,
        isManual: c.isManual,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    [demoCases, demoLawyers]
  );
  return demoRole ? demoResult(demo) : real;
}

export function useAdminStats(): { stats: AdminStats | null; loading: boolean; error:string|null } {
  const demoRole = useDemoRole();
  const demoCases = useDemoStore((s) => s.cases);
  const demoProfiles = useDemoStore((s) => s.profiles);
  const demoLawyers = useDemoStore((s) => s.lawyers);
  const demoPending = useDemoStore((s) => s.pendingLawyers);
  const demoReports = useDemoStore((s) => s.reports);
  const demoAppts = useDemoStore((s) => s.appointments);
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const {session,isDemo,loading:sessionLoading}=useSession();
  const key=JSON.stringify([session?.userId,isDemo,sessionLoading,"admin_platform_stats"]);
  const read=useCallback(async()=>{
    if(!supabase)throw new Error("not_configured");
    const {data,error}=await supabase.rpc("admin_platform_stats");
    if(error||!data)throw new Error("query_failed");
    return data as AdminStats;
  },[supabase]);
  const real=useScopedQuery<AdminStats|null>(key,isDemo||sessionLoading?null:read,null);

  const demo = useMemo<AdminStats>(() => {
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    demoCases.forEach((c) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    });
    return {
      citizens: demoProfiles.filter((p) => p.role === "citizen").length,
      lawyers_approved: demoLawyers.length,
      lawyers_pending: demoPending.filter((l) => l.verificationStatus === "pending" || l.verificationStatus === "more_info_requested").length,
      documents: 12,
      analyses: 9,
      appointments: demoAppts.length,
      open_reports: demoReports.filter((r) => r.status === "open" || r.status === "reviewing").length,
      cases_by_status: byStatus,
      cases_by_category: byCategory,
      weekly: [
        { week: "W1", analyses: 2, requests: 1 },
        { week: "W2", analyses: 3, requests: 2 },
        { week: "W3", analyses: 1, requests: 3 },
        { week: "W4", analyses: 4, requests: 2 },
        { week: "W5", analyses: 3, requests: 4 },
        { week: "W6", analyses: 5, requests: demoCases.length },
      ],
    };
  }, [demoCases, demoProfiles, demoLawyers, demoPending, demoReports, demoAppts]);

  return demoRole ? { stats: demo, loading: false,error:null } : { stats:real.data, loading:real.loading,error:real.error };
}

/** Admin-only: every lawyer row including private verification data. */
export function useAdminLawyers(): ListResult<Lawyer> {
  const demoRole = useDemoRole();
  const demoLawyers = useDemoStore((s) => s.lawyers);
  const demoPending = useDemoStore((s) => s.pendingLawyers);
  const real = useSupabaseList<Record<string, unknown>, Lawyer>("lawyers", mapLawyer, "created_at");
  const demo = useMemo(() => [...demoPending, ...demoLawyers], [demoPending, demoLawyers]);
  return demoRole ? demoResult(demo) : real;
}

export function useAdminUsers(): ListResult<Profile> {
  const demoRole = useDemoRole();
  const demoProfiles = useDemoStore((s) => s.profiles);
  const real = useSupabaseList<Record<string, unknown>, Profile>("profiles", mapProfile, "created_at");
  return demoRole ? demoResult(demoProfiles) : real;
}

/** Lawyer ids the signed-in user bookmarked (per account, in the database). */
export function useSavedLawyerIds(): { ids: string[]; loading: boolean; error: string | null; refetch: () => Promise<boolean | void> } {
  const demoRole = useDemoRole();
  const demoIds = useDemoStore((s) => s.savedLawyerIds);
  const real = useSupabaseList<Record<string, unknown>, string>("saved_lawyers", (r) => r.lawyer_id as string, "created_at");
  return demoRole ? { ids: demoIds, loading:false, error:null, refetch: NOOP } : { ids: real.data, loading:real.loading, error:real.error, refetch: real.refetch };
}

/** The signed-in user's saved AI exchanges (Ask the Law / scenarios). */
export function useAiHistory(kind: "ask" | "scenario", documentId?: string): ListResult<AiHistoryEntry> {
  const demoRole = useDemoRole();
  const demoHistory=useDemoStore(s=>s.aiHistory);
  const real = useSupabaseList<Record<string, unknown>, AiHistoryEntry>(
    "ai_history",
    (r) => ({
      id: r.id as string,
      kind: r.kind as "ask" | "scenario",
      documentId: (r.document_id as string) || undefined,
      prompt: r.prompt as string,
      answer: (r.answer as Record<string, unknown>) || {},
      createdAt: r.created_at as string,
    }),
    "created_at",
    { filter: { column: "kind", value: kind } }
  );
  const filtered = real.data.filter((e) => e.documentId === documentId);
  return demoRole ? demoResult<AiHistoryEntry>(demoHistory.filter(h=>h.kind===kind&&h.documentId===documentId)) : { ...real, data: filtered };
}

export function useReports(): ListResult<Report> {
  const demoRole = useDemoRole();
  const demoReports = useDemoStore((s) => s.reports);
  const real = useSupabaseList<Record<string, unknown>, Report>("reports", mapReport, "created_at");
  return demoRole ? demoResult(demoReports) : real;
}

export function useSystemEvents(): ListResult<SystemEvent> {
  const demoRole = useDemoRole();
  const demoEvents = useDemoStore((s) => s.systemEvents);
  const real = useSupabaseList<Record<string, unknown>, SystemEvent>("system_events", mapSystemEvent, "created_at");
  return demoRole ? demoResult(demoEvents) : real;
}
