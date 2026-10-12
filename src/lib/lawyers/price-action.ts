"use server";

import { z } from "zod";
import { getAccessContext } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { operationFailure } from "../data/operation-failure";
import { parseConsultationPrice } from "./consultation-price";

/** Existing numeric(10,2) column and 004 owner RLS/grant, never service-role.
 * Preserve the existing active-lawyer self-edit permission (approval is not
 * self-edit authority). Derive profile identity on server; return only price.
 * A zero-row or uncertain update is failure, not a success toast. */
export async function saveConsultationPriceAction(lawyerId: string, input: unknown): Promise<{ ok: true; price: number } | { ok: false; error: string }> {
  const price = parseConsultationPrice(input);
  if (!z.uuid().safeParse(lawyerId).success || price === null) return { ok: false, error: "invalid_price" };
  try {
    const access = await getAccessContext();
    if (access.level !== "real" || access.role !== "lawyer" || !access.id) return { ok: false, error: "not_allowed" };
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "not_configured" };
    const { data, error } = await supabase.from("lawyers").update({ consultation_price: price })
      .eq("id", lawyerId).eq("profile_id", access.id).eq("is_demo", false).select("consultation_price").maybeSingle();
    if (error) return { ok: false, error: operationFailure(error, "save_failed") };
    if (!data || Number(data.consultation_price) !== price) return { ok: false, error: "save_unconfirmed" };
    return { ok: true, price };
  } catch { return { ok: false, error: "save_unconfirmed" }; }
}
