"use client";

import { useAppStore } from "@/lib/store/app-store";
import { demoProfiles } from "@/lib/mock-data/users";

export function useSession() {
  const session = useAppStore((s) => s.session);
  const profile = session ? demoProfiles[session.userId] : undefined;
  return { session, profile, isAuthenticated: !!session };
}
