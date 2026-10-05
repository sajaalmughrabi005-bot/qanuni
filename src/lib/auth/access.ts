import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_COOKIE } from "@/lib/demo/mode";
import { DEMO_SESSION_COOKIE, verifyDemoSession } from "@/lib/demo/session";
import type { UserRole } from "@/types";

export type AccessLevel = "real" | "demo" | "none";

/**
 * Who is calling a server action?
 *  - "real": a verified Supabase session with an active account.
 *  - "demo": matching signed/expiring server session and UI isolation flag.
 *            Real provider calls are permitted; production data is isolated.
 *  - "none": anonymous.
 */
export async function getAccessContext(): Promise<{ level: AccessLevel; id?: string; role?: UserRole }> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("account_status,role").eq("id", user.id).single();
      if (profile && profile.account_status === "active") return { level: "real", id: user.id, role: profile.role as UserRole };
      return { level: "none" };
    }
  }
  const jar = await cookies();
  const session = verifyDemoSession(jar.get(DEMO_SESSION_COOKIE)?.value);
  return session && session.role === jar.get(DEMO_COOKIE)?.value
    ? { level: "demo", id: session.id, role: session.role } : { level: "none" };
}

export async function getAccessLevel(): Promise<AccessLevel> { return (await getAccessContext()).level; }

/** Professional operations must not rely on middleware-only verification. */
export async function getProfessionalAccessContext(): Promise<Awaited<ReturnType<typeof getAccessContext>>> {
 const access=await getAccessContext();
 if(access.level==="real"&&access.role==="lawyer") {
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase!.from("lawyers").select("verification_status,is_demo").eq("profile_id",access.id).single();
  if(error||data?.verification_status!=="approved"||data.is_demo)return {level:"none" as const};
 }
 return access;
}

/** The authenticated user's id, or null. */
export async function getUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
