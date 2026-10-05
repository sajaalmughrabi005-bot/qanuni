import type { UserRole } from "@/types";

/** UI isolation flag only. Paid/server AI also requires the signed, expiring
 * HttpOnly haq_demo_session cookie. Browser state never grants real access.
 * Supabase browser calls are disabled while this UI flag is active. */
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
