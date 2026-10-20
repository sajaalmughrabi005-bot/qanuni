// Disposable embedded PostgreSQL ONLY. No env loading, HTTP, or remote clients.
// Apply schema.sql + EXACT 004; deliberately do not apply 005/006/007/008/009.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { createDb, signUp, asUser } from './pg-harness.mjs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const migration004 = read('supabase/migrations/004_case_lifecycle_and_security.sql');
const patch = read('supabase/patches/case_request_wrapper.sql');
const preflight = read('supabase/patches/case_request_wrapper_preflight.sql');
const postcheck = read('supabase/patches/case_request_wrapper_postcheck.sql');
const signature = 'public.request_case(uuid,text,text,text,text,uuid[],uuid[],text,text,text,text[],text[],text[],text[],integer)';
const db = await createDb({ withMigration004: false });
let passed = 0;
async function check(label, run) {
  await run();
  console.log(`PASS ${++passed}: ${label}`);
}
async function expectError(run, code, message) {
  await assert.rejects(run, (error) => error.code === code && (!message || error.message.includes(message)));
}
async function counts() {
  const { rows } = await db.query(`select
    (select count(*)::int from public.cases) as cases,
    (select count(*)::int from public.notifications where type='case_request') as notifications,
    (select count(*)::int from public.case_events where event_type='request_submitted') as events,
    (select count(*)::int from public.case_submission_keys) as keys`);
  return rows[0];
}
async function wrapperAbsent() {
  const { rows } = await db.query(`select to_regprocedure('public.account_is_active()') as helper,
    to_regprocedure('public.request_case_once(uuid,jsonb)') as wrapper,
    to_regclass('public.case_submission_keys') as ledger`);
  assert.deepEqual(rows[0], { helper: null, wrapper: null, ledger: null });
}
async function rejectPatch(message) {
  await expectError(() => db.exec(patch), 'P0001', message);
  await db.exec('rollback');
}
async function legacySnapshot() {
  return (await db.query(`select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition,
      p.proowner, case when p.proname='request_case' then null else p.proacl::text end as unrelated_acl
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname not in ('account_is_active','request_case_once')
      order by signature`)).rows;
}
async function legacyTableSnapshot() {
  return (await db.query(`select c.relname, c.relowner, c.relacl::text as acl, c.relrowsecurity, c.relforcerowsecurity,
    (select jsonb_agg(pg_get_constraintdef(oid) order by conname) from pg_constraint where conrelid=c.oid) as constraints,
    (select jsonb_agg(pg_get_triggerdef(oid) order by tgname) from pg_trigger where tgrelid=c.oid and not tgisinternal) as triggers,
    (select jsonb_agg(to_jsonb(p) order by polname) from pg_policy p where polrelid=c.oid) as policies,
    (select jsonb_agg(jsonb_build_array(attname,atttypid,attnotnull,pg_get_expr(d.adbin,d.adrelid)) order by attnum)
      from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
      where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) as columns
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','storage') and c.relkind='r' and c.relname<>'case_submission_keys'
    order by n.nspname,c.relname`)).rows;
}

try {
  await db.exec(migration004);
  await check('preflight runs read-only over schema + 004; repair objects absent', async () => {
    const output = await db.exec(preflight);
    const metadata = output.flatMap(result => result.rows).filter(row => row.function_name);
    assert.equal(metadata.length, 4);
    for (const row of metadata) {
      assert.equal(row.overload_count_must_be_one, 1);
      assert.equal(row.exact_argument_oids, true);
      assert.equal(row.lookup_matches_catalog, true);
      assert.equal(row.body_matches, true);
      assert.deepEqual(row.type_differences, []);
    }
    const request = metadata.find(row => row.function_name === 'request_case');
    assert.equal(request.argument_count, 15);
    assert.equal(request.default_count, 11);
    assert.equal(output.flatMap(result => result.rows).find(row => 'earlier_checked_in_lookup_oid' in row).earlier_checked_in_lookup_oid, request.catalog_oid);
    await wrapperAbsent();
  });
  await check('a wrong literal signature returns NULL despite a present compatible catalog function', async () => {
    const wrong = signature.replace('text[],text[],text[],text[],integer', 'text[],text[],text[],integer');
    const { rows } = await db.query(`select to_regprocedure($1)::oid as wrong_lookup,
      to_regprocedure($2)::oid as correct_lookup`, [wrong, signature]);
    assert.equal(rows[0].wrong_lookup, null);
    assert.ok(rows[0].correct_lookup);
  });
  await check('exact supplied literal can return NULL under type shadowing; qualified OID preflight remains correct', async () => {
    // Local demonstration of a possible SESSION cause, not a production finding.
    await db.exec('create domain public.uuid as pg_catalog.uuid; set search_path=public,pg_catalog');
    try {
      const qualified = signature.replaceAll('uuid', 'pg_catalog.uuid').replaceAll('text', 'pg_catalog.text').replace('integer', 'pg_catalog.int4');
      const { rows } = await db.query('select to_regprocedure($1)::oid as original, to_regprocedure($2)::oid as qualified', [signature, qualified]);
      assert.equal(rows[0].original, null);
      assert.ok(rows[0].qualified);
      const output = (await db.exec(preflight)).flatMap(result => result.rows);
      assert.equal(output.find(row => 'supplied_lookup_before_fixed_path' in row).supplied_lookup_before_fixed_path, null);
      const metadata = output.find(row => row.function_name === 'request_case');
      assert.equal(metadata.exact_argument_oids, true);
      assert.equal(metadata.lookup_matches_catalog, true);
      assert.equal(metadata.catalog_oid, rows[0].qualified);
      assert.deepEqual(metadata.type_differences, []);
    } finally {
      await db.exec('reset search_path; drop domain public.uuid');
    }
  });
  await check('fingerprints match the exact UTF-8 004 source', async () => {
    for (const name of ['request_case', 'cases_after_insert', '_case_event', '_notify']) {
      const source = migration004.replace(/\r\n/g, '\n').match(
        new RegExp(`create or replace function ${name}\\([\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$`, 'i'))[1];
      const digest = createHash('md5').update(source).digest('hex');
      assert.ok(patch.includes(digest));
      const { rows } = await db.query(`select md5(replace(prosrc,E'\r\n',E'\n')) as digest
        from pg_proc where proname=$1 and pronamespace='public'::regnamespace`, [name]);
      assert.equal(rows[0].digest, digest);
    }
  });
  const originalRequest = (await db.query('select pg_get_functiondef($1::regprocedure) as definition', [signature])).rows[0].definition;
  await check('incompatible request_case body rejected atomically', async () => {
    await db.exec(originalRequest.replace('return v_id;', 'return null;'));
    await rejectPatch('incompatible definition/owner');
    await wrapperAbsent();
    await db.exec(originalRequest);
  });
  await check('missing notification column rejected before installation', async () => {
    await db.exec('alter table public.notifications rename column href to qa_missing_href');
    await rejectPatch('incompatible column notifications.href');
    await wrapperAbsent();
    await db.exec('alter table public.notifications rename column qa_missing_href to href');
  });
  await check('disabled case-insert trigger rejected', async () => {
    await db.exec('alter table public.cases disable trigger cases_after_insert');
    await rejectPatch('incompatible insert trigger/rule chain');
    await wrapperAbsent();
    await db.exec('alter table public.cases enable trigger cases_after_insert');
  });
  await check('existing ledger is never adopted or overwritten', async () => {
    await db.exec('create table public.case_submission_keys (qa_sentinel text)');
    await rejectPatch('repair objects already exist');
    assert.equal((await db.query(`select count(*)::int as n from information_schema.columns
      where table_schema='public' and table_name='case_submission_keys' and column_name='qa_sentinel'`)).rows[0].n, 1);
    await db.exec('drop table public.case_submission_keys');
    await wrapperAbsent();
  });
  await check('unsafe API schema CREATE grant rejected without weakening it', async () => {
    await db.exec('grant create on schema public to authenticated');
    await rejectPatch('public schema must not be API-writable');
    await wrapperAbsent();
    await db.exec('revoke create on schema public from authenticated');
  });
  await check('missing prerequisite function rejected', async () => {
    await db.exec(`alter function ${signature} rename to qa_missing_request_case`);
    await rejectPatch('missing prerequisite public.request_case');
    await wrapperAbsent();
    await db.exec(`alter function ${signature.replace('public.request_case(', 'public.qa_missing_request_case(')} rename to request_case`);
  });
  await check('same argument count/body with different final TYPE OID rejected', async () => {
    await db.exec(`alter function ${signature} rename to qa_original_request_case`);
    await db.exec(originalRequest.replace('p_match_score integer', 'p_match_score bigint'));
    await rejectPatch('with exact argument OIDs');
    await wrapperAbsent();
    await db.exec(`drop function ${signature.replace('integer)', 'bigint)')}`);
    await db.exec(`alter function ${signature.replace('public.request_case(', 'public.qa_original_request_case(')} rename to request_case`);
  });
  await check('an extra legacy creator overload is rejected rather than left publicly callable', async () => {
    await db.exec('create function public.request_case(uuid) returns uuid language sql as $$ select null::uuid $$');
    await rejectPatch('unexpected overloads');
    await wrapperAbsent();
    await db.exec('drop function public.request_case(uuid)');
  });
  await check('direct case INSERT column privilege rejected as a wrapper bypass', async () => {
    await db.exec('grant insert(id) on public.cases to authenticated');
    await rejectPatch('direct API case insertion');
    await wrapperAbsent();
    await db.exec('revoke insert(id) on public.cases from authenticated');
  });
  await check('exposed internal writer rejected without changing its grants', async () => {
    await db.exec('grant execute on function public._case_event(uuid,uuid,text,text,jsonb) to authenticated');
    await rejectPatch('incompatible internal writer API grants');
    await wrapperAbsent();
    await db.exec('revoke execute on function public._case_event(uuid,uuid,text,text,jsonb) from authenticated');
  });
  await check('existing helper overload rejected without being overwritten', async () => {
    await db.exec('create function public.account_is_active(integer) returns boolean language sql as $$select true$$');
    await rejectPatch('repair objects already exist');
    await db.exec('drop function public.account_is_active(integer)');
    await wrapperAbsent();
  });
  await check('late transaction failure rolls back all three newly created objects', async () => {
    const originalAcl = (await db.query('select proacl::text as acl from pg_proc where oid=$1::regprocedure', [signature])).rows[0].acl;
    await expectError(() => db.exec(patch.replace("notify pgrst, 'reload schema';", "select 1 / 0;")), '22012');
    await db.exec('rollback');
    await wrapperAbsent();
    assert.equal((await db.query('select proacl::text as acl from pg_proc where oid=$1::regprocedure', [signature])).rows[0].acl, originalAcl);
  });
  // Simulate additional default ACLs as well as harness Supabase-style defaults.
  await db.exec(`create role qa_default_grantee nologin;
    alter default privileges in schema public grant all on tables to qa_default_grantee;
    alter default privileges in schema public grant execute on functions to qa_default_grantee;`);
  await db.exec(`grant execute on function ${signature} to qa_default_grantee`);
  const before = await legacySnapshot();
  const tablesBefore = await legacyTableSnapshot();
  const historicalProfile = await signUp(db, 'historical@wrapper-test.invalid', { full_name: 'Historical fixture' });
  const historicalDocument = (await db.query(`insert into public.documents(user_id,file_name,citizen_description)
    values ($1,'historical.txt','Fictional pre-patch fixture') returning *`, [historicalProfile])).rows[0];
  await check('patch installs; existing function bodies/owners and unrelated ACLs unchanged', async () => {
    await db.exec(patch);
    assert.deepEqual(await legacySnapshot(), before);
  });
  await check('existing table definitions, policies, triggers, Storage and fictional historical document preserved', async () => {
    assert.deepEqual(await legacyTableSnapshot(), tablesBefore);
    assert.deepEqual((await db.query('select * from public.documents where id=$1', [historicalDocument.id])).rows[0], historicalDocument);
  });
  await check('one-time rerun rejected; installed objects survive intact', async () => {
    await rejectPatch('repair objects already exist');
    assert.ok((await db.query(`select to_regprocedure('public.request_case_once(uuid,jsonb)') as f`)).rows[0].f);
  });
  await check('private helper/ledger ACLs and RLS; only authenticated wrapper EXECUTE', async () => {
    const metadata = (await db.exec(postcheck)).flatMap(result => result.rows).filter(row => row.proname);
    assert.equal(metadata.length, 3);
    for (const row of metadata) {
      assert.equal(row.authenticated_execute, row.proname === 'request_case_once');
      assert.equal(row.anon_execute, false);
      assert.equal(row.service_execute, false);
    }
    for (const role of ['anon', 'authenticated', 'service_role', 'qa_default_grantee']) {
      const { rows } = await db.query(`select
        has_function_privilege($1,'public.account_is_active()','EXECUTE') as helper,
        has_function_privilege($1,'public.request_case_once(uuid,jsonb)','EXECUTE') as wrapper,
        has_function_privilege($1,$2,'EXECUTE') as legacy,
        has_table_privilege($1,'public.case_submission_keys','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as ledger`, [role, signature]);
      assert.deepEqual(rows[0], { helper: false, wrapper: role === 'authenticated', legacy: false, ledger: false });
    }
    const { rows } = await db.query(`select relrowsecurity,
      (select count(*)::int from pg_policy where polrelid=c.oid) as policies
      from pg_class c where c.oid='public.case_submission_keys'::regclass`);
    assert.deepEqual(rows[0], { relrowsecurity: true, policies: 0 });
    const funcs = (await db.query(`select proconfig from pg_proc
      where oid in ('public.account_is_active()'::regprocedure,'public.request_case_once(uuid,jsonb)'::regprocedure)`)).rows;
    assert.equal(funcs.length, 2);
    for (const f of funcs) assert.deepEqual(f.proconfig, ['search_path=pg_catalog, public, pg_temp']);
  });
  const citizen = await signUp(db, 'citizen@wrapper-test.invalid', { role: 'citizen', full_name: 'Local citizen' });
  const otherCitizen = await signUp(db, 'other@wrapper-test.invalid', { role: 'citizen', full_name: 'Other local citizen' });
  const lawyerProfile = await signUp(db, 'lawyer@wrapper-test.invalid', { role: 'lawyer', full_name: 'Local lawyer' });
  await db.query(`update public.lawyers set verification_status='approved', accepting_new_cases=true where profile_id=$1`, [lawyerProfile]);
  const lawyer = (await db.query('select id from public.lawyers where profile_id=$1', [lawyerProfile])).rows[0].id;
  const request = { lawyerId: lawyer, title: 'Fictional local request', category: 'civil', description: 'Fictional description for a disposable test only.' };
  const key = randomUUID();
  const submit = (uid, submissionKey = key, payload = request) => asUser(db, uid, async () =>
    (await db.query('select public.request_case_once($1::uuid,$2::jsonb) as id', [submissionKey, JSON.stringify(payload)])).rows[0].id);
  const legacy = (uid) => asUser(db, uid, async () => db.query(
    "select public.request_case($1,'Fictional legacy request','civil','Fictional legacy description long enough')", [lawyer]));
  await check('legacy direct calls and direct INSERT rejected; neither can bypass wrapper authorization/idempotency', async () => {
    const initial = await counts();
    await expectError(() => legacy(citizen), '42501');
    await expectError(() => legacy(null), '42501');
    await asUser(db, citizen, async () => {
      await expectError(() => db.query(`insert into public.cases(client_id,client_name,lawyer_id,title,category,status)
        values ($1,'Fictional name',$2,'Fictional title','civil','requested')`, [citizen, lawyer]), '42501');
    });
    assert.deepEqual(await counts(), initial);
  });
  let caseId;
  await check('registered active citizen -> approved active lawyer, NO document', async () => {
    assert.deepEqual(await counts(), { cases: 0, notifications: 0, events: 0, keys: 0 });
    caseId = await submit(citizen);
    const c = (await db.query('select * from public.cases where id=$1', [caseId])).rows[0];
    assert.equal(c.client_id, citizen);
    assert.equal(c.lawyer_id, lawyer);
    assert.equal(c.status, 'requested');
    assert.equal(c.urgency, 'medium');
    assert.deepEqual(c.document_ids, []);
    assert.deepEqual(c.relevant_clause_ids, []);
    assert.deepEqual(await counts(), { cases: 1, notifications: 1, events: 1, keys: 1 });
    assert.equal((await db.query(`select user_id from public.notifications where type='case_request'`)).rows[0].user_id, lawyerProfile);
  });
  await check('same key/payload, including reordered JSON fields, returns same case with no duplicate notification', async () => {
    assert.equal(await submit(citizen), caseId);
    assert.equal(await submit(citizen, key, Object.fromEntries(Object.entries(request).reverse())), caseId);
    assert.deepEqual(await counts(), { cases: 1, notifications: 1, events: 1, keys: 1 });
  });
  await check('changed payload with same key rejected with NO side effects', async () => {
    await expectError(() => submit(citizen, key, { ...request, title: 'Changed fictional request' }), 'P0001', 'submission_changed');
    assert.deepEqual(await counts(), { cases: 1, notifications: 1, events: 1, keys: 1 });
  });
  await check('same key for another citizen is scoped to that citizen; browser identity field ignored', async () => {
    const id = await submit(otherCitizen, key, { ...request, userId: citizen });
    assert.notEqual(id, caseId);
    assert.equal((await db.query('select client_id from public.cases where id=$1', [id])).rows[0].client_id, otherCitizen);
    assert.deepEqual(await counts(), { cases: 2, notifications: 2, events: 2, keys: 2 });
  });
  await check('anonymous, missing session, nonexistent profile, lawyer and admin actors rejected', async () => {
    const initial = await counts();
    await expectError(() => submit(null), '42501');
    await asUser(db, null, async () => {
      await db.exec('set role authenticated');
      await expectError(() => db.query('select public.request_case_once($1,$2::jsonb)', [key, JSON.stringify(request)]), 'P0001', 'not_allowed');
    });
    await expectError(() => submit(randomUUID()), 'P0001', 'not_allowed');
    await expectError(() => submit(lawyerProfile), 'P0001', 'not_allowed');
    await db.query("update public.profiles set role='admin' where id=$1", [otherCitizen]);
    await expectError(() => submit(otherCitizen), 'P0001', 'not_allowed');
    await db.query("update public.profiles set role='citizen' where id=$1", [otherCitizen]);
    assert.deepEqual(await counts(), initial);
  });
  await check('disabled citizen blocked on fresh AND cached requests', async () => {
    const initial = await counts();
    await db.query("update public.profiles set account_status='disabled' where id=$1", [citizen]);
    await expectError(() => submit(citizen), 'P0001', 'not_allowed');
    await expectError(() => submit(citizen, randomUUID()), 'P0001', 'not_allowed');
    await db.query("update public.profiles set account_status='active' where id=$1", [citizen]);
    assert.deepEqual(await counts(), initial);
  });
  await check('role change blocks cached retry; no cached authorization bypass', async () => {
    const initial = await counts();
    await db.query("update public.profiles set role='lawyer' where id=$1", [citizen]);
    await expectError(() => submit(citizen), 'P0001', 'not_allowed');
    await db.query("update public.profiles set role='citizen' where id=$1", [citizen]);
    assert.deepEqual(await counts(), initial);
  });
  await check('pending/demo/nonaccepting/missing target rejected by unchanged request_case', async () => {
    const initial = await counts();
    await db.query("update public.lawyers set verification_status='pending' where id=$1", [lawyer]);
    await expectError(() => submit(citizen, randomUUID()), 'P0001', 'lawyer_unavailable');
    await db.query("update public.lawyers set verification_status='approved', is_demo=true where id=$1", [lawyer]);
    await expectError(() => submit(citizen, randomUUID()), 'P0001', 'lawyer_unavailable');
    await db.query('update public.lawyers set is_demo=false, accepting_new_cases=false where id=$1', [lawyer]);
    await expectError(() => submit(citizen, randomUUID()), 'P0001', 'lawyer_not_accepting');
    await db.query('update public.lawyers set accepting_new_cases=true where id=$1', [lawyer]);
    await expectError(() => submit(citizen, randomUUID(), { ...request, lawyerId: randomUUID() }), 'P0001', 'lawyer_unavailable');
    assert.deepEqual(await counts(), initial);
  });
  await check('invalid inputs and null key rejected with NO writes', async () => {
    const initial = await counts();
    await expectError(() => submit(citizen, null), 'P0001', 'not_allowed');
    for (const payload of [null, [], 'invalid']) await expectError(() => submit(citizen, randomUUID(), payload), 'P0001', 'invalid_request');
    for (const [field, value, message] of [['title','x','invalid_title'], ['description','short','invalid_description'], ['category','invalid','invalid_category'], ['urgency','invalid','invalid_urgency']]) {
      await expectError(() => submit(citizen, randomUUID(), { ...request, [field]: value }), 'P0001', message);
    }
    await expectError(() => submit(citizen, randomUUID(), { ...request, documentIds: ['not-a-uuid'] }), '22P02');
    assert.deepEqual(await counts(), initial);
  });
  await check('ledger-write failure rolls back case, notification AND event; retry then succeeds exactly once', async () => {
    const initial = await counts();
    // Local failure injection only; never part of the shipped patch.
    await db.exec(`alter table public.case_submission_keys add constraint qa_force_failure check (false) not valid`);
    const failedKey = randomUUID();
    await expectError(() => submit(citizen, failedKey), '23514');
    assert.deepEqual(await counts(), initial);
    await db.exec('alter table public.case_submission_keys drop constraint qa_force_failure');
    const id = await submit(citizen, failedKey);
    assert.equal(await submit(citizen, failedKey), id);
    assert.deepEqual(await counts(), Object.fromEntries(Object.entries(initial).map(([k,v]) => [k,v+1])));
  });
  await check('all fifteen request arguments preserve 004 field behavior and document ownership filtering', async () => {
    const ownDoc = (await db.query(`insert into public.documents(user_id,file_name) values ($1,'local.txt') returning id`, [citizen])).rows[0].id;
    const foreignDoc = (await db.query(`insert into public.documents(user_id,file_name) values ($1,'foreign.txt') returning id`, [otherCitizen])).rows[0].id;
    const ownClause = (await db.query(`insert into public.document_clauses(document_id,clause_number,risk_level,category) values ($1,'1','low','contractual') returning id`, [ownDoc])).rows[0].id;
    const foreignClause = (await db.query(`insert into public.document_clauses(document_id,clause_number,risk_level,category) values ($1,'1','low','contractual') returning id`, [foreignDoc])).rows[0].id;
    const payload = { ...request, title: '  Fictional full request  ', description: '  Fictional full description  ', urgency: 'high',
      documentIds: [ownDoc, foreignDoc], relevantClauseIds: [ownClause, foreignClause], message: '  Fictional message  ',
      summaryAr: 'Local Arabic summary', summaryEn: 'Local English summary', keyDatesAr: ['A'], keyDatesEn: ['B'],
      questionsAr: ['C'], questionsEn: ['D'], matchScore: 72 };
    const id = await submit(citizen, randomUUID(), payload);
    const c = (await db.query('select * from public.cases where id=$1', [id])).rows[0];
    for (const [field, expected] of Object.entries({ title: payload.title.trim(), request_description: payload.description.trim(),
      urgency: 'high', priority: 'high', document_ids: [ownDoc], relevant_clause_ids: [ownClause], request_message: 'Fictional message',
      summary_ar: payload.summaryAr, summary_en: payload.summaryEn, key_dates_ar: ['A'], key_dates_en: ['B'], questions_ar: ['C'], questions_en: ['D'], match_score: 72 })) {
      assert.deepEqual(c[field], expected);
    }
  });
  await check('disabled target rejected on fresh submission; completed retry returns existing case without new writes', async () => {
    await db.query("update public.profiles set account_status='disabled' where id=$1", [lawyerProfile]);
    const initial = await counts();
    await expectError(() => submit(citizen, randomUUID()), 'P0001', 'lawyer_unavailable');
    await expectError(() => legacy(citizen), '42501');
    assert.equal(await submit(citizen), caseId);
    assert.deepEqual(await counts(), initial);
    await db.query("update public.profiles set account_status='active' where id=$1", [lawyerProfile]);
  });
  await check('target profile no longer a lawyer is refused without case or notification', async () => {
    const initial = await counts();
    await db.query("update public.profiles set role='citizen' where id=$1", [lawyerProfile]);
    await expectError(() => submit(citizen, randomUUID()), 'P0001', 'lawyer_unavailable');
    await db.query("update public.profiles set role='lawyer' where id=$1", [lawyerProfile]);
    assert.deepEqual(await counts(), initial);
  });
  await check('failure at an inactive target does not consume key; reactivation allows exactly one retry', async () => {
    const initial = await counts();
    const retryKey = randomUUID();
    await db.query("update public.profiles set account_status='disabled' where id=$1", [lawyerProfile]);
    await expectError(() => submit(citizen, retryKey), 'P0001', 'lawyer_unavailable');
    assert.deepEqual(await counts(), initial);
    await db.query("update public.profiles set account_status='active' where id=$1", [lawyerProfile]);
    const id = await submit(citizen, retryKey);
    assert.equal(await submit(citizen, retryKey), id);
    assert.deepEqual(await counts(), Object.fromEntries(Object.entries(initial).map(([k,v]) => [k,v+1])));
  });
  await check('recovery freeze closes BOTH API paths and preserves keys/cases; resumption permits safe cached retry', async () => {
    const initial = await counts();
    await db.exec('revoke execute on function public.request_case_once(uuid,jsonb) from authenticated');
    await expectError(() => submit(citizen), '42501');
    await expectError(() => legacy(citizen), '42501');
    assert.deepEqual(await counts(), initial);
    await db.exec('grant execute on function public.request_case_once(uuid,jsonb) to authenticated');
    assert.equal(await submit(citizen), caseId);
    assert.deepEqual(await counts(), initial);
  });
  await check('pre-existing function bodies/owners and unrelated ACLs remain unchanged after behavioral tests', async () => {
    assert.deepEqual(await legacySnapshot(), before);
  });
  console.log(`LOCAL ONLY: ${passed} checks passed. Embedded PostgreSQL; no PostgREST or multi-session concurrency verification.`);
  console.log(`Engine: ${(await db.query("select current_setting('server_version') as version")).rows[0].version}`);
} finally {
  await db.close();
}
