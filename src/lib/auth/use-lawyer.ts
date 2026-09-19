"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapLawyer } from "@/lib/supabase/mappers";
import { useDemoStore } from "@/lib/demo/store";
import { useDemoRole, DEMO_LAWYER_ID } from "@/lib/demo/use-demo";
import { useSession } from "@/lib/auth/use-session";
import type { Lawyer } from "@/types";

/**
 * Public lawyer directory. Reads the `lawyers_public` view, which only ever
 * contains approved, non-demo lawyers with active accounts and only
 * public-safe columns. In the isolated demo it returns clearly-fake sample
 * lawyers instead.
 */
export function useLawyerDirectory(): { lawyers: Lawyer[]; loading: boolean } {
  const demoRole = useDemoRole();
  const demoLawyers = useDemoStore((s) => s.lawyers);
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("lawyers_public")
      .select("*")
      .order("rating", { ascending: false })
      .then(({ data }) => {
        setLawyers((data || []).map(mapLawyer));
        setLoading(false);
      });
  }, [supabase]);

  return demoRole ? { lawyers: demoLawyers, loading: false } : { lawyers, loading };
}

/** One publicly visible lawyer by id (undefined when unknown, unapproved or hidden). */
export function useLawyer(id: string | undefined): { lawyer: Lawyer | undefined; loading: boolean } {
  const demoRole = useDemoRole();
  const demoLawyers = useDemoStore((s) => s.lawyers);
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [lawyer, setLawyer] = useState<Lawyer | undefined>(undefined);
  const [loading, setLoading] = useState(!!supabase && !!id);

  useEffect(() => {
    if (!supabase || !id) return;
    supabase
      .from("lawyers_public")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setLawyer(data ? mapLawyer(data) : undefined);
        setLoading(false);
      });
  }, [supabase, id]);

  if (demoRole) return { lawyer: demoLawyers.find((l) => l.id === id), loading: false };
  return { lawyer, loading };
}

/**
 * The signed-in lawyer's own private row (bar number, verification status,
 * availability, ...). Comes from the session provider so it stays in sync;
 * `refresh` re-reads it after a save.
 */
export function useMyLawyer(): { lawyer: Lawyer | undefined; refresh: () => Promise<void> } {
  const demoRole = useDemoRole();
  const demoLawyers = useDemoStore((s) => s.lawyers);
  const { lawyer, refreshProfile } = useSession();
  const demoLawyer = useMemo(() => demoLawyers.find((l) => l.id === DEMO_LAWYER_ID), [demoLawyers]);
  return demoRole === "lawyer" ? { lawyer: demoLawyer, refresh: async () => {} } : { lawyer, refresh: refreshProfile };
}
