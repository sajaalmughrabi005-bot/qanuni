/** Public codes and operational categories only; never return/log Auth messages. */
export type SignupErrorCode =
  | "invalid_name" | "invalid_email" | "weak_password" | "bar_number_required"
  | "specialty_required" | "city_required" | "invalid_city" | "email_taken"
  | "rate_limit" | "not_configured" | "service_unavailable" | "profile_unavailable" | "generic";
export type SignupStage = "configuration" | "validation" | "redirect" | "auth_signup" | "profile_lookup" | "email_confirmation" | "complete";

export function classifySignupError(error: unknown): { category: string; publicCode: SignupErrorCode; code: string; status?: number } {
  const item = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const code = typeof item.code === "string" ? item.code : "";
  const message = typeof item.message === "string" ? item.message : "";
  const status = typeof item.status === "number" && Number.isInteger(item.status) && item.status >= 0 && item.status <= 599 ? item.status : undefined;
  if (["user_already_exists", "email_exists"].includes(code) || /already registered/i.test(message)) return { category: "duplicate_account", publicCode: "email_taken", code: "duplicate_account", status };
  if (code === "weak_password") return { category: "password_policy", publicCode: "weak_password", code, status };
  if (["over_email_send_rate_limit", "over_request_rate_limit"].includes(code) || status === 429) return { category: "rate_limit", publicCode: "rate_limit", code: "rate_limit", status };
  if (["signup_disabled", "email_address_not_authorized", "email_provider_disabled", "bad_jwt", "no_authorization"].includes(code) || /invalid.*api.?key/i.test(message)) return { category: "configuration", publicCode: "service_unavailable", code: "configuration", status };
  if (code === "email_address_invalid") return { category: "validation", publicCode: "invalid_email", code, status };
  if (/database error|saving new user|trigger/i.test(message)) return { category: "database_trigger", publicCode: "generic", code: "database_trigger", status };
  if (item.name === "AuthRetryableFetchError" || /fetch failed|failed to fetch|network|ENOTFOUND|timed? ?out/i.test(message)) return { category: "transport", publicCode: "service_unavailable", code: "transport", status };
  return { category: "auth_signup", publicCode: "generic", code: code === "unexpected_failure" ? code : "unclassified", status };
}

export function signupDiagnostic(requestId: string, stage: SignupStage, result: ReturnType<typeof classifySignupError> | { category: string; code: string }) {
  // Do not use the privileged production events table for an unauthenticated flow.
  console.info("HAQ signup", { requestId, stage, ...result });
}
