"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  mapAnalysis,
  mapAppointment,
  mapCase,
  mapClause,
  mapDocument,
  mapDraft,
  mapMessage,
  mapNotification,
} from "@/lib/supabase/mappers";
import type {
  Analysis,
  Appointment,
  CaseRecord,
  DocumentClause,
  LegalDocument,
  LegalDraft,
  Message,
  AppNotification,
} from "@/types";

/**
 * Generic "fetch rows visible to me" hook. RLS already scopes each table to
 * the caller (own rows, or the assigned lawyer, or an admin), so every role
 * can share the same unfiltered select.
 */
function useSupabaseList<Row extends Record<string, unknown>, T>(
  table: string,
  mapper: (row: Row) => T,
  orderBy: string,
  ascending = false
) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(!!supabase);

  const refetch = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data: rows } = await supabase.from(table).select("*").order(orderBy, { ascending });
    setData(((rows as Row[]) || []).map(mapper));
    setLoading(false);
  }, [supabase, table, mapper, orderBy, ascending]);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from(table)
      .select("*")
      .order(orderBy, { ascending })
      .then(({ data: rows }) => {
        setData(((rows as Row[]) || []).map(mapper));
        setLoading(false);
      });
    // supabase/table/mapper/orderBy/ascending are stable for the hook's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, table]);

  return { data, loading, refetch };
}

export function useDocuments() {
  return useSupabaseList<Record<string, unknown>, LegalDocument>(
    "documents",
    mapDocument,
    "created_at"
  );
}

export function useAnalyses() {
  return useSupabaseList<Record<string, unknown>, Analysis>("analyses", mapAnalysis, "created_at");
}

export function useClausesByIds(clauseIds: string[]) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [data, setData] = useState<DocumentClause[]>([]);
  const [loading, setLoading] = useState(!!supabase);
  const key = clauseIds.slice().sort().join(",");

  useEffect(() => {
    if (!supabase || clauseIds.length === 0) return;
    supabase
      .from("document_clauses")
      .select("*")
      .in("id", clauseIds)
      .then(({ data: rows }) => {
        setData((rows || []).map(mapClause));
        setLoading(false);
      });
    // key is a stable serialization of clauseIds; safe to depend on it instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, key]);

  return { data: clauseIds.length === 0 ? [] : data, loading: clauseIds.length === 0 ? false : loading };
}

export function useCases() {
  return useSupabaseList<Record<string, unknown>, CaseRecord>("cases", mapCase, "updated_at");
}

export function useAppointments() {
  return useSupabaseList<Record<string, unknown>, Appointment>(
    "appointments",
    mapAppointment,
    "start_time",
    true
  );
}

export function useDrafts() {
  return useSupabaseList<Record<string, unknown>, LegalDraft>("drafts", mapDraft, "updated_at");
}

export function useNotifications() {
  return useSupabaseList<Record<string, unknown>, AppNotification>(
    "notifications",
    mapNotification,
    "created_at"
  );
}

export function useAllMessages() {
  return useSupabaseList<Record<string, unknown>, Message>("messages", mapMessage, "created_at");
}

export function useMessages(caseId: string | undefined) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [data, setData] = useState<Message[]>([]);
  const [loading, setLoading] = useState(!!supabase && !!caseId);

  const refetch = useCallback(async () => {
    if (!supabase || !caseId) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("messages")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });
    setData((rows || []).map(mapMessage));
    setLoading(false);
  }, [supabase, caseId]);

  useEffect(() => {
    if (!supabase || !caseId) return;
    supabase
      .from("messages")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true })
      .then(({ data: rows }) => {
        setData((rows || []).map(mapMessage));
        setLoading(false);
      });
  }, [supabase, caseId]);

  return { data, loading, refetch };
}
