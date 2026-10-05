"use client";

import { useCallback, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { readPublicDirectory } from "@/lib/data/public-directory";
import { useDemoStore } from "@/lib/demo/store";
import { useDemoRole, DEMO_LAWYER_ID } from "@/lib/demo/use-demo";
import { useScopedQuery } from "@/lib/data/use-scoped-query";
import { useSession } from "@/lib/auth/use-session";
import type { Lawyer } from "@/types";

/**
 * Public lawyer directory. Reads the `lawyers_public` view, which only ever
 * contains approved, non-demo lawyers with active accounts and only
 * public-safe columns. In the isolated demo it returns clearly-fake sample
 * lawyers instead.
 */
export function useLawyerDirectory(): { lawyers: Lawyer[]; loading: boolean; error: string | null; refetch: () => Promise<boolean> } {
  const demoRole = useDemoRole();
  const demoLawyers = useDemoStore((s) => s.lawyers);
  const read=useCallback(async()=>{
    return readPublicDirectory(createSupabaseBrowserClient());
  },[]);
  const real=useScopedQuery<Lawyer[]>(`public-lawyer-directory:${demoRole||"real"}`,demoRole?null:read,[]);
  return demoRole ? { lawyers: demoLawyers, loading: false, error:null,refetch:async()=>true } : { lawyers:real.data, loading:real.loading,error:real.error,refetch:real.refetch };
}

/** One publicly visible lawyer by id (undefined when unknown, unapproved or hidden). */
export function useLawyer(id: string | undefined): { lawyer: Lawyer | undefined; loading: boolean; error: string | null } {
  const demoRole = useDemoRole();
  const demoLawyers = useDemoStore((s) => s.lawyers);
  const read=useCallback(async()=>{
    const data=await readPublicDirectory(createSupabaseBrowserClient(),id);
    return data[0];
  },[id]);
  const real=useScopedQuery<Lawyer|undefined>(id||"",demoRole||!id?null:read,undefined);
  if (demoRole) return { lawyer: demoLawyers.find((l) => l.id === id), loading: false,error:null };
  return { lawyer:real.data, loading:real.loading,error:real.error };
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
