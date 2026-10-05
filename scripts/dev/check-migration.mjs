// Is migration 004 applied on the live project? (service role, read-only)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const checks = [
  ["lawyers.accepting_new_cases", () => sb.from("lawyers").select("accepting_new_cases").limit(1)],
  ["cases.urgency", () => sb.from("cases").select("urgency").limit(1)],
  ["table case_events", () => sb.from("case_events").select("id").limit(1)],
  ["table case_documents", () => sb.from("case_documents").select("id").limit(1)],
  ["table reports", () => sb.from("reports").select("id").limit(1)],
  ["view lawyers_public", () => sb.from("lawyers_public").select("id").limit(1)],
];
let all = true;
for (const [name, fn] of checks) {
  const { error } = await fn();
  console.log(error ? "MISSING" : "ok     ", name, error ? "-> " + error.message : "");
  if (error) all = false;
}
console.log(all ? "\nMigration 004 is APPLIED" : "\nMigration 004 is NOT applied yet");
