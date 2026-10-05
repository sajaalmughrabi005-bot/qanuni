import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@/types";

export const DEMO_SESSION_COOKIE = "haq_demo_session";
export const DEMO_SESSION_SECONDS = 3600;
export interface DemoSession { id: string; role: UserRole; expiresAt: number }
function secret() {
  const value = process.env.DEMO_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value || value.length < 32) throw new Error("demo_session_not_configured");
  return value;
}
export function signDemoSession(role: UserRole, now = Date.now()) {
  if (!["citizen", "lawyer", "admin"].includes(role)) throw new Error("invalid_demo_role");
  const payload = Buffer.from(JSON.stringify({ id: randomUUID(), role, expiresAt: now + DEMO_SESSION_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
export function verifyDemoSession(token: string | undefined, now = Date.now()): DemoSession | null {
  if (!token || token.length > 512) return null;
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const expected = createHmac("sha256", secret()).update(payload).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as DemoSession;
    if (!/^[0-9a-f-]{36}$/.test(session.id) || !["citizen", "lawyer", "admin"].includes(session.role)) return null;
    if (!Number.isFinite(session.expiresAt) || session.expiresAt <= now || session.expiresAt > now + DEMO_SESSION_SECONDS * 1000) return null;
    return session;
  } catch { return null; }
}
