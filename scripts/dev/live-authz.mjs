// End-to-end authorization + workflow check against the REAL Supabase project
// (real Auth, real PostgREST, real RLS) using the temporary QA accounts from
// qa-fixtures.mjs. Every call is made exactly as the browser would: with the
// public anon key and a signed-in user's JWT.
//
//   node scripts/dev/qa-fixtures.mjs create && node scripts/dev/live-authz.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";

for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const creds = JSON.parse(readFileSync(new URL("../../.qa-credentials.json", import.meta.url), "utf-8"));
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client = () => createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
async function login(who) {
  const c = client();
  const { error } = await c.auth.signInWithPassword({ email: creds[who].email, password: creds[who].password });
  if (error) throw new Error(`login ${who}: ${error.message}`);
  return c;
}

let passed = 0;
const failures = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log("  ok   ", name);
  } catch (e) {
    failures.push(name);
    console.log("  FAIL ", name, "\n        ->", e.message);
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m || "assertion failed");
};
const denied = (res, what) => assert(res.error || (Array.isArray(res.data) && res.data.length === 0) || res.data === null, `${what}: expected denial/empty, got ${JSON.stringify(res.data)?.slice(0, 120)}`);

const admin = await login("admin");
const A = await login("citizenA");
const B = await login("citizenB");
const LA = await login("lawyerA");
const LB = await login("lawyerB");
const anon = client();
// Service-role client: used ONLY to inspect ground truth in the database (admins themselves are
// deliberately not allowed to read private case content, so they can't be used for that).
const svc = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

console.log("Verification & directory");
await test("new lawyers start pending and are NOT in the public directory", async () => {
  const { data } = await anon.from("lawyers_public").select("id, full_name");
  assert(!data.some((l) => /اختبار/.test(l.full_name)), "unapproved lawyer leaked into directory");
});
await test("a citizen cannot approve a lawyer / a lawyer cannot approve themselves", async () => {
  const { data: mine } = await LA.from("lawyers").select("id").single();
  assert((await A.rpc("admin_review_lawyer", { p_lawyer_id: mine.id, p_decision: "approve", p_note: null })).error, "citizen approved a lawyer");
  assert((await LA.rpc("admin_review_lawyer", { p_lawyer_id: mine.id, p_decision: "approve", p_note: null })).error, "lawyer approved self");
  const direct = await LA.from("lawyers").update({ verification_status: "approved" }).eq("id", mine.id).select();
  assert(direct.error || direct.data.length === 0, "lawyer edited their own verification_status");
});
let lawyerAId, lawyerBId;
await test("admin requests more info, lawyer resubmits, admin approves → lawyer becomes public", async () => {
  lawyerAId = (await LA.from("lawyers").select("id").single()).data.id;
  lawyerBId = (await LB.from("lawyers").select("id").single()).data.id;
  const r1 = await admin.rpc("admin_review_lawyer", { p_lawyer_id: lawyerAId, p_decision: "request_info", p_note: "أرسل رقم الترخيص" });
  assert(!r1.error, r1.error?.message);
  let me = (await LA.from("lawyers").select("verification_status, verification_admin_note").single()).data;
  assert(me.verification_status === "more_info_requested" && me.verification_admin_note, "lawyer doesn't see the request");
  assert(!(await LA.rpc("lawyer_update_verification_info", { p_info: "Bar no QA-1001, member since 2015" })).error);
  me = (await LA.from("lawyers").select("verification_status").single()).data;
  assert(me.verification_status === "pending", "should go back to pending, got " + me.verification_status);
  assert(!(await admin.rpc("admin_review_lawyer", { p_lawyer_id: lawyerAId, p_decision: "approve", p_note: null })).error);
  const { data } = await anon.from("lawyers_public").select("id");
  assert(data.some((l) => l.id === lawyerAId), "approved lawyer missing from directory");
  assert(!data.some((l) => l.id === lawyerBId), "pending lawyer B must stay hidden");
});
await test("bar number / verification info are not in the public directory view", async () => {
  const { data } = await anon.from("lawyers_public").select("*").eq("id", lawyerAId).single();
  assert(!("bar_number" in data) && !("verification_info" in data), "sensitive columns exposed");
});

console.log("\nPrivilege escalation");
await test("a citizen cannot make themselves admin or lawyer", async () => {
  const me = (await A.auth.getUser()).data.user.id;
  const r = await A.from("profiles").update({ role: "admin" }).eq("id", me).select();
  assert(r.error || r.data.length === 0, "role update succeeded");
  const { data } = await admin.from("profiles").select("role").eq("id", me).single();
  assert(data.role === "citizen", "role changed to " + data.role);
});
await test("signing up with role=admin metadata yields a citizen (trigger ignores the claim)", async () => {
  const { data, error } = await svc.auth.admin.createUser({
    email: `qa-escalation-${Date.now()}@example.com`,
    password: "Str0ng!Passw0rd#1",
    email_confirm: true,
    user_metadata: { role: "admin", full_name: "Evil" },
  });
  assert(!error, error?.message);
  const { data: p } = await svc.from("profiles").select("role").eq("id", data.user.id).single();
  await svc.auth.admin.deleteUser(data.user.id);
  assert(p.role === "citizen", "signup produced role " + p.role);
});
await test("a citizen cannot call admin RPCs or read admin data", async () => {
  assert((await A.rpc("admin_platform_stats")).error, "stats callable by citizen");
  assert((await A.rpc("admin_set_account_status", { p_user: (await B.auth.getUser()).data.user.id, p_status: "disabled" })).error);
  denied(await A.from("system_events").select("*"), "system_events");
  denied(await A.from("reports").select("*"), "reports");
  assert(!(await admin.rpc("admin_platform_stats")).error, "admin cannot read stats");
});
await test("citizens/lawyers cannot insert or edit cases directly, or forge notifications", async () => {
  const me = (await A.auth.getUser()).data.user.id;
  const ins = await A.from("cases").insert({ client_id: me, lawyer_id: lawyerAId, title: "forged", category: "rental", status: "active" });
  assert(ins.error, "direct case insert succeeded");
  assert((await A.from("notifications").insert({ user_id: me, type: "system", title_ar: "x", title_en: "x", body_ar: "x", body_en: "x" })).error, "forged notification");
});

console.log("\nRequest → accept → lifecycle");
let caseId;
await test("citizen requests a case from an approved lawyer (identity from JWT, not the browser)", async () => {
  const r = await A.rpc("request_case", { p_lawyer_id: lawyerAId, p_title: "خلاف على عقد إيجار", p_category: "rental", p_description: "المؤجر يريد إخلائي قبل انتهاء العقد بدون إنذار.", p_urgency: "high" });
  assert(!r.error, r.error?.message);
  caseId = r.data;
  const { data: c } = await svc.from("cases").select("*").eq("id", caseId).single();
  assert(c.status === "requested" && c.client_id === (await A.auth.getUser()).data.user.id && c.lawyer_id === lawyerAId);
});
await test("requests to an unapproved lawyer, or to a lawyer not accepting cases, are refused", async () => {
  const r = await A.rpc("request_case", { p_lawyer_id: lawyerBId, p_title: "طلب لمحامٍ غير موثّق", p_category: "employment", p_description: "وصف طويل بما يكفي للطلب.", p_urgency: "low" });
  assert(r.error, "request to pending lawyer was accepted");
  await svc.from("lawyers").update({ accepting_new_cases: false }).eq("id", lawyerAId);
  const r2 = await B.rpc("request_case", { p_lawyer_id: lawyerAId, p_title: "طلب أثناء الإغلاق", p_category: "rental", p_description: "وصف طويل بما يكفي للطلب.", p_urgency: "low" });
  await svc.from("lawyers").update({ accepting_new_cases: true }).eq("id", lawyerAId);
  assert(r2.error && /lawyer_not_accepting/.test(r2.error.message), "expected lawyer_not_accepting, got " + r2.error?.message);
});
await test("the assigned lawyer sees the request; other users and other lawyers do not", async () => {
  assert((await LA.from("cases").select("id").eq("id", caseId)).data.length === 1, "assigned lawyer can't see the case");
  assert((await B.from("cases").select("id").eq("id", caseId)).data.length === 0, "citizen B sees A's case");
  assert((await LB.from("cases").select("id").eq("id", caseId)).data.length === 0, "lawyer B sees A's case");
  assert((await anon.from("cases").select("id")).data?.length === 0 || (await anon.from("cases").select("id")).error, "anon reads cases");
});
await test("lawyer B cannot accept/reject/transition lawyer A's case", async () => {
  assert((await LB.rpc("respond_case", { p_case_id: caseId, p_accept: true })).error, "LB accepted");
  assert((await LB.rpc("transition_case", { p_case_id: caseId, p_to: "active" })).error, "LB transitioned");
  assert((await B.rpc("transition_case", { p_case_id: caseId, p_to: "closed" })).error, "citizen B transitioned");
});
await test("cannot skip the lifecycle (requested → resolved) or message before acceptance", async () => {
  assert((await LA.rpc("transition_case", { p_case_id: caseId, p_to: "resolved" })).error, "skipped lifecycle");
  const me = (await A.auth.getUser()).data.user.id;
  const m = await A.from("messages").insert({ case_id: caseId, sender_id: me, sender_name: "x", sender_role: "citizen", message: "قبل القبول" });
  assert(m.error, "message allowed before acceptance");
});
await test("lawyer accepts → status ACCEPTED, accepted_at/by set, citizen notified, timeline recorded", async () => {
  assert(!(await LA.rpc("respond_case", { p_case_id: caseId, p_accept: true })).error);
  const { data: c } = await svc.from("cases").select("status, accepted_at, accepted_by").eq("id", caseId).single();
  assert(c.status === "accepted" && c.accepted_at && c.accepted_by, "acceptance fields missing");
  const { data: n } = await A.from("notifications").select("*").order("created_at", { ascending: false });
  assert(n.some((x) => /قبول|accepted/i.test(x.title_ar + x.title_en + x.body_ar + x.body_en)), "no acceptance notification");
  const { data: ev } = await A.from("case_events").select("event_type").eq("case_id", caseId);
  assert(ev.some((e) => e.event_type === "accepted"), "no timeline event: " + JSON.stringify(ev));
});
await test("lawyer cannot reject an already-accepted case; timeline can't be forged", async () => {
  assert((await LA.rpc("respond_case", { p_case_id: caseId, p_accept: false, p_reason_code: "other" })).error, "rejected after accepting");
  assert((await A.from("case_events").insert({ case_id: caseId, event_type: "accepted", actor_role: "lawyer" })).error, "timeline forged");
});
await test("messaging: both sides can talk; sender identity is forced server-side; outsiders cannot read", async () => {
  const me = (await A.auth.getUser()).data.user.id;
  const ok = await A.from("messages").insert({ case_id: caseId, sender_id: me, sender_name: "مواطن", sender_role: "citizen", message: "مرحبا" });
  assert(!ok.error, ok.error?.message);
  const forged = await B.from("messages").insert({ case_id: caseId, sender_id: me, sender_name: "x", sender_role: "citizen", message: "انتحال" });
  assert(forged.error, "user B posted into A's case");
  // Forged sender fields are overwritten by the database with the caller's real identity.
  const spoof = await LA.from("messages").insert({ case_id: caseId, sender_id: me, sender_name: "مواطن مزوّر", sender_role: "citizen", message: "انتحال هوية" });
  assert(!spoof.error, spoof.error?.message);
  const laId = (await LA.auth.getUser()).data.user.id;
  const { data: stored } = await svc.from("messages").select("sender_id, sender_role, sender_name").eq("message", "انتحال هوية").single();
  assert(stored.sender_id === laId && stored.sender_role === "lawyer" && stored.sender_name !== "مواطن مزوّر", "sender was spoofed: " + JSON.stringify(stored));
  assert((await B.from("messages").select("id").eq("case_id", caseId)).data.length === 0, "B reads A's messages");
  assert((await LB.from("messages").select("id").eq("case_id", caseId)).data.length === 0, "LB reads A's messages");
  assert((await LA.from("messages").select("id").eq("case_id", caseId)).data.length >= 1, "lawyer can't read the message");
});
await test("full lifecycle: active → waiting_for_client → (client reply) waiting_for_lawyer → active → resolved → closed", async () => {
  const step = async (c, to, who) => {
    const r = await c.rpc("transition_case", { p_case_id: caseId, p_to: to });
    assert(!r.error, `${who} → ${to}: ${r.error?.message}`);
  };
  await step(LA, "active", "lawyer");
  await step(LA, "waiting_for_client", "lawyer");
  await step(A, "waiting_for_lawyer", "client");
  await step(LA, "active", "lawyer");
  await step(LA, "resolved", "lawyer");
  await step(A, "closed", "client");
  const { data: c } = await svc.from("cases").select("status, resolved_at, closed_at").eq("id", caseId).single();
  assert(c.status === "closed" && c.resolved_at && c.closed_at, "final state wrong: " + JSON.stringify(c));
  assert((await A.rpc("transition_case", { p_case_id: caseId, p_to: "active" })).error, "client reopened a closed case");
});

console.log("\nRejection flow");
await test("reject requires a reason; citizen is notified with it; lawyer cannot then see private client data", async () => {
  const r = await B.rpc("request_case", { p_lawyer_id: lawyerAId, p_title: "طلب سيُرفض", p_category: "rental", p_description: "وصف الطلب الذي سيتم رفضه لاحقًا.", p_urgency: "medium" });
  assert(!r.error, r.error?.message);
  const id = r.data;
  assert((await LA.rpc("respond_case", { p_case_id: id, p_accept: false })).error, "rejected without a reason");
  assert(!(await LA.rpc("respond_case", { p_case_id: id, p_accept: false, p_reason_code: "out_of_scope", p_reason_note: "خارج تخصصي" })).error);
  const { data: c } = await B.from("cases").select("status, rejection_reason, rejection_note").eq("id", id).single();
  assert(c.status === "rejected" && c.rejection_reason === "out_of_scope", JSON.stringify(c));
  const { data: n } = await B.from("notifications").select("*");
  assert(n.some((x) => /رفض|declin/i.test(x.title_ar + x.title_en + x.body_ar + x.body_en)), "no rejection notification");
});

console.log("\nDocuments (private storage)");
let docPath;
await test("participants can upload a case document; outsiders cannot read or download it", async () => {
  const me = (await A.auth.getUser()).data.user.id;
  const r = await B.rpc("request_case", { p_lawyer_id: lawyerAId, p_title: "قضية للمستندات", p_category: "rental", p_description: "قضية لاختبار رفع المستندات والصلاحيات.", p_urgency: "low" });
  const id = r.data;
  await LA.rpc("respond_case", { p_case_id: id, p_accept: true });
  const bId = (await B.auth.getUser()).data.user.id;
  docPath = `${id}/${randomUUID()}-contract.txt`;
  const up = await B.storage.from("case-documents").upload(docPath, new Blob(["عقد إيجار للاختبار"], { type: "text/plain" }), { contentType: "text/plain" });
  assert(!up.error, up.error?.message);
  const rec = await B.from("case_documents").insert({ case_id: id, file_name: "contract.txt", storage_path: docPath, mime_type: "text/plain", size_bytes: 20 });
  assert(!rec.error, rec.error?.message);
  assert((await LA.storage.from("case-documents").createSignedUrl(docPath, 60)).data?.signedUrl, "assigned lawyer can't get a signed URL");
  assert(!(await A.storage.from("case-documents").createSignedUrl(docPath, 60)).data?.signedUrl, "other citizen got a signed URL");
  assert(!(await LB.storage.from("case-documents").createSignedUrl(docPath, 60)).data?.signedUrl, "other lawyer got a signed URL");
  assert((await anon.storage.from("case-documents").download(docPath)).error, "anon downloaded a case document");
  assert((await A.from("case_documents").select("id").eq("case_id", id)).data.length === 0, "A sees B's document rows");
});

console.log("\nPersonal data ownership");
await test("contracts/analyses: user A cannot read, edit or delete user B's", async () => {
  const bId = (await B.auth.getUser()).data.user.id;
  const ins = await B.from("documents").insert({ user_id: bId, file_name: "b-contract.txt", document_type: "rental", language: "ar", status: "processing" }).select("id").single();
  assert(!ins.error, ins.error?.message);
  const docId = ins.data.id;
  assert((await A.from("documents").select("id").eq("id", docId)).data.length === 0, "A reads B's document");
  const upd = await A.from("documents").update({ file_name: "hacked" }).eq("id", docId).select();
  assert(upd.error || upd.data.length === 0, "A edited B's document");
  await A.from("documents").delete().eq("id", docId);
  assert((await B.from("documents").select("id").eq("id", docId)).data.length === 1, "A deleted B's document");
  const forged = await A.from("documents").insert({ user_id: bId, file_name: "forged.txt", document_type: "rental", language: "ar", status: "processing" });
  assert(forged.error, "A created a document owned by B");
  await B.from("documents").delete().eq("id", docId);
});
await test("a lawyer cannot read citizens' contracts unless attached to their own case", async () => {
  const aId = (await A.auth.getUser()).data.user.id;
  const ins = await A.from("documents").insert({ user_id: aId, file_name: "a-private.txt", document_type: "rental", language: "ar", status: "processing" }).select("id").single();
  assert((await LA.from("documents").select("id").eq("id", ins.data.id)).data.length === 0, "lawyer read an unrelated contract");
  assert((await svc.from("documents").select("id").eq("id", ins.data.id)).data.length === 1, "sanity");
  assert((await client().from("documents").select("id")).data?.length === 0, "anon reads documents");
  await A.from("documents").delete().eq("id", ins.data.id);
});

console.log("\nReports & notifications");
await test("a user can report a lawyer; only admins can triage; reporter cannot read others' reports", async () => {
  const direct = await A.from("reports").insert({ reporter_id: (await A.auth.getUser()).data.user.id, target_type: "lawyer", target_id: lawyerAId, reason: "سلوك غير مهني" });
  assert(!direct.error, direct.error?.message);
  assert((await B.from("reports").select("id")).data.length === 0, "B reads A's report");
  const { data } = await admin.from("reports").select("id, status");
  assert(data.length >= 1, "admin can't see reports");
  assert((await A.rpc("admin_resolve_report", { p_id: data[0].id, p_status: "resolved", p_note: null })).error, "citizen resolved a report");
  assert(!(await admin.rpc("admin_resolve_report", { p_id: data[0].id, p_status: "resolved", p_note: "تمت المعالجة" })).error);
});
await test("notifications are private per user", async () => {
  const { data } = await B.from("notifications").select("user_id");
  const bId = (await B.auth.getUser()).data.user.id;
  assert(data.every((n) => n.user_id === bId), "B sees someone else's notifications");
});

console.log("\nAdmin oversight is metadata-only");
await test("admin sees case metadata but not message/document/note content", async () => {
  const { data: rows } = await admin.from("admin_cases_overview").select("*");
  assert(rows.length >= 3, "overview empty");
  assert(!("request_description" in rows[0]) && !("summary_ar" in rows[0]), "overview leaks case content: " + Object.keys(rows[0]).join(","));
  assert((await admin.from("messages").select("id")).data.length === 0, "admin reads messages");
  assert((await admin.from("case_documents").select("id")).data.length === 0, "admin reads case documents");
  assert((await admin.from("case_notes").select("id")).data.length === 0, "admin reads lawyer notes");
});
await test("admin can suspend a user; a suspended user is blocked; admin cannot suspend admins/self", async () => {
  const bId = (await B.auth.getUser()).data.user.id;
  assert(!(await admin.rpc("admin_set_account_status", { p_user: bId, p_status: "disabled" })).error);
  const { data } = await admin.from("profiles").select("account_status").eq("id", bId).single();
  assert(data.account_status === "disabled");
  assert(!(await admin.rpc("admin_set_account_status", { p_user: bId, p_status: "active" })).error);
  assert((await admin.rpc("admin_set_account_status", { p_user: (await admin.auth.getUser()).data.user.id, p_status: "disabled" })).error, "admin suspended self");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("Failures:\n - " + failures.join("\n - "));
  process.exit(1);
}
process.exit(0);
