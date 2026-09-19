import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { stripLocale } from "@/lib/auth/next-path";
import { DEMO_COOKIE } from "@/lib/demo/mode";

const intlMiddleware = createIntlMiddleware(routing);

const AREAS = ["citizen", "lawyer", "admin"] as const;
type Area = (typeof AREAS)[number];

/** Pages a not-yet-approved lawyer may still open. */
const PENDING_LAWYER_ALLOWED = ["/lawyer/verification", "/lawyer/profile"];

function localeOf(pathname: string) {
  const first = pathname.split("/")[1];
  return (routing.locales as readonly string[]).includes(first) ? first : routing.defaultLocale;
}

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request) ?? NextResponse.next();
  // A locale redirect (e.g. "/" -> "/ar") needs no auth work.
  if (response.headers.get("location")) return response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes the session cookie when needed and gives us the verified user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const locale = localeOf(pathname);
  const path = stripLocale(pathname);
  const area = path.split("/")[1] as Area;
  if (!AREAS.includes(area)) return response;

  const redirectTo = (to: string) => {
    const r = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  // ----- Not signed in -----
  if (!user) {
    const demo = request.cookies.get(DEMO_COOKIE)?.value;
    // The isolated demo (sample data only, no server session) may open its own role's pages.
    if (demo && (AREAS as readonly string[]).includes(demo)) {
      return demo === area ? response : redirectTo(`/${locale}/${demo}/dashboard`);
    }
    return redirectTo(`/${locale}/login?next=${encodeURIComponent(pathname + search)}`);
  }

  // ----- Signed in: enforce role + account status on the server -----
  const { data: profile } = await supabase.from("profiles").select("role, account_status").eq("id", user.id).single();
  if (!profile || profile.account_status === "disabled") {
    await supabase.auth.signOut();
    return redirectTo(`/${locale}/login?error=account_disabled`);
  }
  if (profile.role !== area) return redirectTo(`/${locale}/${profile.role}/dashboard`);

  if (profile.role === "lawyer" && !PENDING_LAWYER_ALLOWED.some((p) => path.startsWith(p))) {
    const { data: lawyer } = await supabase.from("lawyers").select("verification_status").eq("profile_id", user.id).single();
    if (lawyer?.verification_status !== "approved") return redirectTo(`/${locale}/lawyer/verification`);
  }

  return response;
}

export const config = { matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"] };
