// Writes each QA fixture's Supabase session cookies (same format @supabase/ssr writes after a
// normal login) to public/__qa/<who>.json (git-ignored, removed by `qa-fixtures.mjs remove`),
// so the browser E2E run can act as that user without typing a password into the login form:
//
//   node scripts/dev/qa-session.mjs            # all fixtures
//   // in the browser (same origin):
//   const c = await (await fetch("/__qa/citizenA.json")).json(); c.forEach(([n, v]) => document.cookie = `${n}=${v}; path=/`);
import { createClient } from "@supabase/supabase-js";
import { readFileSync, mkdirSync, writeFileSync } from "fs";

for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const creds = JSON.parse(readFileSync(new URL("../../.qa-credentials.json", import.meta.url), "utf-8"));
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const name = `sb-${ref}-auth-token`;
const outDir = new URL("../../public/__qa/", import.meta.url);
mkdirSync(outDir, { recursive: true });

for (const who of Object.keys(creds)) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await sb.auth.signInWithPassword({ email: creds[who].email, password: creds[who].password });
  if (error) throw error;
  const value = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
  const CHUNK = 3180;
  const chunks = [];
  for (let i = 0; i < value.length; i += CHUNK) chunks.push(value.slice(i, i + CHUNK));
  const cookies = chunks.length === 1 ? [[name, chunks[0]]] : chunks.map((c, i) => [`${name}.${i}`, c]);
  writeFileSync(new URL(`${who}.json`, outDir), JSON.stringify(cookies));
  console.log("session ready:", who, `(${cookies.length} cookie chunk${cookies.length > 1 ? "s" : ""})`);
}
