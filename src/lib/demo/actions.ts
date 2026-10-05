"use server";
import { cookies, headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_COOKIE } from "./mode";
import { DEMO_SESSION_COOKIE, DEMO_SESSION_SECONDS, signDemoSession } from "./session";
import { consumeRateLimit, privateRateKey } from "@/lib/ai/limits";
import type { UserRole } from "@/types";

export async function startDemoAction(role: UserRole): Promise<{ ok: boolean }> {
  try {
    if (!["citizen", "lawyer", "admin"].includes(role)) return { ok: false };
    const h = await headers();
    consumeRateLimit("demo-entry:worker", 24);
    consumeRateLimit(`demo-entry:${privateRateKey(h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local")}`, 6);
    const token = signDemoSession(role);
    const supabase = await createSupabaseServerClient();
    const result = await supabase?.auth.signOut();
    if (result?.error) return { ok: false };
    const jar = await cookies();
    const options = { path: "/", maxAge: DEMO_SESSION_SECONDS, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };
    jar.set(DEMO_SESSION_COOKIE, token, { ...options, httpOnly: true });
    jar.set(DEMO_COOKIE, role, options);
    return { ok: true };
  } catch { return { ok: false }; }
}
