"use server";

import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LawyerSpecialty, UserRole } from "@/types";

export type SignUpInput = {
  fullName: string;
  email: string;
  password: string;
  role: "citizen" | "lawyer";
  barNumber?: string;
  specialty?: LawyerSpecialty;
  /** Free-text professional details the admin reviews before approving a lawyer. */
  verificationInfo?: string;
  language: "ar" | "en";
};

export type AuthResult =
  | { ok: true; session: true; role: UserRole }
  | { ok: true; session: false } // signed up, but email confirmation is required before login
  | { ok: false; error: string };

const SPECIALTIES: LawyerSpecialty[] = ["rental", "employment", "commercial", "family", "criminal", "real_estate", "corporate", "civil"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signUpAction(input: SignUpInput): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "not_configured" };

  // Server-side validation: never trust the form. "admin" can never be
  // requested here — only citizen or lawyer — and the database trigger also
  // maps any other role value to citizen.
  const role = input.role === "lawyer" ? "lawyer" : "citizen";
  const email = (input.email || "").trim().toLowerCase();
  const fullName = (input.fullName || "").trim();
  if (fullName.length < 2 || fullName.length > 120) return { ok: false, error: "invalid_name" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "invalid_email" };
  if (!input.password || input.password.length < 8) return { ok: false, error: "weak_password" };
  if (role === "lawyer") {
    if (!input.barNumber || input.barNumber.trim().length < 3) return { ok: false, error: "bar_number_required" };
    if (!input.specialty || !SPECIALTIES.includes(input.specialty)) return { ok: false, error: "specialty_required" };
  }
  const language = input.language === "en" ? "en" : "ar";

  const origin = await siteOrigin();
  const dashboard = `/${language}/${role}/dashboard`;
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
        bar_number: role === "lawyer" ? input.barNumber?.trim() : undefined,
        specialty: role === "lawyer" ? input.specialty : undefined,
        verification_info: role === "lawyer" ? input.verificationInfo?.trim().slice(0, 2000) : undefined,
      },
    },
  });

  if (error) return { ok: false, error: error.message };
  // Supabase returns a user with no identities (and no error) when the email
  // is already registered, to avoid leaking which emails exist.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { ok: false, error: "already registered" };
  }
  if (!data.session) return { ok: true, session: false };
  return { ok: true, session: true, role };
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
  const safeRedirect = redirectTo.startsWith(origin) ? redirectTo : `${origin}/ar/auth/callback?next=/ar/reset-password`;
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
