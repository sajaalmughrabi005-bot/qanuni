"use server";

import { headers, cookies } from "next/headers";
import { DEMO_SESSION_COOKIE } from "@/lib/demo/session";
import { DEMO_COOKIE } from "@/lib/demo/mode";
import { classifySignupError, signupDiagnostic, type SignupErrorCode, type SignupStage } from "./signup-diagnostics";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isGovernorate } from "@/lib/governorates";
import type { LawyerSpecialty, UserRole } from "@/types";

export type SignUpInput = {
  fullName: string;
  email: string;
  password: string;
  role: "citizen" | "lawyer";
  barNumber?: string;
  specialty?: LawyerSpecialty;
  /** Governorate key (see lib/governorates.ts). Required for lawyers. */
  city?: string;
  /** Free-text professional details the admin reviews before approving a lawyer. */
  verificationInfo?: string;
  language: "ar" | "en";
};

export type AuthResult =
  | { ok: true; session: true; role: UserRole }
  | { ok: true; session: false } // signed up, but email confirmation is required before login
  | { ok: false; error: SignupErrorCode };

const SPECIALTIES: LawyerSpecialty[] = ["rental", "employment", "commercial", "family", "criminal", "real_estate", "corporate", "civil"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) throw new Error("site_origin_missing");
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
  const proto = h.get("x-forwarded-proto") ?? (local ? "http" : "https");
  if (proto !== "http" && proto !== "https") throw new Error("site_origin_invalid");
  const origin = new URL(`${proto}://${host}`);
  if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) throw new Error("site_origin_invalid");
  return origin.origin;
}

export async function signUpAction(input: SignUpInput): Promise<AuthResult> {
  const requestId = crypto.randomUUID();
  let stage: SignupStage = "configuration";
  const invalid = (error: SignupErrorCode): AuthResult => {
    signupDiagnostic(requestId,"validation",{category:"validation",code:error});
    return {ok:false,error};
  };
  try {
  const supabase = await createSupabaseServerClient();
  if (!supabase) { signupDiagnostic(requestId,stage,{category:"configuration",code:"missing_configuration"}); return { ok: false, error: "not_configured" }; }

  // Server-side validation: never trust the form. "admin" can never be
  // requested here — only citizen or lawyer — and the database trigger also
  // maps any other role value to citizen.
  stage = "validation";
  if (!input || typeof input !== "object") return invalid("generic");
  const role = input.role === "lawyer" ? "lawyer" : "citizen";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  if (fullName.length < 2 || fullName.length > 120) return invalid("invalid_name");
  if (!EMAIL_RE.test(email)) return invalid("invalid_email");
  if (typeof input.password !== "string" || input.password.length < 8 || input.password.length > 1024) return invalid("weak_password");
  if (role === "lawyer") {
    if (typeof input.barNumber !== "string" || input.barNumber.trim().length < 3 || input.barNumber.trim().length > 60) return invalid("bar_number_required");
    if (!input.specialty || !SPECIALTIES.includes(input.specialty)) return invalid("specialty_required");
  }
  const city = input.city && isGovernorate(input.city) ? input.city : undefined;
  if (input.city && !city) return invalid("invalid_city");
  if (role === "lawyer" && !city) return invalid("city_required");
  const language = input.language === "en" ? "en" : "ar";

  stage = "redirect";
  const origin = await siteOrigin();
  const dashboard = `/${language}/${role}/dashboard`;
  stage = "auth_signup";
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      // Without this, Supabase's confirmation link falls back to the bare
      // Site URL with a `?code=` nothing handles, so the account never
      // actually got a session after confirming.
      emailRedirectTo: `${origin}/${language}/auth/callback?next=${encodeURIComponent(dashboard)}`,
      data: {
        full_name: fullName,
        role,
        language,
        city,
        bar_number: role === "lawyer" ? input.barNumber?.trim() : undefined,
        specialty: role === "lawyer" ? input.specialty : undefined,
        verification_info: role === "lawyer" && typeof input.verificationInfo === "string" ? input.verificationInfo.trim().slice(0, 2000) : undefined,
      },
    },
  });

  if (error) {
    const failure=classifySignupError(error);
    signupDiagnostic(requestId,stage,failure);
    return { ok: false, error: failure.publicCode };
  }
  // Supabase returns a user with no identities (and no error) when the email
  // is already registered, to avoid leaking which emails exist.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    signupDiagnostic(requestId,stage,{category:"duplicate_account",code:"empty_identities"});
    return { ok: false, error: "email_taken" };
  }
  if (!data.user) { signupDiagnostic(requestId,stage,{category:"auth_signup",code:"missing_user"}); return {ok:false,error:"generic"}; }
  if (!data.session) { signupDiagnostic(requestId,"email_confirmation",{category:"confirmation_pending",code:"confirmation_pending"}); return { ok: true, session: false }; }
  stage = "profile_lookup";
  const {data:profile,error:profileError}=await supabase.from("profiles").select("id,role,account_status").eq("id",data.user.id).single();
  let profileValid=!profileError&&profile?.id===data.user.id&&profile.role===role&&profile.account_status==="active";
  if(profileValid&&role==="lawyer") {
    const lawyer=await supabase.from("lawyers").select("profile_id,verification_status").eq("profile_id",data.user.id).single();
    profileValid=!lawyer.error&&lawyer.data?.profile_id===data.user.id&&lawyer.data.verification_status==="pending";
  }
  if(!profileValid) { signupDiagnostic(requestId,stage,{category:"profile_creation_unverified",code:"profile_unavailable"}); await supabase.auth.signOut(); return {ok:false,error:"profile_unavailable"}; }
  const jar=await cookies();jar.delete(DEMO_SESSION_COOKIE);jar.delete(DEMO_COOKIE);
  signupDiagnostic(requestId,"complete",{category:"complete",code:"profile_verified"});
  return { ok: true, session: true, role };
  } catch(cause) {
    const failure=classifySignupError(cause);
    signupDiagnostic(requestId,stage,stage==="configuration"||stage==="redirect"?{category:"configuration",code:"configuration"}:failure);
    return {ok:false,error:stage==="profile_lookup"?"profile_unavailable":stage==="configuration"||stage==="redirect"?"service_unavailable":failure.publicCode};
  }
}

export async function loginAction(
  email: string,
  password: string
): Promise<{ ok: true; role: UserRole } | { ok: false; error: "invalid_credentials" | "account_disabled" | "not_configured" }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "not_configured" };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error || !data.user) return { ok: false, error: "invalid_credentials" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", data.user.id)
    .single();

  if (!profile) return { ok: false, error: "invalid_credentials" };
  if (profile.account_status === "disabled") {
    await supabase.auth.signOut();
    return { ok: false, error: "account_disabled" };
  }

  return { ok: true, role: profile.role as UserRole };
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(DEMO_SESSION_COOKIE);
  jar.delete(DEMO_COOKIE);
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
}

export async function requestPasswordResetAction(
  email: string,
  redirectTo: string
): Promise<{ ok: boolean }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false };
  // Only same-site redirect targets are allowed.
  const origin = await siteOrigin();
  let safeRedirect = `${origin}/ar/auth/callback?next=/ar/reset-password`;
  try { if (new URL(redirectTo).origin === origin) safeRedirect = redirectTo; } catch { /* use local fallback */ }
  // Always report success regardless of whether the email exists —
  // Supabase itself never reveals account existence here.
  await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: safeRedirect });
  return { ok: true };
}

export async function updatePasswordAction(
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "not_configured" };
  if (!newPassword || newPassword.length < 8) return { ok: false, error: "weak_password" };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Permanently deletes the signed-in user's own account and, through the
 * database's ON DELETE CASCADE rules, the personal data hanging off it
 * (profile, contracts, analyses, requests, notifications, ...). Admin
 * accounts can't be deleted this way so the platform can't be orphaned.
 */
export async function deleteAccountAction(confirmEmail: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "not_configured" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };
  if ((confirmEmail || "").trim().toLowerCase() !== (user.email || "").toLowerCase()) {
    return { ok: false, error: "confirmation_mismatch" };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "admin") return { ok: false, error: "admin_cannot_delete" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "not_configured" };
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: error.message };
  await supabase.auth.signOut();
  return { ok: true };
}
