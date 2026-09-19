import type { CaseStatus } from "@/types";

/**
 * UI mirror of the transition rules enforced in Postgres
 * (_allowed_transition() in supabase/migrations/004). The database is the
 * source of truth — this only decides which buttons to render.
 */
export type CaseActorRole = "lawyer" | "client";

const LAWYER_TRANSITIONS: Partial<Record<CaseStatus, CaseStatus[]>> = {
  accepted: ["active"],
  active: ["waiting_for_client", "resolved"],
  waiting_for_client: ["active", "resolved"],
  waiting_for_lawyer: ["active", "waiting_for_client", "resolved"],
  resolved: ["active", "closed"],
};

const CLIENT_TRANSITIONS: Partial<Record<CaseStatus, CaseStatus[]>> = {
  waiting_for_client: ["waiting_for_lawyer"],
  resolved: ["closed"],
};

export function allowedTransitions(role: CaseActorRole, from: CaseStatus): CaseStatus[] {
  return (role === "lawyer" ? LAWYER_TRANSITIONS : CLIENT_TRANSITIONS)[from] ?? [];
}

/** Statuses a case can be in while the two parties may exchange messages. */
export const MESSAGING_STATUSES: CaseStatus[] = ["accepted", "active", "waiting_for_client", "waiting_for_lawyer", "resolved"];
export const canMessage = (status: CaseStatus) => MESSAGING_STATUSES.includes(status);

export function canUploadDocuments(role: CaseActorRole, status: CaseStatus): boolean {
  if (role === "client") return ["requested", "accepted", "active", "waiting_for_client", "waiting_for_lawyer"].includes(status);
  return ["accepted", "active", "waiting_for_client", "waiting_for_lawyer"].includes(status);
}

export const LAWYER_BOARD_STATUSES: CaseStatus[] = [
  "accepted",
  "active",
  "waiting_for_client",
  "waiting_for_lawyer",
  "resolved",
  "closed",
];

/** Which party has to act next, for "next action" hints. */
export function nextActor(status: CaseStatus): "lawyer" | "client" | null {
  switch (status) {
    case "requested":
    case "accepted":
    case "waiting_for_lawyer":
      return "lawyer";
    case "waiting_for_client":
      return "client";
    default:
      return null;
  }
}

export const REJECTION_REASONS = ["out_of_scope", "no_capacity", "conflict_of_interest", "other"] as const;
