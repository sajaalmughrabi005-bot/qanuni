"use client";

import { useAppStore } from "@/lib/store/app-store";
import { demoProfiles } from "@/lib/mock-data/users";

export function useSession() {
  const session = useAppStore((s) => s.session);
  const overrides = useAppStore((s) => (session ? s.profileOverrides[session.userId] : undefined));
  const base = session ? demoProfiles[session.userId] : undefined;
  const profile = base ? (overrides ? { ...base, ...overrides } : base) : undefined;
  return { session, profile, isAuthenticated: !!session };
}
