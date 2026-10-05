import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/next-path";

// Supabase's confirmation/password-reset emails link here with a `code`
// (PKCE flow). We exchange it for a real session (this sets the auth
// cookies) then redirect to wherever the flow that started it wants next.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next")) || "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return NextResponse.redirect(new URL("/ar/login?error=invalid_link", origin));
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
