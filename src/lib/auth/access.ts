import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_COOKIE } from "@/lib/demo/mode";

export type AccessLevel = "real" | "demo" | "none";

/**
 * Who is calling a server action?
 *  - "real": a verified Supabase session with an active account.
 *  - "demo": no session, but the isolated sample-data demo cookie is present.
 *            Demo callers only ever get the free local heuristic engine, so
 *            they can neither spend the OpenAI budget nor touch real data.
 *  - "none": anonymous.
 */
export async function getAccessLevel(): Promise<AccessLevel> {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("account_status").eq("id", user.id).single();
      if (profile && profile.account_status === "active") return "real";
      return "none";
    }
  }
  const demo = (await cookies()).get(DEMO_COOKIE)?.value;
  return demo ? "demo" : "none";
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
