"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Sends a payment-reminder notification to a case's client. Notifications are
 * owner-only (RLS: user_id = auth.uid()), so a lawyer can't insert one for the
 * client directly from the browser — this verifies the caller can actually
 * read the case (RLS already scopes that to the assigned lawyer/admin) and
 * then uses the service-role client to write the notification server-side.
 */
export async function sendPaymentReminderAction(
  caseId: string,
  amount: number,
  caseTitle: string
): Promise<{ ok: boolean }> {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return { ok: false };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false };
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { ok: false };

  // Only the case's own lawyer may send a reminder. Title comes from the DB, not the caller.
  const { data: caseRow } = await supabase.from("cases").select("client_id, title, lawyer_id").eq("id", caseId).single();
  if (!caseRow || !caseRow.client_id || !caseRow.lawyer_id) return { ok: false };
  const { data: mine } = await supabase.from("lawyers").select("id").eq("profile_id", uid).maybeSingle();
  if (!mine || mine.id !== caseRow.lawyer_id) return { ok: false };
  caseTitle = caseRow.title;

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false };
  const { error } = await admin.from("notifications").insert({
    user_id: caseRow.client_id,
    type: "system",
    title_ar: "تذكير بدفع الأتعاب",
    title_en: "Payment reminder",
    body_ar: `تذكير بدفع المبلغ المتبقي (${amount} دينار) لقضية "${caseTitle}"`,
    body_en: `Reminder to pay the remaining balance (${amount} JOD) for case "${caseTitle}"`,
    read: false,
    href: `/citizen/cases/${caseId}`,
  });
  return { ok: !error };
}
