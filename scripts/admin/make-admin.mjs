// Promotes an EXISTING, already-registered account to admin.
//
// Admin is deliberately not something anyone can sign up as: the signup form
// only offers Citizen/Lawyer and the database ignores any role metadata other
// than "lawyer". The platform owner signs up normally first, then runs this
// script once from a trusted machine (it needs the service-role key from
// .env.local, which must never be shipped to the browser or committed).
//
// Usage:
//   node scripts/admin/make-admin.mjs owner@example.com
//   node scripts/admin/make-admin.mjs owner@example.com --revoke   # back to citizen
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = (process.argv[2] || "").trim().toLowerCase();
const revoke = process.argv.includes("--revoke");
if (!email.includes("@")) {
  console.error("Usage: node scripts/admin/make-admin.mjs <email> [--revoke]");
  process.exit(1);
}

const { data: profile, error } = await sb.from("profiles").select("id, email, role, full_name").eq("email", email).maybeSingle();
if (error) throw error;
if (!profile) {
  console.error(`No account with email ${email}. Sign up on the site first, then run this again.`);
  process.exit(1);
}

const role = revoke ? "citizen" : "admin";
const { error: updateError } = await sb.from("profiles").update({ role }).eq("id", profile.id);
if (updateError) throw updateError;
console.log(`${profile.full_name} <${profile.email}>: ${profile.role} -> ${role}`);
