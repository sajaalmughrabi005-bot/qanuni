// Temporary QA accounts for end-to-end testing against the real Supabase project.
// They are created with the service-role key (never shipped to the browser), use
// example.com addresses (no email is ever sent) and are removed with `remove`.
//
//   node scripts/dev/qa-fixtures.mjs create   # prints the credentials it created
//   node scripts/dev/qa-fixtures.mjs remove   # deletes every qa-*@example.com account
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";

for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const cmd = process.argv[2];
const OUT = new URL("../../.qa-credentials.json", import.meta.url); // git-ignored, deleted on `remove`

const specs = [
  { key: "citizenA", email: "qa-citizen-a@example.com", name: "مواطن اختبار أ", role: "citizen" },
  { key: "citizenB", email: "qa-citizen-b@example.com", name: "مواطن اختبار ب", role: "citizen" },
  { key: "lawyerA", email: "qa-lawyer-a@example.com", name: "المحامي اختبار أ", role: "lawyer", bar: "QA-1001", specialty: "rental", info: "QA fixture: registered 2015, office in Amman" },
  { key: "lawyerB", email: "qa-lawyer-b@example.com", name: "المحامي اختبار ب", role: "lawyer", bar: "QA-1002", specialty: "employment", info: "QA fixture: registered 2018, office in Irbid" },
  { key: "admin", email: "qa-admin@example.com", name: "مدير اختبار", role: "citizen" },
];

if (cmd === "create") {
  const creds = {};
  for (const s of specs) {
    const password = randomBytes(12).toString("base64url") + "Aa1!";
    const { data, error } = await sb.auth.admin.createUser({
      email: s.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: s.name, role: s.role, bar_number: s.bar, specialty: s.specialty, verification_info: s.info },
    });
    if (error) {
      console.log("FAILED", s.email, error.message);
      continue;
    }
    creds[s.key] = { email: s.email, password, id: data.user.id };
    if (s.key === "admin") await sb.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
    console.log("created", s.email);
  }
  writeFileSync(OUT, JSON.stringify(creds, null, 2));
} else if (cmd === "remove") {
  const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data.users.filter((x) => /^qa-.*@example\.com$/.test(x.email || ""))) {
    // messages.sender_id only cascades once migration 005 is applied; clear them first so this works either way.
    await sb.from("messages").delete().eq("sender_id", u.id);
    const { error } = await sb.auth.admin.deleteUser(u.id);
    console.log(u.email, error ? "FAILED: " + error.message : "deleted");
  }
  const fsm = await import("fs");
  try {
    fsm.unlinkSync(OUT);
  } catch {}
  try {
    fsm.rmSync(new URL("../../public/__qa/", import.meta.url), { recursive: true, force: true });
  } catch {}
} else {
  console.log("usage: create | remove");
}
