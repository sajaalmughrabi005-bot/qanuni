"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapLawyer, mapProfile } from "@/lib/supabase/mappers";
import { getDemoRole } from "@/lib/demo/mode";
import { useDemoStore } from "@/lib/demo/store";
import { DEMO_ADMIN_ID } from "@/lib/demo/dataset";
import { DEMO_LAWYER_PROFILE_ID } from "@/lib/demo/lawyers";
import { DEMO_USER_ID } from "@/lib/mock-data/contract";
import type { Lawyer, Profile, UserRole } from "@/types";

export interface Session {
  userId: string;
  role: UserRole;
}

interface SessionContextValue {
  session: Session | null;
  profile: Profile | undefined;
  /** The signed-in lawyer's own private row (verification status etc.). Undefined for non-lawyers. */
  lawyer: Lawyer | undefined;
  isAuthenticated: boolean;
  /** True while the isolated sample-data demo is active. Never true for a real account. */
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  profile: undefined,
  lawyer: undefined,
  isAuthenticated: false,
  isDemo: false,
  loading: true,
  error: null,
  refreshProfile: async () => {},
});

const DEMO_IDS: Record<UserRole, string> = {
  citizen: DEMO_USER_ID,
  lawyer: DEMO_LAWYER_PROFILE_ID,
  admin: DEMO_ADMIN_ID,
};

const noopSubscribe = () => () => {};

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const demoRole = useSyncExternalStore(noopSubscribe, getDemoRole, () => null);
  const demoProfiles = useDemoStore((s) => s.profiles);

  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [lawyer, setLawyer] = useState<Lawyer | undefined>(undefined);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const invalidate=useCallback(()=>{generation.current++;},[]);
  const identity = useRef<string | null>(null);

  const clearIdentity = () => {
    identity.current = null;
    setSession(null);
    setProfile(undefined);
    setLawyer(undefined);
  };

  const loadProfile = async (userId: string, request = ++generation.current) => {
    if (!supabase) return;
    try {
      const { data, error: profileError } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (profileError || !data || data.id !== userId || data.account_status !== "active") throw new Error("profile_unavailable");
      const p = mapProfile(data);
      let lawyerRow: Lawyer | undefined;
      if (p.role === "lawyer") {
        const { data: row, error: lawyerError } = await supabase.from("lawyers").select("*").eq("profile_id", userId).single();
        if (lawyerError || !row || row.profile_id !== userId) throw new Error("profile_unavailable");
        lawyerRow = mapLawyer(row);
      }
      if (request !== generation.current) return;
      identity.current = userId;
      setLawyer(lawyerRow);
      setProfile(p);
      setSession({ userId, role: p.role });
      setError(null);
    } catch {
      if (request === generation.current) { clearIdentity(); setError("profile_unavailable"); }
    } finally {
      if (request === generation.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) return;

    const initialGeneration = generation.current;
    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (initialGeneration !== generation.current) return;
      if (sessionError) throw new Error("session_unavailable");
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      } else {
        clearIdentity(); setLoading(false);
      }
    }).catch(() => {
      if (initialGeneration === generation.current) { clearIdentity(); setError("session_unavailable"); setLoading(false); }
    });

    const timers = new Set<ReturnType<typeof setTimeout>>();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const request = ++generation.current;
      const changed = identity.current !== (newSession?.user.id || null);
      if (changed) clearIdentity();
      setError(null);
      if (newSession?.user) {
        if (changed) setLoading(true);
        // Keep the auth callback synchronous; profile reads may refresh a token.
        const timer = setTimeout(() => { timers.delete(timer); void loadProfile(newSession.user.id, request); }, 0);
        timers.add(timer);
      } else {
        clearIdentity();
        setLoading(false);
      }
    });

    return () => {
      invalidate();
      for (const timer of timers) clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const value = useMemo<SessionContextValue>(() => {
    if (demoRole) {
      const id = DEMO_IDS[demoRole];
      return {
        session: { userId: id, role: demoRole },
        profile: demoProfiles.find((p) => p.id === id),
        lawyer: undefined,
        isAuthenticated: true,
        isDemo: true,
        loading: false,
        error: null,
        refreshProfile: async () => {},
      };
    }
    return {
      session,
      profile,
      lawyer,
      isAuthenticated: !!session,
      isDemo: false,
      loading,
      error,
      refreshProfile: async () => {
        if (session) await loadProfile(session.userId);
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoRole, demoProfiles, session, profile, lawyer, loading, error]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
