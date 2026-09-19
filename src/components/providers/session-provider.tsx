"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  profile: undefined,
  lawyer: undefined,
  isAuthenticated: false,
  isDemo: false,
  loading: true,
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

  const loadProfile = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (!data) return;
    const p = mapProfile(data);
    let lawyerRow: Lawyer | undefined;
    if (p.role === "lawyer") {
      const { data: row } = await supabase.from("lawyers").select("*").eq("profile_id", userId).single();
      lawyerRow = row ? mapLawyer(row) : undefined;
    }
    // Set together so a not-yet-approved lawyer never flashes the dashboard.
    setLawyer(lawyerRow);
    setProfile(p);
    setSession({ userId, role: p.role });
  };

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setSession(null);
        setProfile(undefined);
        setLawyer(undefined);
      }
    });

    return () => sub.subscription.unsubscribe();
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
      refreshProfile: async () => {
        if (session) await loadProfile(session.userId);
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoRole, demoProfiles, session, profile, lawyer, loading]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
