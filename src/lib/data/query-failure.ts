export const QUERY_FAILURE_CODES = ["query_failed", "not_configured", "network_error", "directory_schema", "directory_permission", "directory_unavailable", "directory_invalid_data"] as const;
export class QueryFailure extends Error {
  readonly code: typeof QUERY_FAILURE_CODES[number];
  constructor(code: typeof QUERY_FAILURE_CODES[number]) { super(code); this.code=code; }
}
