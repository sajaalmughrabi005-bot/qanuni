"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapProfile } from "@/lib/supabase/mappers";
import type { Profile, UserRole } from "@/types";

export interface Session {
  userId: string;
  role: UserRole;
}

interface SessionContextValue {
  session: Session | null;
  profile: Profile | undefined;
  isAuthenticated: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  profile: undefined,
  isAuthenticated: false,
  loading: true,
  refreshProfile: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [loading, setLoading] = useState(!!supabase);

  const loadProfile = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      const p = mapProfile(data);
      setProfile(p);
      setSession({ userId, role: p.role });
    }
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
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const refreshProfile = async () => {
    if (session) await loadProfile(session.userId);
  };

  return (
    <SessionContext.Provider
      value={{ session, profile, isAuthenticated: !!session, loading, refreshProfile }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
