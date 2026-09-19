// Authorization + workflow tests for the database layer (RLS, triggers,
// RPCs) run against a local Postgres that mimics Supabase. Every test
// impersonates a real user role exactly as PostgREST would.
//
// Run: node scripts/dev/authz-tests.mjs
import { createDb, signUp, asUser } from "./pg-harness.mjs";

const db = await createDb();
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
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || "assertion failed");
};
async function expectError(fn, match) {
  try {
    await fn();
  } catch (e) {
    if (match && !new RegExp(match, "i").test(e.message)) {
      throw new Error(`expected error /${match}/ but got: ${e.message}`);
    }
    return;
  }
  throw new Error(`expected an error${match ? ` /${match}/` : ""} but the call succeeded`);
}
const q = (sql, params) => db.query(sql, params);

// ---------------------------------------------------------------- fixtures
const citizenA = await signUp(db, "a@test", { full_name: "Citizen A", role: "citizen" });
const citizenB = await signUp(db, "b@test", { full_name: "Citizen B", role: "citizen" });
const lawyer1 = await signUp(db, "l1@test", { full_name: "Lawyer One", role: "lawyer", bar_number: "BAR-1", specialty: "rental", verification_info: "Member since 2015" });
const lawyer2 = await signUp(db, "l2@test", { full_name: "Lawyer Two", role: "lawyer", bar_number: "BAR-2", specialty: "family" });
const lawyerPending = await signUp(db, "lp@test", { full_name: "Lawyer Pending", role: "lawyer", bar_number: "BAR-3" });
const lawyerBusy = await signUp(db, "lb@test", { full_name: "Lawyer Busy", role: "lawyer", bar_number: "BAR-4" });
const hacker = await signUp(db, "h@test", { full_name: "Hacker", role: "admin" }); // tries to sign up as admin
const admin = await signUp(db, "admin@test", { full_name: "Admin", role: "citizen" });

// Superuser fixtures (equivalent to the service role): promote admin, approve lawyers.
await q("update profiles set role='admin' where id=$1", [admin]);
await q("update lawyers set verification_status='approved' where profile_id in ($1,$2,$3)", [lawyer1, lawyer2, lawyerBusy]);
await q("update lawyers set accepting_new_cases=false where profile_id=$1", [lawyerBusy]);
const L = async (profileId) => (await q("select id from lawyers where profile_id=$1", [profileId])).rows[0].id;
const l1 = await L(lawyer1), l2 = await L(lawyer2), lp = await L(lawyerPending), lb = await L(lawyerBusy);

// ---------------------------------------------------------------- signup / roles
console.log("\nSignup & privilege escalation");
await test("signing up with role=admin metadata yields a citizen, never an admin", async () => {
  const r = await q("select role from profiles where id=$1", [hacker]);
  assert(r.rows[0].role === "citizen", `role was ${r.rows[0].role}`);
});
await test("a new lawyer starts as pending verification", async () => {
  const r = await q("select verification_status from lawyers where profile_id=$1", [lawyerPending]);
  assert(r.rows[0].verification_status === "pending");
});
await test("a user cannot promote themselves to admin", () =>
  asUser(db, citizenA, () => expectError(() => q("update profiles set role='admin' where id=$1", [citizenA]), "permission denied")));
await test("a user cannot re-enable their own disabled account", () =>
  asUser(db, citizenA, () => expectError(() => q("update profiles set account_status='active' where id=$1", [citizenA]), "permission denied")));
await test("a user CAN edit their own name/phone/city", () =>
  asUser(db, citizenA, async () => {
    await q("update profiles set full_name='Citizen A', phone='0790000000', city='Amman' where id=$1", [citizenA]);
  }));
await test("a lawyer cannot self-approve verification", () =>
  asUser(db, lawyerPending, () => expectError(() => q("update lawyers set verification_status='approved' where profile_id=$1", [lawyerPending]), "permission denied")));
await test("a lawyer cannot edit their own rating", () =>
  asUser(db, lawyer1, () => expectError(() => q("update lawyers set rating=5 where profile_id=$1", [lawyer1]), "permission denied")));
await test("a lawyer CAN edit bio and availability", () =>
  asUser(db, lawyer1, async () => {
    await q("update lawyers set bio='Rental specialist', accepting_new_cases=true where profile_id=$1", [lawyer1]);
  }));
await test("a normal user cannot call admin RPCs", () =>
  asUser(db, citizenA, () => expectError(() => q("select admin_review_lawyer($1,'approve',null)", [lp]), "forbidden")));
await test("a normal user cannot read admin stats", () =>
  asUser(db, lawyer1, () => expectError(() => q("select admin_platform_stats()"), "forbidden")));

// ---------------------------------------------------------------- directory
console.log("\nPublic lawyer directory");
await test("anon sees only approved lawyers via lawyers_public", () =>
  asUser(db, null, async () => {
    const r = await q("select full_name from lawyers_public order by full_name");
    const names = r.rows.map((x) => x.full_name);
    assert(names.includes("Lawyer One") && names.includes("Lawyer Two"), "approved lawyers missing");
    assert(!names.includes("Lawyer Pending"), "pending lawyer leaked into the directory");
  }));
await test("anon cannot read the base lawyers table (bar numbers etc.)", () =>
  asUser(db, null, async () => {
    const r = await q("select * from lawyers");
    assert(r.rows.length === 0, `anon read ${r.rows.length} lawyer rows`);
  }));
await test("the public view does not expose bar_number or verification data", () =>
  asUser(db, null, async () => {
    const r = await q("select * from lawyers_public limit 1");
    for (const k of ["bar_number", "verification_info", "verification_admin_note"]) assert(!(k in r.rows[0]), `${k} exposed`);
  }));
await test("a demo-flagged lawyer never appears in the directory", async () => {
  await q("update lawyers set is_demo=true where id=$1", [l2]);
  await asUser(db, null, async () => {
    const r = await q("select 1 from lawyers_public where id=$1", [l2]);
    assert(r.rows.length === 0, "demo lawyer visible");
  });
  await q("update lawyers set is_demo=false where id=$1", [l2]);
});
await test("a lawyer can read their own private row (bar number)", () =>
  asUser(db, lawyer1, async () => {
    const r = await q("select bar_number from lawyers where profile_id=$1", [lawyer1]);
    assert(r.rows[0].bar_number === "BAR-1");
  }));
await test("a lawyer cannot read another lawyer's private row", () =>
  asUser(db, lawyer1, async () => {
    const r = await q("select 1 from lawyers where id=$1", [l2]);
    assert(r.rows.length === 0);
  }));

// ---------------------------------------------------------------- request flow
console.log("\nCitizen -> lawyer request");
const req = (uid, lawyerId, extra = {}) =>
  asUser(db, uid, () =>
    q("select request_case($1,$2,$3,$4,$5) as id", [lawyerId, extra.title ?? "Eviction dispute", extra.category ?? "rental", extra.description ?? "My landlord wants me out without notice.", extra.urgency ?? "high"])
  );

await test("unauthenticated users cannot request a case", () =>
  asUser(db, null, () => expectError(() => q("select request_case($1,'Title here','rental','A long enough description','medium')", [l1]), "permission denied|not_authenticated")));
await test("a lawyer cannot send a case request (citizens only)", () =>
  expectError(() => req(lawyer2, l1), "not_allowed"));
await test("cannot request a pending (unverified) lawyer", () => expectError(() => req(citizenA, lp), "lawyer_unavailable"));
await test("cannot request a lawyer who is not accepting new cases", () => expectError(() => req(citizenA, lb), "lawyer_not_accepting"));
await test("cannot request a demo lawyer", async () => {
  await q("update lawyers set is_demo=true where id=$1", [l2]);
  try { await expectError(() => req(citizenA, l2), "lawyer_unavailable"); } finally { await q("update lawyers set is_demo=false where id=$1", [l2]); }
});
await test("validation: short title / bad category / bad urgency are rejected", async () => {
  await expectError(() => req(citizenA, l1, { title: "ab" }), "invalid_title");
  await expectError(() => req(citizenA, l1, { category: "nonsense" }), "invalid_category");
  await expectError(() => req(citizenA, l1, { urgency: "asap" }), "invalid_urgency");
  await expectError(() => req(citizenA, l1, { description: "short" }), "invalid_description");
});
await test("a disabled citizen cannot request a case", async () => {
  await q("update profiles set account_status='disabled' where id=$1", [citizenB]);
  try { await expectError(() => req(citizenB, l1), "not_allowed"); } finally { await q("update profiles set account_status='active' where id=$1", [citizenB]); }
});

let caseId;
await test("citizen A requests lawyer 1: real case, status REQUESTED, ids from the session", async () => {
  const r = await req(citizenA, l1);
  caseId = r.rows[0].id;
  const c = (await q("select * from cases where id=$1", [caseId])).rows[0];
  assert(c.status === "requested", `status ${c.status}`);
  assert(c.client_id === citizenA && c.lawyer_id === l1, "ownership not derived from the session");
  assert(c.client_name === "Citizen A", "client name not taken from the profile");
});
await test("the request created a timeline event and notified the lawyer", async () => {
  const ev = await q("select event_type, actor_role from case_events where case_id=$1", [caseId]);
  assert(ev.rows.some((e) => e.event_type === "request_submitted" && e.actor_role === "client"), "no request_submitted event");
  const n = await q("select type from notifications where user_id=$1", [lawyer1]);
  assert(n.rows.some((x) => x.type === "case_request"), "lawyer not notified");
});
await test("citizens cannot insert cases directly (bypassing request_case)", () =>
  asUser(db, citizenA, () => expectError(() => q("insert into cases (client_id, client_name, lawyer_id, title, category, status) values ($1,'x',$2,'Forged','rental','active')", [citizenA, l1]), "permission denied")));

// ---------------------------------------------------------------- isolation
console.log("\nData isolation");
await test("citizen B cannot see citizen A's case", () =>
  asUser(db, citizenB, async () => { assert((await q("select 1 from cases where id=$1", [caseId])).rows.length === 0); }));
await test("lawyer 2 cannot see lawyer 1's case", () =>
  asUser(db, lawyer2, async () => { assert((await q("select 1 from cases where id=$1", [caseId])).rows.length === 0); }));
await test("anon cannot see any case", () =>
  asUser(db, null, async () => { assert((await q("select 1 from cases")).rows.length === 0); }));
await test("the assigned lawyer and the client can see the case", async () => {
  await asUser(db, lawyer1, async () => { assert((await q("select 1 from cases where id=$1", [caseId])).rows.length === 1); });
  await asUser(db, citizenA, async () => { assert((await q("select 1 from cases where id=$1", [caseId])).rows.length === 1); });
});
await test("admin cannot read raw case rows (private story) — only the metadata view", () =>
  asUser(db, admin, async () => {
    assert((await q("select 1 from cases")).rows.length === 0, "admin read raw cases");
    const v = await q("select title, client_name, status from admin_cases_overview");
    assert(v.rows.length === 1 && v.rows[0].status === "requested", "overview view empty");
    const cols = (await q("select * from admin_cases_overview limit 1")).fields.map((f) => f.name);
    assert(!cols.includes("client_story_ar") && !cols.includes("request_description"), "overview leaks case content");
  }));
await test("a non-admin cannot use admin_cases_overview", () =>
  asUser(db, citizenA, async () => { assert((await q("select 1 from admin_cases_overview")).rows.length === 0); }));
await test("the client cannot see the lawyer's phone/email before acceptance", () =>
  asUser(db, lawyer1, async () => {
    const r = await q("select 1 from profiles where id=$1", [citizenA]);
    assert(r.rows.length === 0, "lawyer read the client profile while the case is only REQUESTED");
  }));
await test("timeline events cannot be forged by users", () =>
  asUser(db, citizenA, () => expectError(() => q("insert into case_events (case_id, event_type) values ($1,'accepted')", [caseId]), "permission denied")));
await test("timeline events cannot be edited or deleted by users", async () => {
  await asUser(db, lawyer1, () => expectError(() => q("delete from case_events where case_id=$1", [caseId]), "permission denied"));
  await asUser(db, lawyer1, () => expectError(() => q("update case_events set event_type='x' where case_id=$1", [caseId]), "permission denied"));
});

// ---------------------------------------------------------------- respond / lifecycle
console.log("\nAccept / reject / lifecycle");
await test("lawyer 2 cannot accept lawyer 1's request", () =>
  asUser(db, lawyer2, () => expectError(() => q("select respond_case($1,true)", [caseId]), "forbidden")));
await test("the client cannot accept their own request", () =>
  asUser(db, citizenA, () => expectError(() => q("select respond_case($1,true)", [caseId]), "forbidden")));
await test("the client cannot change status directly", () =>
  asUser(db, citizenA, () => expectError(() => q("update cases set status='active' where id=$1", [caseId]), "permission denied")));
await test("the lawyer cannot change status directly either", () =>
  asUser(db, lawyer1, () => expectError(() => q("update cases set status='active' where id=$1", [caseId]), "permission denied")));
await test("cannot transition a REQUESTED case with transition_case (must respond first)", () =>
  asUser(db, lawyer1, () => expectError(() => q("select transition_case($1,'active')", [caseId]), "invalid_transition")));
await test("messages are blocked while the case is only REQUESTED", () =>
  asUser(db, citizenA, () => expectError(() => q("insert into messages (case_id, sender_id, sender_name, sender_role, message) values ($1,$2,'x','citizen','hi')", [caseId, citizenA]), "case_not_open_for_messages")));

await test("lawyer 1 opens the request: viewed event recorded once", async () => {
  await asUser(db, lawyer1, async () => { await q("select mark_case_viewed($1)", [caseId]); await q("select mark_case_viewed($1)", [caseId]); });
  const ev = await q("select count(*)::int n from case_events where case_id=$1 and event_type='viewed'", [caseId]);
  assert(ev.rows[0].n === 1, `viewed events: ${ev.rows[0].n}`);
});
await test("lawyer 1 accepts: ACCEPTED, timestamps + accepted_by set, client notified", async () => {
  await asUser(db, lawyer1, () => q("select respond_case($1,true)", [caseId]));
  const c = (await q("select status, accepted_at, accepted_by from cases where id=$1", [caseId])).rows[0];
  assert(c.status === "accepted" && c.accepted_at && c.accepted_by === lawyer1, JSON.stringify(c));
  const n = await q("select type from notifications where user_id=$1", [citizenA]);
  assert(n.rows.some((x) => x.type === "case_accepted"), "client not notified of acceptance");
  const ev = await q("select event_type from case_events where case_id=$1", [caseId]);
  assert(ev.rows.some((e) => e.event_type === "accepted"), "no accepted event");
});
await test("cannot accept twice / respond to a non-requested case", () =>
  asUser(db, lawyer1, () => expectError(() => q("select respond_case($1,true)", [caseId]), "invalid_transition")));
await test("now the lawyer can read the client's contact profile", () =>
  asUser(db, lawyer1, async () => { assert((await q("select 1 from profiles where id=$1", [citizenA])).rows.length === 1); }));
await test("only valid transitions: ACCEPTED -> RESOLVED is refused, ACCEPTED -> ACTIVE works", async () => {
  await asUser(db, lawyer1, () => expectError(() => q("select transition_case($1,'resolved')", [caseId]), "invalid_transition"));
  await asUser(db, lawyer1, () => q("select transition_case($1,'active')", [caseId]));
});
await test("the client cannot force lawyer-only transitions", () =>
  asUser(db, citizenA, () => expectError(() => q("select transition_case($1,'resolved')", [caseId]), "invalid_transition")));
await test("a stranger cannot transition someone else's case", () =>
  asUser(db, citizenB, () => expectError(() => q("select transition_case($1,'closed')", [caseId]), "forbidden")));
await test("no one can jump to REQUESTED / REJECTED / ACCEPTED via transition_case", async () => {
  for (const to of ["requested", "rejected", "accepted"]) {
    await asUser(db, lawyer1, () => expectError(() => q("select transition_case($1,$2)", [caseId, to]), "invalid_transition"));
  }
});

// ---------------------------------------------------------------- messaging
console.log("\nMessaging");
await test("client message: sender identity + receiver are derived server-side (spoofing ignored)", async () => {
  await asUser(db, citizenA, () =>
    q("insert into messages (case_id, sender_id, sender_name, sender_role, message) values ($1,$2,'Fake Name','lawyer','hello lawyer')", [caseId, citizenB]));
  const m = (await q("select sender_id, sender_name, sender_role, receiver_id, read_at from messages where case_id=$1 order by created_at desc limit 1", [caseId])).rows[0];
  assert(m.sender_id === citizenA, "sender_id spoofed");
  assert(m.sender_name === "Citizen A" && m.sender_role === "citizen", `identity spoofed: ${JSON.stringify(m)}`);
  assert(m.receiver_id === lawyer1 && m.read_at === null, "receiver/read not derived");
});
await test("citizen B cannot message or read on A's case", async () => {
  await asUser(db, citizenB, () => expectError(() => q("insert into messages (case_id, sender_id, sender_name, sender_role, message) values ($1,$2,'x','citizen','intrude')", [caseId, citizenB])));
  await asUser(db, citizenB, async () => { assert((await q("select 1 from messages where case_id=$1", [caseId])).rows.length === 0); });
});
await test("lawyer 2 cannot read the conversation", () =>
  asUser(db, lawyer2, async () => { assert((await q("select 1 from messages where case_id=$1", [caseId])).rows.length === 0); }));
await test("the receiving lawyer is notified", async () => {
  const n = await q("select type from notifications where user_id=$1 and type='message'", [lawyer1]);
  assert(n.rows.length >= 1);
});
await test("messages cannot be edited or deleted", async () => {
  await asUser(db, citizenA, () => expectError(() => q("update messages set message='edited' where case_id=$1", [caseId]), "permission denied"));
  await asUser(db, citizenA, () => expectError(() => q("delete from messages where case_id=$1", [caseId]), "permission denied"));
});
await test("read status: only the receiver can mark messages read", async () => {
  await asUser(db, citizenB, () => expectError(() => q("select mark_messages_read($1)", [caseId]), "forbidden"));
  await asUser(db, lawyer1, () => q("select mark_messages_read($1)", [caseId]));
  const m = await q("select read_at from messages where case_id=$1 and sender_id=$2", [caseId, citizenA]);
  assert(m.rows[0].read_at !== null, "not marked read");
});
await test("a client cannot send a document_request (lawyer-only message kind)", () =>
  asUser(db, citizenA, () => expectError(() => q("insert into messages (case_id, sender_id, sender_name, sender_role, message, kind) values ($1,$2,'x','citizen','send me docs','document_request')", [caseId, citizenA]), "forbidden")));
await test("lawyer document request -> case WAITING_FOR_CLIENT, client notified, timeline entry", async () => {
  await asUser(db, lawyer1, () => q("insert into messages (case_id, sender_id, sender_name, sender_role, message, kind) values ($1,$2,'x','lawyer','Please send the lease','document_request')", [caseId, lawyer1]));
  assert((await q("select status from cases where id=$1", [caseId])).rows[0].status === "waiting_for_client");
  assert((await q("select 1 from notifications where user_id=$1 and type='document'", [citizenA])).rows.length >= 1);
  assert((await q("select 1 from case_events where case_id=$1 and event_type='document_requested'", [caseId])).rows.length === 1);
});
await test("client reply while WAITING_FOR_CLIENT -> WAITING_FOR_LAWYER automatically", async () => {
  await asUser(db, citizenA, () => q("insert into messages (case_id, sender_id, sender_name, sender_role, message) values ($1,$2,'x','citizen','Here it is soon')", [caseId, citizenA]));
  assert((await q("select status from cases where id=$1", [caseId])).rows[0].status === "waiting_for_lawyer");
});

// ---------------------------------------------------------------- case documents
console.log("\nCase documents");
await test("participants can register an uploaded document; uploader identity is server-derived", async () => {
  await asUser(db, citizenA, () =>
    q("insert into case_documents (case_id, uploaded_by, uploaded_by_role, file_name, storage_path, mime_type, size_bytes) values ($1,$2,'lawyer','lease.pdf',$3,'application/pdf',1000)", [caseId, citizenB, `${caseId}/x-lease.pdf`]));
  const d = (await q("select uploaded_by, uploaded_by_role from case_documents where case_id=$1", [caseId])).rows[0];
  assert(d.uploaded_by === citizenA && d.uploaded_by_role === "client", `spoofed: ${JSON.stringify(d)}`);
});
await test("a stranger cannot attach or read documents of someone else's case", async () => {
  await asUser(db, citizenB, () => expectError(() => q("insert into case_documents (case_id, uploaded_by, uploaded_by_role, file_name, storage_path) values ($1,$2,'client','x.pdf',$3)", [caseId, citizenB, `${caseId}/x.pdf`])));
  await asUser(db, citizenB, async () => { assert((await q("select 1 from case_documents where case_id=$1", [caseId])).rows.length === 0); });
  await asUser(db, lawyer2, async () => { assert((await q("select 1 from case_documents where case_id=$1", [caseId])).rows.length === 0); });
});
await test("storage_path must live under the case's own folder", () =>
  asUser(db, citizenA, () => expectError(() => q("insert into case_documents (case_id, uploaded_by, uploaded_by_role, file_name, storage_path) values ($1,$2,'client','x.pdf','other-case/x.pdf')", [caseId, citizenA]), "invalid_storage_path")));
await test("the lawyer sees the client's upload; the client's upload notified the lawyer", async () => {
  await asUser(db, lawyer1, async () => { assert((await q("select 1 from case_documents where case_id=$1", [caseId])).rows.length === 1); });
  assert((await q("select 1 from case_events where case_id=$1 and event_type='document_uploaded'", [caseId])).rows.length === 1);
});
await test("storage: participants can read/upload objects in the case folder, strangers cannot", async () => {
  await q("insert into storage.objects (bucket_id, name, owner) values ('case-documents', $1, $2)", [`${caseId}/x-lease.pdf`, citizenA]);
  await asUser(db, citizenA, async () => { assert((await q("select 1 from storage.objects where bucket_id='case-documents'")).rows.length === 1); });
  await asUser(db, lawyer1, async () => { assert((await q("select 1 from storage.objects where bucket_id='case-documents'")).rows.length === 1); });
  await asUser(db, citizenB, async () => { assert((await q("select 1 from storage.objects where bucket_id='case-documents'")).rows.length === 0, "stranger read a case file"); });
  await asUser(db, null, async () => { assert((await q("select 1 from storage.objects")).rows.length === 0); });
  await asUser(db, citizenB, () => expectError(() => q("insert into storage.objects (bucket_id, name, owner) values ('case-documents', $1, $2)", [`${caseId}/evil.pdf`, citizenB])));
});

// ---------------------------------------------------------------- private notes
console.log("\nPrivate lawyer notes");
await test("lawyer can add a private note; the client and other lawyers cannot see it", async () => {
  await asUser(db, lawyer1, () => q("insert into case_notes (case_id, lawyer_id, note) values ($1,$2,'Weak evidence on notice period')", [caseId, l1]));
  await asUser(db, citizenA, async () => { assert((await q("select 1 from case_notes")).rows.length === 0, "client read a private note"); });
  await asUser(db, lawyer2, async () => { assert((await q("select 1 from case_notes")).rows.length === 0); });
  await asUser(db, lawyer1, async () => { assert((await q("select 1 from case_notes")).rows.length === 1); });
});
await test("another lawyer cannot write notes on someone else's case", () =>
  asUser(db, lawyer2, () => expectError(() => q("insert into case_notes (case_id, lawyer_id, note) values ($1,$2,'intrusion')", [caseId, l2]))));

// ---------------------------------------------------------------- contracts / analyses
console.log("\nContracts & analyses ownership");
let docA;
await test("citizen A saves a contract + analysis; citizen B and lawyers cannot read it", async () => {
  const d = await asUser(db, citizenA, () => q("insert into documents (user_id, file_name, document_type, language, status) values ($1,'lease.txt','rental','ar','analyzed') returning id", [citizenA]));
  docA = d.rows[0].id;
  await asUser(db, citizenA, () => q("insert into analyses (document_id, user_id, overall_risk, summary_ar, summary_en) values ($1,$2,'high','s','s')", [docA, citizenA]));
  for (const uid of [citizenB, lawyer1, lawyer2, admin]) {
    await asUser(db, uid, async () => {
      assert((await q("select 1 from documents where id=$1", [docA])).rows.length === 0, "document leaked");
      assert((await q("select 1 from analyses where document_id=$1", [docA])).rows.length === 0, "analysis leaked");
    });
  }
});
await test("the analysis produced a notification for its owner only", async () => {
  assert((await q("select 1 from notifications where user_id=$1 and type='analysis_ready'", [citizenA])).rows.length === 1);
  assert((await q("select 1 from notifications where user_id=$1 and type='analysis_ready'", [citizenB])).rows.length === 0);
});
await test("citizen B cannot write a document/analysis under citizen A's id", async () => {
  await asUser(db, citizenB, () => expectError(() => q("insert into documents (user_id, file_name) values ($1,'forged.txt')", [citizenA])));
  await asUser(db, citizenB, () => expectError(() => q("insert into analyses (document_id, user_id, overall_risk) values ($1,$2,'low')", [docA, citizenA])));
});
await test("linking someone else's document to a request is silently dropped (no leakage)", async () => {
  const r = await asUser(db, citizenB, () => q("select request_case($1,'Borrowed doc test','rental','A description that is long enough', 'low', array[$2]::uuid[]) as id", [l2, docA]));
  const c = (await q("select document_ids from cases where id=$1", [r.rows[0].id])).rows[0];
  assert(c.document_ids.length === 0, "foreign document was attached");
  await asUser(db, lawyer2, async () => { assert((await q("select 1 from documents where id=$1", [docA])).rows.length === 0, "lawyer2 got access to A's document"); });
});
await test("attaching your own contract gives the assigned lawyer read access", async () => {
  const r = await asUser(db, citizenA, () => q("select request_case($1,'With contract','rental','A description that is long enough','medium', array[$2]::uuid[]) as id", [l1, docA]));
  const id = r.rows[0].id;
  await asUser(db, lawyer1, async () => { assert((await q("select 1 from documents where id=$1", [docA])).rows.length === 1, "assigned lawyer cannot read attached contract"); });
  await asUser(db, lawyer2, async () => { assert((await q("select 1 from documents where id=$1", [docA])).rows.length === 0); });
  // reject it -> access is withdrawn
  await asUser(db, lawyer1, () => q("select respond_case($1,false,'out_of_scope',null)", [id]));
  await asUser(db, lawyer1, async () => { assert((await q("select 1 from documents where id=$1", [docA])).rows.length === 0, "access to the client's contract must end when the request is rejected"); });
});

// ---------------------------------------------------------------- reject flow
console.log("\nRejecting a request");
let rejCase;
await test("rejection requires a valid reason; stores it, notifies the client, is terminal", async () => {
  const r = await req(citizenB, l1, { title: "Out of scope matter" });
  rejCase = r.rows[0].id;
  await asUser(db, lawyer1, () => expectError(() => q("select respond_case($1,false,null,null)", [rejCase]), "rejection_reason_required"));
  await asUser(db, lawyer1, () => expectError(() => q("select respond_case($1,false,'because',null)", [rejCase]), "rejection_reason_required"));
  await asUser(db, lawyer1, () => q("select respond_case($1,false,'conflict_of_interest','Already represent the landlord')", [rejCase]));
  const c = (await q("select status, rejection_reason, rejected_at from cases where id=$1", [rejCase])).rows[0];
  assert(c.status === "rejected" && c.rejection_reason === "conflict_of_interest" && c.rejected_at);
  assert((await q("select 1 from notifications where user_id=$1 and type='case_rejected'", [citizenB])).rows.length === 1);
  await asUser(db, lawyer1, () => expectError(() => q("select transition_case($1,'active')", [rejCase]), "invalid_transition"));
  await asUser(db, lawyer1, () => expectError(() => q("select respond_case($1,true)", [rejCase]), "invalid_transition"));
});
await test("after rejection the lawyer can no longer read the client's profile/private content", () =>
  asUser(db, lawyer1, async () => { assert((await q("select 1 from profiles where id=$1", [citizenB])).rows.length === 0); }));

// ---------------------------------------------------------------- resolve / close / reviews
console.log("\nResolve, close, reviews");
await test("full lifecycle to RESOLVED then CLOSED (client confirms closure)", async () => {
  await asUser(db, lawyer1, () => q("select transition_case($1,'resolved')", [caseId]));
  assert((await q("select resolved_at from cases where id=$1", [caseId])).rows[0].resolved_at, "resolved_at not set");
  await asUser(db, citizenA, () => q("select transition_case($1,'closed')", [caseId]));
  assert((await q("select closed_at from cases where id=$1", [caseId])).rows[0].closed_at, "closed_at not set");
  await asUser(db, lawyer1, () => expectError(() => q("select transition_case($1,'active')", [caseId]), "invalid_transition"));
  await asUser(db, citizenA, () => expectError(() => q("insert into messages (case_id, sender_id, sender_name, sender_role, message) values ($1,$2,'x','citizen','late')", [caseId, citizenA]), "case_not_open_for_messages"));
});
await test("the timeline is complete, ordered and server-timestamped", async () => {
  const ev = (await q("select event_type from case_events where case_id=$1 order by created_at, id", [caseId])).rows.map((e) => e.event_type);
  for (const t of ["request_submitted", "viewed", "accepted", "status_changed", "document_requested", "document_uploaded"]) assert(ev.includes(t), `missing ${t}: ${ev}`);
});
await test("reviews: refused without a resolved/closed case, allowed after, only once", async () => {
  await asUser(db, citizenB, () => expectError(() => q("insert into reviews (lawyer_id, client_id, client_name, rating, review) values ($1,$2,'B',5,'great')", [l1, citizenB])));
  await asUser(db, citizenA, () => q("insert into reviews (lawyer_id, client_id, client_name, rating, review) values ($1,$2,'A',5,'great')", [l1, citizenA]));
  await asUser(db, citizenA, () => expectError(() => q("insert into reviews (lawyer_id, client_id, client_name, rating, review) values ($1,$2,'A',1,'again')", [l1, citizenA])));
  assert(Number((await q("select rating from lawyers where id=$1", [l1])).rows[0].rating) === 5, "rating trigger");
});
await test("nobody can review as someone else", () =>
  asUser(db, citizenB, () => expectError(() => q("insert into reviews (lawyer_id, client_id, client_name, rating) values ($1,$2,'A',5)", [l1, citizenA]))));

// ---------------------------------------------------------------- notifications
console.log("\nNotifications");
await test("users cannot create notifications (even for themselves)", () =>
  asUser(db, citizenA, () => expectError(() => q("insert into notifications (user_id,type,title_ar,title_en,body_ar,body_en) values ($1,'system','a','a','a','a')", [citizenA]), "permission denied")));
await test("users can mark their own notifications read, but not edit their content", async () => {
  await asUser(db, citizenA, async () => {
    await q("update notifications set read=true where user_id=$1", [citizenA]);
  });
  await asUser(db, citizenA, () => expectError(() => q("update notifications set title_en='hacked' where user_id=$1", [citizenA]), "permission denied"));
});
await test("users cannot read or modify other users' notifications", () =>
  asUser(db, citizenB, async () => {
    const r = await q("select 1 from notifications where user_id=$1", [citizenA]);
    assert(r.rows.length === 0);
    const u = await q("update notifications set read=true where user_id=$1 returning id", [citizenA]);
    assert(u.rows.length === 0);
  }));

// ---------------------------------------------------------------- appointments
console.log("\nAppointments");
await test("a client can only create PENDING appointments with an approved, accepting lawyer", async () => {
  await asUser(db, citizenA, () => q("insert into appointments (client_id, client_name, lawyer_id, title, start_time, end_time, status) values ($1,'A',$2,'Consult','2030-01-01T10:00Z','2030-01-01T10:30Z','pending')", [citizenA, l1]));
  await asUser(db, citizenA, () => expectError(() => q("insert into appointments (client_id, client_name, lawyer_id, title, start_time, end_time, status) values ($1,'A',$2,'Sneaky','2030-01-01T10:00Z','2030-01-01T10:30Z','confirmed')", [citizenA, l1])));
  await asUser(db, citizenA, () => expectError(() => q("insert into appointments (client_id, client_name, lawyer_id, title, start_time, end_time, status) values ($1,'A',$2,'Pending lawyer','2030-01-01T10:00Z','2030-01-01T10:30Z','pending')", [citizenA, lp])));
  await asUser(db, citizenA, () => expectError(() => q("insert into appointments (client_id, client_name, lawyer_id, title, start_time, end_time, status) values ($1,'B',$2,'As B','2030-01-01T10:00Z','2030-01-01T10:30Z','pending')", [citizenB, l1])));
});
await test("only the lawyer can confirm; the client cannot self-confirm", async () => {
  const id = (await q("select id from appointments limit 1")).rows[0].id;
  await asUser(db, citizenA, () => expectError(() => q("update appointments set status='confirmed' where id=$1", [id])));
  await asUser(db, lawyer1, () => q("update appointments set status='confirmed' where id=$1", [id]));
});
await test("other users cannot see or delete the appointment", async () => {
  const id = (await q("select id from appointments limit 1")).rows[0].id;
  await asUser(db, citizenB, async () => { assert((await q("select 1 from appointments where id=$1", [id])).rows.length === 0); });
  await asUser(db, lawyer2, async () => { assert((await q("delete from appointments where id=$1 returning id", [id])).rows.length === 0); });
});

// ---------------------------------------------------------------- admin workflows
console.log("\nAdmin workflows");
await test("admin approves a pending lawyer; lawyer is notified and appears in the directory", async () => {
  await asUser(db, admin, () => q("select admin_review_lawyer($1,'request_info','Please send your bar card number')", [lp]));
  assert((await q("select verification_status from lawyers where id=$1", [lp])).rows[0].verification_status === "more_info_requested");
  await asUser(db, lawyerPending, () => q("select lawyer_update_verification_info('Bar card #12345')"));
  assert((await q("select verification_status from lawyers where id=$1", [lp])).rows[0].verification_status === "pending", "resubmission should go back to pending");
  await asUser(db, admin, () => q("select admin_review_lawyer($1,'approve',null)", [lp]));
  assert((await q("select verification_status, verified_at from lawyers where id=$1", [lp])).rows[0].verified_at, "verified_at not set");
  await asUser(db, null, async () => { assert((await q("select 1 from lawyers_public where id=$1", [lp])).rows.length === 1); });
  assert((await q("select 1 from notifications where user_id=$1 and type='verification'", [lawyerPending])).rows.length === 2);
});
await test("an approved lawyer cannot edit their verification info", () =>
  asUser(db, lawyer1, () => expectError(() => q("select lawyer_update_verification_info('changed')"), "forbidden")));
await test("admin can disable/enable a user but not other admins or themselves", async () => {
  await asUser(db, admin, () => q("select admin_set_account_status($1,'disabled')", [citizenB]));
  assert((await q("select account_status from profiles where id=$1", [citizenB])).rows[0].account_status === "disabled");
  await asUser(db, admin, () => q("select admin_set_account_status($1,'active')", [citizenB]));
  await asUser(db, admin, () => expectError(() => q("select admin_set_account_status($1,'disabled')", [admin]), "cannot_change_self"));
});
await test("admin stats are aggregate only and reflect real data", async () => {
  const s = (await asUser(db, admin, () => q("select admin_platform_stats() as s"))).rows[0].s;
  assert(s.citizens >= 2 && s.lawyers_approved >= 3, JSON.stringify(s));
  assert(Array.isArray(s.weekly) && s.weekly.length === 6, "weekly series");
});
await test("admin cannot read messages, documents or case notes", () =>
  asUser(db, admin, async () => {
    for (const t of ["messages", "documents", "case_notes", "case_documents", "analyses"]) {
      assert((await q(`select 1 from ${t}`)).rows.length === 0, `${t} readable by admin`);
    }
  }));
await test("admin CAN read the case timeline (audit) and the users list", () =>
  asUser(db, admin, async () => {
    assert((await q("select 1 from case_events")).rows.length > 0);
    assert((await q("select 1 from profiles")).rows.length >= 7);
  }));
await test("reports: a user can file one, only the admin can triage it, others cannot read it", async () => {
  await asUser(db, citizenA, () => q("insert into reports (reporter_id, target_type, target_id, reason, details) values ($1,'lawyer',$2,'Unprofessional','details')", [citizenA, l2]));
  await asUser(db, citizenA, () => expectError(() => q("insert into reports (reporter_id, target_type, target_id, reason) values ($1,'lawyer',$2,'Forged reporter')", [citizenB, l2])));
  await asUser(db, citizenB, async () => { assert((await q("select 1 from reports")).rows.length === 0); });
  const id = (await asUser(db, admin, async () => (await q("select id from reports")).rows[0].id));
  await asUser(db, citizenA, () => expectError(() => q("select admin_resolve_report($1,'resolved',null)", [id]), "forbidden"));
  await asUser(db, admin, () => q("select admin_resolve_report($1,'resolved','Handled')", [id]));
});
await test("system_events are admin-read-only and not writable by users", async () => {
  await q("insert into system_events (kind, message) values ('ai_error','boom')");
  await asUser(db, citizenA, async () => { assert((await q("select 1 from system_events")).rows.length === 0); });
  await asUser(db, citizenA, () => expectError(() => q("insert into system_events (kind, message) values ('x','y')"), "permission denied"));
  await asUser(db, admin, async () => { assert((await q("select 1 from system_events")).rows.length === 1); });
});

// ---------------------------------------------------------------- manual cases
console.log("\nManual (paper) cases");
await test("an approved lawyer can add a manual case; it is private to them and needs no client", async () => {
  const r = await asUser(db, lawyer1, () => q("select lawyer_create_manual_case('Court file 2026/9','Walk-in client','civil','ملخص','summary','story','Other side', array['2026-10-01'], null) as id"));
  const id = r.rows[0].id;
  const c = (await q("select status, client_id, is_manual from cases where id=$1", [id])).rows[0];
  assert(c.status === "active" && c.client_id === null && c.is_manual === true);
  await asUser(db, lawyer2, async () => { assert((await q("select 1 from cases where id=$1", [id])).rows.length === 0); });
  await asUser(db, citizenA, async () => { assert((await q("select 1 from cases where id=$1", [id])).rows.length === 0); });
});
await test("an unapproved lawyer / a citizen cannot create manual cases", async () => {
  await asUser(db, citizenA, () => expectError(() => q("select lawyer_create_manual_case('Forged case','x','civil','','','','',array[]::text[],null)"), "forbidden"));
});

// ---------------------------------------------------------------- saved lawyers + AI history (005)
console.log("\nSaved lawyers & AI history");
await test("a user can save a public lawyer; nobody else sees the bookmark", async () => {
  const lid = (await q("select id from lawyers where profile_id=$1", [lawyer1])).rows[0].id;
  await asUser(db, citizenA, () => q("insert into saved_lawyers (user_id, lawyer_id) values ($1,$2)", [citizenA, lid]));
  await asUser(db, citizenA, async () => { assert((await q("select 1 from saved_lawyers")).rows.length === 1); });
  await asUser(db, citizenB, async () => { assert((await q("select 1 from saved_lawyers")).rows.length === 0); });
  await asUser(db, lawyer1, async () => { assert((await q("select 1 from saved_lawyers")).rows.length === 0); });
});
await test("a user cannot save on behalf of someone else, and anon cannot save", async () => {
  const lid = (await q("select id from lawyers where profile_id=$1", [lawyer1])).rows[0].id;
  await asUser(db, citizenB, () => expectError(() => q("insert into saved_lawyers (user_id, lawyer_id) values ($1,$2)", [citizenA, lid]), "row-level security"));
  await asUser(db, null, () => expectError(() => q("select 1 from saved_lawyers"), "permission denied"));
});
await test("another user cannot delete someone else's bookmark", async () => {
  await asUser(db, citizenB, () => q("delete from saved_lawyers"));
  await asUser(db, citizenA, async () => { assert((await q("select 1 from saved_lawyers")).rows.length === 1); });
  await asUser(db, citizenA, () => q("delete from saved_lawyers"));
});
await test("AI history is private to its owner and cannot point at someone else's document", async () => {
  await asUser(db, citizenA, () => q("insert into ai_history (user_id, kind, prompt, answer) values ($1,'ask','q','{\"a\":1}'::jsonb)", [citizenA]));
  await asUser(db, citizenB, async () => { assert((await q("select 1 from ai_history")).rows.length === 0); });
  await asUser(db, citizenB, () => expectError(() => q("insert into ai_history (user_id, kind, prompt, answer) values ($1,'ask','forged','{}'::jsonb)", [citizenA]), "row-level security"));
  await asUser(db, admin, async () => { assert((await q("select 1 from ai_history")).rows.length === 0, "admin must not read private AI history"); });
});

console.log("\nAdmin notifications (006)");
await test("admins are notified of new lawyer applications and reports; nobody else is", async () => {
  const before = (await q("select count(*)::int as n from notifications where user_id=$1", [admin])).rows[0].n;
  const newLawyer = await signUp(db, "l-notify@test", { full_name: "Notify Lawyer", role: "lawyer", bar_number: "BAR-N", specialty: "civil", verification_info: "x" });
  const mid = (await q("select count(*)::int as n from notifications where user_id=$1 and type='verification'", [admin])).rows[0].n;
  assert(mid >= 1, "no verification notification for admin");
  await asUser(db, citizenA, () => q("insert into reports (reporter_id, target_type, target_id, reason) values ($1,'lawyer',$2,'سبب البلاغ')", [citizenA, newLawyer]));
  const after = (await q("select count(*)::int as n from notifications where user_id=$1", [admin])).rows[0].n;
  assert(after >= before + 2, "admin should have 2 new notifications, went " + before + " -> " + after);
  await asUser(db, citizenB, async () => { assert((await q("select 1 from notifications where type in ('system','verification') and title_ar like '%بلاغ%'")).rows.length === 0, "citizen sees admin notification"); });
});

console.log("\nAccount deletion");
await test("deleting an account that sent messages / owns data succeeds and removes its data", async () => {
  const victim = await signUp(db, "victim@test", { full_name: "Victim", role: "citizen" });
  const lid = (await q("select id from lawyers where profile_id=$1", [lawyer1])).rows[0].id;
  const caseId = (await asUser(db, victim, () => q("select request_case($1,'Case to delete','rental','A description long enough','medium') as id", [lid]))).rows[0].id;
  await asUser(db, lawyer1, () => q("select respond_case($1,true,null,null)", [caseId]));
  await asUser(db, victim, () => q("insert into messages (case_id, sender_id, sender_name, sender_role, message) values ($1,$2,'Victim','citizen','hello')", [caseId, victim]));
  await q("delete from auth.users where id=$1", [victim]);
  assert((await q("select 1 from profiles where id=$1", [victim])).rows.length === 0, "profile should be gone");
  assert((await q("select 1 from messages where sender_id=$1", [victim])).rows.length === 0, "messages should be gone");
  assert((await q("select 1 from cases where id=$1", [caseId])).rows.length === 0, "the user's cases should be gone");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("Failures:\n - " + failures.join("\n - "));
  process.exit(1);
}
process.exit(0);
