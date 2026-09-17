"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LawyerSpecialty, UserRole } from "@/types";

export type SignUpInput = {
  fullName: string;
  email: string;
  password: string;
  role: "citizen" | "lawyer";
  barNumber?: string;
  specialty?: LawyerSpecialty;
  language: "ar" | "en";
};

export type AuthResult =
  | { ok: true; session: true; role: UserRole }
  | { ok: true; session: false } // signed up, but email confirmation is required before login
  | { ok: false; error: string };

export async function signUpAction(input: SignUpInput): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "not_configured" };

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        role: input.role,
        language: input.language,
        bar_number: input.barNumber,
        specialty: input.specialty,
      },
    },
  });

  if (error) return { ok: false, error: error.message };
  if (!data.session) return { ok: true, session: false };
  return { ok: true, session: true, role: input.role };
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
  // Always return { ok: true } to the caller regardless of whether the
  // email exists — Supabase itself already does this (resetPasswordForEmail
  // never reveals account existence), so this simply mirrors that.
  await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
  return { ok: true };
}

export async function updatePasswordAction(
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "not_configured" };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
