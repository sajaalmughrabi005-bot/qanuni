import { createDb } from "./pg-harness.mjs";
try {
  const db = await createDb();
  const r = await db.query("select count(*)::int as n from pg_policies where schemaname='public'");
  console.log("migration applied OK; policies:", r.rows[0].n);
} catch (e) {
  console.error("FAILED:", e.message);
  if (e.position) console.error("position", e.position);
  process.exit(1);
}
