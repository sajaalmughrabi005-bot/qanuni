import type { UserRole } from "@/types";

// Fixed credentials for the 3 seeded "Try Demo" accounts (see
// scripts/seed-supabase.mjs). Not a secret — these are publicly known demo
// logins by design, matching the "Demo mode — no password needed" copy on
// the login page.
export const DEMO_PASSWORD = "Demo12345!";

export const DEMO_EMAILS: Record<UserRole, string> = {
  citizen: "citizen.demo@qanuni.jo",
  lawyer: "lawyer.demo@qanuni.jo",
  admin: "admin.demo@qanuni.jo",
};
