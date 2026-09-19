import type { UserRole } from "@/types";

/**
 * Demo mode is a purely client-side, in-memory experience with clearly
 * fake sample data (see ./dataset.ts). It has NO server session, NO
 * database access and NO privileges: while it is active the Supabase
 * browser client is disabled entirely, so nothing the visitor does can read
 * or write a real record, and tampering with this cookie can only change
 * which sample data the UI shows.
 */
export const DEMO_COOKIE = "qanuni_demo";

export function getDemoRole(): UserRole | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${DEMO_COOKIE}=([^;]*)`));
  const value = match?.[1];
  return value === "citizen" || value === "lawyer" || value === "admin" ? value : null;
}

export const isDemoActive = () => getDemoRole() !== null;

export function setDemoCookie(role: UserRole) {
  document.cookie = `${DEMO_COOKIE}=${role}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearDemoCookie() {
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
