// Read-only inspection of the live Supabase project (service role).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: users } = await sb.auth.admin.listUsers({ perPage: 200 });
console.log("auth users:", users.users.length);
for (const u of users.users) {
  console.log(" -", u.email, "| confirmed:", !!u.email_confirmed_at, "| role meta:", u.user_metadata?.role, "| created:", u.created_at?.slice(0, 10));
}
for (const t of ["profiles", "lawyers", "documents", "document_clauses", "analyses", "cases", "appointments", "messages", "drafts", "notifications", "reviews", "legal_sources"]) {
  const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
  console.log(t.padEnd(18), error ? "ERR " + error.message : count);
}
