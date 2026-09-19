// One-off cleanup: removes the old seeded demo accounts (*.demo@qanuni.jo) and any
// explicitly named test accounts from the LIVE Supabase project, plus everything
// that hangs off them (profiles, lawyers, cases, ... via ON DELETE CASCADE).
//
// Why: those accounts were created by the old seed script with a password that
// was published in the repository, including a real "admin" profile. The demo
// experience no longer uses real accounts at all (it is an isolated in-memory
// sample), so these must not exist in the real database.
//
// Usage (reads .env.local, needs SUPABASE_SERVICE_ROLE_KEY):
//   node scripts/admin/cleanup-demo-data.mjs              # dry run: lists what would be deleted
//   node scripts/admin/cleanup-demo-data.mjs --apply      # actually deletes
//   node scripts/admin/cleanup-demo-data.mjs --apply extra@example.com other@example.com
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const extra = args.filter((a) => a.includes("@")).map((a) => a.toLowerCase());

const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
const targets = data.users.filter((u) => {
  const email = (u.email || "").toLowerCase();
  return email.endsWith(".demo@qanuni.jo") || extra.includes(email);
});

console.log(apply ? "Deleting:" : "Dry run — would delete:");
for (const u of targets) console.log(" -", u.email, u.id);
if (!targets.length) console.log(" (nothing matched)");

if (apply) {
  for (const u of targets) {
    const { error: delError } = await sb.auth.admin.deleteUser(u.id);
    console.log(delError ? `   FAILED ${u.email}: ${delError.message}` : `   deleted ${u.email}`);
  }
} else if (targets.length) {
  console.log("\nRe-run with --apply to delete.");
}
