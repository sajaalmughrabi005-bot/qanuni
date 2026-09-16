"use client";

import { useAppStore } from "@/lib/store/app-store";
import { demoProfiles } from "@/lib/mock-data/users";

export function useSession() {
  const session = useAppStore((s) => s.session);
  const overrides = useAppStore((s) => (session ? s.profileOverrides[session.userId] : undefined));
  const registeredUsers = useAppStore((s) => s.registeredUsers);
  const registered = session
    ? Object.values(registeredUsers).find((u) => u.profile.id === session.userId)
    : undefined;
  const base = session ? demoProfiles[session.userId] || registered?.profile : undefined;
  const profile = base ? (overrides ? { ...base, ...overrides } : base) : undefined;
  return { session, profile, isAuthenticated: !!session };
}
