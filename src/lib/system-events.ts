import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const lastLogged = new Map<string, number>();
const THROTTLE_MS = 60_000;

/**
 * Records a platform-health event (AI provider failure, ...) in `system_events`,
 * which only admins can read. Callers must pass a short technical message — never
 * user content such as contract text. Throttled per kind so an outage can't flood
 * the table, and never throws: monitoring must not break the request.
 */
export async function logSystemEvent(kind: string, message: string, severity: "info" | "warning" | "error" = "error") {
  try {
    const now = Date.now();
    if (now - (lastLogged.get(kind) ?? 0) < THROTTLE_MS) return;
    lastLogged.set(kind, now);
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    await admin.from("system_events").insert({ kind, severity, message: message.slice(0, 500) });
  } catch {
    // swallow
  }
}
