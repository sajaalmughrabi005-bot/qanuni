/**
 * Validates a post-login redirect target so it can never be used as an open
 * redirect: it must be a same-site path (single leading slash, no scheme, no
 * protocol-relative "//host").
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  if (/^\/[a-z]+:/i.test(value)) return null;
  return value;
}

/** Strips a leading locale segment ("/ar/citizen/x" -> "/citizen/x"). */
export function stripLocale(path: string): string {
  return path.replace(/^\/(ar|en)(?=\/|$)/, "") || "/";
}
