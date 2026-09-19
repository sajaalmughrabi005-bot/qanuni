/** Maps an action error code to a `cases.errors.*` translation key (falls back to "unknown"). */
const KEYS = new Set([
  "not_authenticated", "not_allowed", "forbidden", "lawyer_unavailable", "lawyer_not_accepting",
  "invalid_title", "invalid_description", "invalid_urgency", "invalid_category", "invalid_message",
  "invalid_transition", "case_not_found", "case_not_open_for_messages", "case_not_open_for_documents",
  "rejection_reason_required", "no_recipient", "file_too_large", "file_type_not_allowed", "not_configured",
]);

export function errorKey(code: string): string {
  return KEYS.has(code) ? code : "unknown";
}
