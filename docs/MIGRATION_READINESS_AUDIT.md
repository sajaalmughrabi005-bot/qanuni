# Database migration readiness audit — 2026-10-10

Audit baseline: clean `staging-prep`, commit `58399533d6dac6ac81fe42117884619613da90d0`. This is a read-only database audit and a proposed execution plan, **not authorization to execute it**. No SQL, including local PGlite migration tests, was executed. No remote connection, account creation, deployment, application-code change, environment-file change, commit, or push was performed for this audit. Only this report and the implementation ledger were updated.

## Conclusion and evidence boundary

The owner reports that a read-only database query found **zero rows for `public.request_case_once`** in the affected project. Together with the previously captured authenticated browser `POST /rest/v1/rpc/request_case_once` returning **404 / PGRST202**, this confirms the requested remote function is absent. A schema-cache reload alone cannot create an absent function. The query output was supplied by the owner; this audit did not independently query the remote database.

Migration **007 should restore the no-linked-document case-request path if its prerequisites are present and compatible**, its transaction commits, and PostgREST exposes the new signature with the intended permissions. It creates `request_case_once(uuid,jsonb)`, its idempotency table, and the active-account helper; the wrapper calls migration 004's `request_case(...)`. A no-document request needs neither migration 008's original-file columns/bucket nor migration 009's citation allowlist. This is a source-based readiness conclusion, not a verified successful remote submission.

The missing wrapper does **not** prove all of 007, 008, or 009 is unapplied: a project may have partial/manual schema changes. The exact deployed definitions, RLS, grants, table contents, bucket configuration, function owners, and migration history remain unknown. Whole-file production execution is not ready until those are compared and the staging rehearsal passes.

Inspected: all of 007–009; relevant base schema and 004–006 definitions; application request/analysis/file actions and query hooks; local migration/security/storage/reference tests and their harness; credentialed QA target/fixture helpers; README and staging runbook. The local harness models Auth/Storage and substitutes pgvector types; its historical results do not establish real Supabase compatibility.

## Exact change inventory

### 007_security_and_atomic_analysis.sql

The file has its own `BEGIN` / `COMMIT`. It contains **11 function definitions**, all `SECURITY DEFINER` with `search_path=public`:

| Function/signature | Introduced or replaced behavior |
|---|---|
| `account_is_active()` → boolean | Active profile for `auth.uid()`; new dependency for policies/RPCs. |
| `is_admin()` → boolean | Admin must now also have an active profile. |
| `current_lawyer_id()` → uuid | Active lawyer-role profile, approved verification, non-demo row. |
| `current_approved_lawyer_id()` → uuid | Same stricter lawyer identity gate. |
| `is_case_participant(uuid)` → boolean | Active citizen owner, or approved assigned lawyer on a non-rejected case. |
| `reject_inactive_actor()` → trigger | Rejects writes when a non-null authenticated actor is inactive; no-UID system context bypasses this guard. |
| `guard_requested_lawyer()` → trigger | Case inserts require an active, approved, non-demo target when `lawyer_id` is set. |
| `guard_analysis_document_owner()` → trigger | Analysis parent document must belong to the analysis user. |
| `finalize_document_analysis(uuid,jsonb,jsonb)` → uuid | Owned row lock; atomic clauses/analysis/status; retry result; exact source-quote check; unknown risk and null confidence; two allowed reference IDs. |
| `request_case_once(uuid,jsonb)` → uuid | Active actor; per-user/key transaction advisory lock; payload hash; same-key retry returns the existing case; changed payload raises `submission_changed`; delegates citizen/target/input checks and case creation to 004. |
| `lawyer_create_manual_case(text,text,text,text,text,text,text,text[],date)` → uuid | Preserves story text instead of 004's 5,000-character truncation; rejects stories over 240,000 characters. Uses the stricter approved-lawyer helper. |

Tables, columns, constraints, and view:

- New `case_submission_keys`: `user_id uuid`, `key uuid`, `request_hash text`, `case_id uuid`, all NOT NULL; primary key `(user_id,key)`; cascading FKs to `profiles(id)` and `cases(id)`. RLS enabled, no direct-access policies. No separate extra index beyond the primary key.
- `document_clauses`: replaces the named risk check with `low/medium/high/unknown`; removes `confidence` NOT NULL and its default; adds nullable `source_text text`, `source_start integer`, `source_end integer`, `legal_reference_id text`.
- `analyses`: replaces the named overall-risk check with `low/medium/high/unknown`.
- New/replaced `admin_case_events_overview`: `id, case_id, actor_id, actor_role, event_type, created_at, metadata`; active-admin filter; metadata limited to `from/to/reason_code/urgency/category`. Drops `case_events_admin_read` on the raw table.
- No existing application rows or object bytes are deleted/backfilled by 007. New guards affect future writes; reads/access can change immediately.

Policies and triggers:

- Replaces `active_account_required`, **restrictive**, `FOR ALL TO authenticated`, both USING and WITH CHECK = `account_is_active()`, on these **15** tables: `documents`, `document_clauses`, `analyses`, `cases`, `case_events`, `case_notes`, `case_documents`, `messages`, `drafts`, `appointments`, `notifications`, `saved_lawyers`, `ai_history`, `reports`, `system_events`. Existing permissive ownership/role policies must still exist; a restrictive policy alone grants no access. See [PostgreSQL policy composition](https://www.postgresql.org/docs/current/sql-createpolicy.html).
- Replaces `active_actor_guard`, BEFORE INSERT/UPDATE/DELETE per row, on these **13** tables: `documents`, `document_clauses`, `analyses`, `cases`, `case_notes`, `case_documents`, `messages`, `drafts`, `appointments`, `saved_lawyers`, `ai_history`, `lawyers`, `profiles`.
- Replaces `requested_lawyer_guard` BEFORE INSERT on `cases`, and `analysis_document_owner_guard` BEFORE INSERT/UPDATE on `analyses`: **15 trigger installations total**.
- Replaces `case_docs_insert` and `case_docs_delete` on `storage.objects`. Insert is active-owner/approved-assignee and case-status bound. Citizen insert statuses: requested, accepted, active, waiting_for_client, waiting_for_lawyer. Lawyer insert statuses: the same except requested. Delete requires matching `owner=auth.uid()` and active actor.
- `case_docs_read` remains from 004 but its referenced `is_case_participant()` changes, revoking rejected/inactive/unapproved lawyer reads. 007 does not create the case bucket or repair arbitrary extra Storage policies.

Explicit permissions and Storage:

- `admin_case_events_overview`: revoke ALL from PUBLIC/anon; grant SELECT to authenticated (view predicate restricts actual rows to active admin).
- `finalize_document_analysis(uuid,jsonb,jsonb)` and `request_case_once(uuid,jsonb)`: revoke ALL from PUBLIC/anon; grant EXECUTE to authenticated.
- `case_submission_keys`: revoke ALL from PUBLIC/anon/authenticated; privileged wrapper alone owns writes. Confirm that unexpected column-level grants do not survive on a preexisting table.
- No explicit ACL reset for the other nine function definitions. Replacing existing functions preserves their owner/permissions; newly created functions inherit applicable default privileges. Inspect actual ACLs rather than assuming an authenticated-only grant. See [PostgreSQL CREATE FUNCTION](https://www.postgresql.org/docs/current/sql-createfunction.html).
- Existing `case-documents` bucket: updates MIME allowlist to PDF, PNG, JPEG, WEBP, TXT, DOCX. Does not create a missing bucket, set its privacy flag, or reset its size limit; expected private/10 MiB setup comes from 004. Storage schema, `storage.foldername(text)`, real RLS/grants, and a compatible `storage.objects.owner` type are dependencies.

### 008_private_source_documents.sql

Own `BEGIN` / `COMMIT`; no existing rows/files moved, deleted, or backfilled.

- Adds nullable `documents.original_storage_path text`, `original_mime_type text`, `original_size_bytes bigint`.
- Defines/replaces **two** stable SECURITY DEFINER functions, `search_path=public`: `can_read_document(uuid)` and `citizen_document_storage_access(text,boolean)`.
- Document reads: active document owner, or active approved assigned lawyer on a case whose `document_ids` explicitly includes the document and whose status is not rejected. This includes requested cases; sharing starts when the citizen explicitly links the document, not only on acceptance. Verify this existing product consent behavior.
- Storage path must have exactly three segments `<citizen UUID>/<document UUID>/<filename>`, match the document owner, and pass active-account/ownership checks. Malformed UUID casts are caught and return false. Writes require document owner; reads use the sharing gate.
- Creates/upserts `citizen-documents` in `storage.buckets`: private, 10,485,760-byte limit, the same six MIME types as 007. On collision it changes privacy/limit/MIME configuration of that existing bucket; it does not migrate existing objects or document paths.
- Replaces **three** authenticated policies on `storage.objects`: `citizen_docs_read` SELECT; `citizen_docs_insert` INSERT; `citizen_docs_delete` DELETE (active owner path prefix). No UPDATE policy, consistent with application's `upsert:false`.
- No new public table, trigger, view, index, or explicit function/table grant statement. Existing document CRUD and Storage grants must already permit the intended operations; helpers inherit/retain ACLs. Policies are not grants. All additional permissive Storage policies must be reviewed for bypasses.
- Depends on 007 active/approved helpers and existing document/case relationships. Older documents remain nullable with no recoverable original bytes unless a separate, explicitly authorized backfill source exists.

### 009_curated_labour_references.sql

- Replaces **only** `finalize_document_analysis(uuid,jsonb,jsonb)` and repeats its PUBLIC/anon revoke and authenticated EXECUTE grant. No new table, column, policy, trigger, bucket, or legal-source seed.
- Static comparison confirms the function body differs from 007 **only in the reference-ID allowlist**: retains `art63`, `art64`; adds `art15a`, `art56a`, `art59a`, `art61a`, `art62`, `art65` (all under `jo-labour-8-1996-…-20250724`). These match the eight IDs in `src/lib/legal/corpus.ts`. Unknown IDs still become NULL; this is not a statement that a legal citation is substantively verified.
- Depends on 007's helpers/columns and base analysis tables. No direct SQL dependency on 008's original-file columns/bucket; normal rollout order is still 007 → 008 → 009.
- **No explicit BEGIN/COMMIT**. Use a reviewed runner that makes its three statements one transaction; do not assume file-level atomicity under autocommit.
- **Rerunning 007 after 009 overwrites the eight-ID finalizer with the two-ID version.** Keep 009 last, including after any justified 007 rerun. Applying 009 does not recover references previously discarded as NULL.

## Prerequisites and whether 007 is sufficient

For the affected no-document path, the chain is:

`authenticated active citizen` → `request_case_once(uuid,jsonb)` → `account_is_active()` + `case_submission_keys` → 004 `request_case(...)` → `cases` insert and target guard → 004 `cases_after_insert()` / `_case_event()` / `_notify()` → case event and lawyer notification.

Empty document/clause arrays are valid; optional summaries/dates/questions are normalized by the wrapper. The app targets `lawyers.id`, not `profiles.id`, and sends no citizen identity. Category/urgency must be accepted enums; the approved lawyer must also be active, non-demo, and accepting new cases. The database derives the citizen from `auth.uid()`.

Whole-file 007 additionally requires:

1. Correct `public` schema/DDL search path; Auth `auth.uid()`; trusted migration/function owner; anon/authenticated roles; necessary schema privileges and PostgreSQL UUID/advisory-lock/hash functions.
2. Base `profiles`, `lawyers`, `documents`, `document_clauses`, `analyses`, `cases`, `messages`, `drafts`, `appointments`, `notifications`; account-status/role fields, risk/confidence/source text fields, and expected FK/check definitions.
3. 004 objects: lifecycle columns (`urgency`, `request_description`, `request_message`, `is_manual`, `accepted_at`, `accepted_by`, etc.), allowed case/notification states, `case_events`, `case_notes`, `case_documents`, `reports`, `system_events`; `request_case(uuid,text,text,text,text,uuid[],uuid[],text,text,text,text[],text[],text[],text[],integer)` and its dependency bodies/triggers/grants; existing permissive RLS policies; private `case-documents` bucket and read policy.
4. 005 `saved_lawyers` and `ai_history`: both are unconditional targets in 007's loops. If missing, 007 fails and its transaction rolls back.
5. Verify 006 as the repository's prescribed baseline (admin notifications and governorate-aware signup). It is not a direct dependency of `request_case_once`, but do not skip or blindly replay it without a schema comparison.

Thus **007 is sufficient for the identified missing RPC blocker, conditionally**, and not sufficient to establish the entire current app as functional. If a prerequisite/notification trigger fails, the creation transaction fails even after the wrapper becomes visible. Reloading the cache is a post-commit exposure check, not a replacement for creating the function. See [PostgREST schema-cache behavior](https://docs.postgrest.org/en/stable/references/schema_cache.html).

## Production risks and readiness gates

| Risk | Required mitigation before execution |
|---|---|
| Wrong project or partial schema | Confirm project reference in dashboard and connection/keys; compare every touched object, not just migration history or one missing RPC. Do not infer staging from localhost. |
| Broad access change | Rehearse inactive citizens/admins, pending/rejected/demo lawyers, active approved users, background jobs and signup. Existing hidden data remains stored; do not interpret newly denied reads as deletion. |
| Replacing stricter/custom objects | Export current function bodies/owners/ACLs, policies, triggers, view definitions and constraints. Review differences; same names do not prove equivalence. IF NOT EXISTS does not repair incompatible preexisting tables/columns. |
| Locking/constraint validation | DDL and check validation can block concurrent traffic. Measure table sizes and lock duration in staging, choose a bounded lock/statement timeout and maintenance window. Abort on lock timeout; do not retry indefinitely. |
| Named-check drift | Extra differently named risk checks may still reject `unknown`; invalid existing values may prevent new checks. Inspect every relevant check, not just the two expected names. No automatic data normalization. |
| Historical analysis inconsistency | Finalizer rejects preexisting clauses/analysis for a non-finalized document and requires exact quotes in `citizen_description`. Count inconsistencies privately; migration does not repair them. Source offsets are stored, not fully SQL-validated as UTF-16 substrings. |
| Function ownership/default grants | Validate trusted definer owner, fixed search path, public-schema CREATE privileges and actual helper/workflow ACLs. The legacy `request_case` remains callable under 004's grants; wrapper idempotency does not make every possible legacy/direct submission idempotent. |
| Storage drift | Verify real owner column type, all Storage policies/grants, bucket privacy/size/MIME and path formats. 007's bucket UPDATE can affect zero rows without failing; 008's upsert can change an unrelated preexisting bucket with the same name. |
| Source persistence downgrade | Keep 009 last; six IDs are silently NULL with only 007. Reinstalling the function will not backfill already lost references. |
| Autocommit/partial rollout | 007/008 are individually transactional; 009 needs a transaction runner. A successful 007 followed by failed 008 is a partially advanced deployment, not an all-or-nothing 007–009 rollback. |
| Recovery gaps | Database backup excludes Storage object bytes. Capture both with a consistent checkpoint and rehearse restore; coordinate later writes rather than restoring a stale snapshot over them. [Supabase backup coverage](https://supabase.com/docs/guides/platform/backups). |
| Reverse migration loses new data/security | Preserve idempotency mappings, unknown risks, null confidence, source metadata and original files. Restoring old policies/helpers may reintroduce security gaps. Prefer a reviewed forward repair; no blanket DROP/CASCADE/reset. |

No production-ready down migration exists in the repository. The current remote baseline and any intervening writes are unavailable, so an exact executable production rollback file cannot truthfully be supplied yet. The object-specific procedure below defines how to generate and rehearse one before any production approval.

## Safe staging setup and recommended execution order

These are **future operator steps**, not commands run during this audit.

1. Owner designates an isolated Supabase staging project/reference. Use schema/configuration and synthetic data; do not copy production legal files, identities, secrets, integrations or outbound email effects. A fresh setup verifies installation; an additional sanitized schema-drift rehearsal verifies upgrading an existing database.
2. Pin the audited Git commit and migration checksums. Preserve a private baseline schema/role/grant/default-privilege dump, constraint/nullability/default definitions, trigger/policy/view definitions, migration history, and bucket configuration. For any existing data, take a tested database backup plus private Storage-byte inventory/backup with hashes. Store backups outside Git with restricted access. `pg_get_functiondef` alone is not an ACL/owner backup.
3. Existing staging: inventory prerequisites and apply only absent/incompatible changes through reviewed diffs; stop on custom drift. Never replay `schema.sql` on an existing project. Empty staging only: canonical repository order is **schema.sql → 004 → 005 → 006 → 007 → 008 → 009**. The current base schema incorporates 002/003 changes; do not append those old files blindly. Verify real extensions/pgvector/Auth/Storage behavior rather than relying on PGlite substitutions.
4. Use a separate local app process and isolated browser context with staging-only process environment; preserve `.env.local` and the owner's existing server. Required application variables remain `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY`. For optional AI acceptance, add `OPENAI_API_KEY`, `OPENAI_MODEL`, the compatible 1536-dimension embedding model, and existing demo signing configuration. The minimal case request does not need AI.
5. QA helpers additionally require `HAQ_QA_ENVIRONMENT=staging` and `HAQ_QA_PROJECT_REF`, matching the exact URL. They do not load `.env.local`. Establish this target before any fixture creation. Configure only approved staging/localhost Auth callbacks, not production domain/DNS/OAuth changes.
6. Run catalog/data preflight below and review the proposed inverse/forward-repair plan. Confirm the DDL connection belongs to the approved staging reference, uses the intended `public` search path, and has the necessary owner/Storage-policy privileges. Choose lock/statement timeouts based on rehearsal measurements. Secrets must not be placed in shell history, command arguments or report artifacts.
7. Apply **007 only** in staging using fail-fast execution. It already contains BEGIN/COMMIT. Stop on error. Check all touched objects and permissions, then perform the no-linked-document real staging browser/RPC acceptance before advancing.
8. Apply **008**, verify private Storage and consent/revocation/download/delete/retry behavior. Then apply **009**, transactionally, and verify all eight allowed reference IDs plus preservation of ownership/atomicity checks. Keep it last after any 007 rerun.
9. Rehearse rollback/forward repair on staging; collect results. Only then prepare a separately approved production change with actual schema diff, backup checkpoint, compatible app version, maintenance window and rollback decision thresholds. This audit grants no production execution permission.

Example fail-fast file execution, **only after separate staging authorization and private connection setup** (`PGHOST`/other libpq settings or an approved private service definition, never a password in the command):

```text
psql -X --set=ON_ERROR_STOP=1 --file=supabase/migrations/007_security_and_atomic_analysis.sql
# STOP and inspect catalog + no-document workflow.
psql -X --set=ON_ERROR_STOP=1 --file=supabase/migrations/008_private_source_documents.sql
# STOP and inspect Storage workflow.
psql -X --set=ON_ERROR_STOP=1 --single-transaction --file=supabase/migrations/009_curated_labour_references.sql
# STOP and inspect finalizer/citation workflow.
```

Do not wrap 007/008's embedded COMMITs in a presumed single outer all-migrations transaction; the [psql transaction documentation](https://www.postgresql.org/docs/current/app-psql.html) explicitly distinguishes this from a script without transaction commands. Do not run unrestricted `db push` against a linked project whose migration history differs. Database application and migration-history reconciliation are separate reviewed steps; do not mark absent migrations as applied merely to silence tooling.

## Exact preflight and catalog verification templates

The following queries are **documented only, not executed**. An authorized operator can run them before and after in a READ ONLY transaction. Begin with catalog existence checks; run dependent table/data queries only after confirming objects/columns, otherwise a missing relation aborts that transaction. Results belong in private operator evidence, with no private case text or credentials.

```sql
BEGIN TRANSACTION READ ONLY;
SHOW search_path;
SELECT current_database(), current_user, version();

-- Existence, definitions, owners, definer mode, configured path and raw ACLs.
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_function_result(p.oid) AS result, pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef, p.proconfig, p.proacl, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
  'account_is_active','is_admin','current_lawyer_id','current_approved_lawyer_id',
  'is_case_participant','reject_inactive_actor','guard_requested_lawyer',
  'guard_analysis_document_owner','finalize_document_analysis','request_case_once',
  'lawyer_create_manual_case','can_read_document','citizen_document_storage_access',
  'request_case','cases_after_insert','_case_event','_notify','handle_new_user'
) ORDER BY p.proname, arguments;

-- Required request signatures, not just a same-name overload.
WITH required(signature) AS (VALUES
 ('public.request_case_once(uuid,jsonb)'),
 ('public.request_case(uuid,text,text,text,text,uuid[],uuid[],text,text,text,text[],text[],text[],text[],integer)'),
 ('public.finalize_document_analysis(uuid,jsonb,jsonb)')
)
SELECT signature, to_regprocedure(signature) AS object,
       has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE') AS authenticated_execute,
       has_function_privilege('anon',to_regprocedure(signature),'EXECUTE') AS anon_execute
FROM required;

-- Inspect both expected objects and extra policies that could compose with them.
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies
WHERE schemaname='public' OR (schemaname='storage' AND tablename='objects')
ORDER BY schemaname,tablename,policyname;

SELECT n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl,
       pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (n.nspname='public' AND c.relkind IN ('r','p','v'))
   OR (n.nspname='storage' AND c.relname IN ('objects','buckets'))
ORDER BY n.nspname,c.relname;

SELECT table_schema,table_name,column_name,data_type,is_nullable,column_default
FROM information_schema.columns
WHERE (table_schema='public' AND table_name IN
 ('profiles','lawyers','cases','documents','document_clauses','analyses','case_submission_keys','notifications'))
 OR (table_schema='storage' AND table_name IN ('objects','buckets'))
ORDER BY table_schema,table_name,ordinal_position;

SELECT n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid) AS definition,k.convalidated
FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('profiles','lawyers','cases','documents','document_clauses','analyses','case_submission_keys','notifications')
ORDER BY c.relname,k.conname;

SELECT n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname IN ('public','auth')
ORDER BY n.nspname,c.relname,t.tgname;

SELECT schemaname,viewname,viewowner,definition FROM pg_views
WHERE schemaname='public' AND viewname IN
 ('lawyers_public','admin_cases_overview','admin_case_events_overview');
SELECT defaclrole::regrole,defaclnamespace::regnamespace,defaclobjtype,defaclacl
FROM pg_default_acl;
SELECT grantee,table_schema,table_name,column_name,privilege_type
FROM information_schema.column_privileges WHERE table_schema IN ('public','storage');
SELECT nspname,nspacl FROM pg_namespace WHERE nspname IN ('public','auth','storage');
ROLLBACK;
```

Once relation/column existence is confirmed, document these additional SELECT-only checks separately:

```sql
BEGIN TRANSACTION READ ONLY;
SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets
WHERE id IN ('case-documents','citizen-documents');
SELECT risk_level,count(*) FROM public.document_clauses GROUP BY risk_level;
SELECT overall_risk,count(*) FROM public.analyses GROUP BY overall_risk;
SELECT count(*) AS null_confidence FROM public.document_clauses WHERE confidence IS NULL;
SELECT count(*) AS parent_mismatches FROM public.analyses a
LEFT JOIN public.documents d ON d.id=a.document_id
WHERE d.id IS NULL OR d.user_id IS DISTINCT FROM a.user_id;
SELECT count(*) AS partial_existing_analyses FROM public.documents d
WHERE d.status <> 'analyzed' AND
 (EXISTS(SELECT 1 FROM public.document_clauses c WHERE c.document_id=d.id)
  OR EXISTS(SELECT 1 FROM public.analyses a WHERE a.document_id=d.id));
SELECT count(*) AS analyzed_without_analysis FROM public.documents d
WHERE d.status='analyzed' AND NOT EXISTS
 (SELECT 1 FROM public.analyses a WHERE a.document_id=d.id);
ROLLBACK;
```

Catalog expected results after full staging rollout: all 13 distinct 007/008 function names with matching signatures and trusted owners; 007's 15 restrictive policies and 15 trigger installations; required 004 permissive policies remain; one private idempotency table with exact PK/FKs and denied direct client access; expanded risk checks with no conflicting legacy check; confidence nullable/no default; four provenance and three original-file columns; both buckets private/10 MiB/six allowed MIME types; sanitized view ACL/filter; finalizer body matches 009's eight IDs; anon has no execute on either new workflow RPC, authenticated does. PUBLIC and unexpected/default/column grants need their own ACL review, not just the `anon` test above.

If migration history exists, inspect `supabase_migrations.schema_migrations` read-only after confirming the relation's shape. History is supporting evidence only; verify deployed objects and file checksums. After an authorized DDL commit, if the catalog is correct but REST still reports PGRST202, the operator can request the documented `NOTIFY pgrst, 'reload schema'` cache reload under separate authorization and retest; that notification was not issued here.

## Exact staging acceptance and stop conditions

Every item below is unverified in hosted staging. These are future tests that **write synthetic staging data**, not read-only preflight and not authorized for production by this audit.

| Gate | Steps and required evidence |
|---|---|
| No-document request after 007 | Manually log in as staging citizen A; open a staging approved active non-demo accepting lawyer; fictional title >=3 and description 10–5000; no linked document/attachments; normal Submit click. Network must show POST request_case_once and successful UUID response, then case detail. Inspect exact returned case ID: client=A, lawyer=row ID, requested state, empty document_ids/relevant_clause_ids, exactly one request event and one target notification. Record method/status/code/IDs privately, never text/tokens. |
| Retry/concurrency | Reuse the exact same key and normalized payload through the staging API twice and concurrently; same UUID, one case/key mapping/event/notification. Same key with changed payload must fail `submission_changed` and leave counts unchanged. Different citizens' keys remain isolated. |
| Negative request cases | Anonymous, lawyer-role actor, disabled citizen, pending/rejected/demo/disabled/non-accepting target, foreign document/clause IDs, malformed UUID and invalid category/urgency. Expect appropriate denial or documented filtering, no unexpected new case/event/notification/key. 004 filters foreign IDs to owned IDs; verify no foreign sharing, not an assumed whole-request rejection. |
| Form/error behavior | Force an actual staging failure; dialog and inputs remain, busy clears, no success/navigation. Confirm after RPC success that citizen and target lawyer can reload their own case; unrelated citizen/lawyer/admin cannot read private content. |
| 007 analysis | Owned document with exact stored quote; valid two-reference analysis, unknown risk/null confidence; one successful save; same-document retry returns same UUID. A bad later clause rolls back all inserted clauses/analysis/status. Foreign parent/disabled actor denied. Inspect old inconsistent fixtures without deleting or pretending they were repaired. |
| 007 behavior regressions | Signup/profile creation, lawyer approval and suspension, accepted/rejected case lifecycle, messages, notes, appointments, bookmarks/history, notifications. Active admin can read sanitized overview; an unrelated admin receives no blanket read of raw private case events; demo admin gains no real rights. Long manual story >5,000 preserved; >240,000 rejected. |
| 008 originals | Fictional TXT/PDF/DOCX/image inputs through actual Storage API; metadata path/MIME/size and byte hash match. Owner read/upload/delete works; unrelated citizen/admin/lawyer and anonymous denied. Only explicitly linked approved assignee reads; rejection/disable denies new download/signed URL. No consent means no lawyer access. Existing 60-second URLs are tested separately until expiry. Bad paths/MIME/oversize and upsert denied. |
| 008 failure recovery | Lost upload/metadata response and same-byte retry preserve original bytes; mismatched retry denied; no unrelated deletion. Deletion and account cleanup checked for orphaned bytes because Storage and application-row operations are not one atomic transaction. Legacy null originals are reported as unavailable. |
| 009 provenance | Finalize eight separate fictional owned documents, one reference ID each; every legal_reference_id retained; unrelated ID becomes NULL; source-quote and foreign-owner denials still work; rerun within staging and compare definitions/ACLs/counts. No legal-source seeding or automatic backfill is assumed. |
| Rerun and recovery rehearsal | Rerun 007/008 only in isolated staging, then 009 last; retain all existing rows/bytes and recheck ACLs/reference allowlist. Test the approved rollback/forward repair on synthetic post-migration data, not just an empty database. |

Existing `security-regression-tests.mjs`, `source-storage-tests.mjs`, `curated-source-tests.mjs` apply SQL in disposable PGlite and are useful in a later authorized rehearsal, but were not run here. `live-authz.mjs` calls the **legacy request_case**, so passing it does not verify the application's `request_case_once`, its concurrency, or the complete 007–009 matrix. Explicit wrapper/browser/Storage API tests above are required. `check-migration.mjs` checks a small 004 subset and cannot certify migration completeness. `inspect-db.mjs` prints user emails and must not be used for privacy-safe evidence collection.

Staging QA fixture creation/cleanup, if separately authorized, can use the existing run-owned helpers with strict target matching. They write private credential/session artifacts; owner-manual browser sign-in is available instead. Verify/remove exact owned Storage objects through Storage APIs **before** deleting the owning QA accounts; then remove exact run-owned accounts and verify no orphan bytes. Do not rely on database cascades or issue DELETE against storage.objects as file cleanup. Stop and retain the run manifest on uncertain cleanup.

**Stop advancement** on any migration error, lock timeout, missing prerequisite, unintended ACL/policy widening, duplicate or partial write, cross-user access, wrong bucket privacy, failed signup/core existing flow, lost metadata/bytes, missing provenance, or failed recovery rehearsal. Passing lint/build or a catalog presence query cannot override a failed functional/security gate.

## Rollback and recovery procedure

1. **Before execution:** capture actual pre-change object definitions/ACLs/owners and data/storage checkpoints; identify which objects already exist. Generate a reviewed inverse from that snapshot, with a dependency map and a compatible application release/configuration. Rehearse against synthetic rows/files written after the migration. Without these artifacts the production rollback is blocked, not a generic `ROLLBACK` promise.
2. **Failure before file COMMIT:** 007/008 failures roll back that file's transaction when the fail-fast connection closes (or operator issues ROLLBACK in the failed interactive transaction). Prior committed files remain. 009 should run as one transaction to provide the same boundary; under autocommit a later grant failure would not undo the already replaced function. Recheck catalog instead of assuming which statements committed.
3. **After commit, prefer forward repair:** pause affected staging/production writes through an approved operational control, preserve current evidence and later rows/files, and choose a targeted reviewed correction. This audit does not implement a write pause. Return to the exact audited versions if definitions drifted, keeping 009 last; do not replay unrelated migrations.
4. **007 inverse, if separately justified:** for the five authorization helpers, restore those that existed to their captured definitions; retain newly created helpers until all dependent callers/policies have been reviewed. Restore the captured manual-case RPC/ACL and any preexisting definitions for guard/finalizer/request functions. Restore replaced triggers to their captured definitions (or remove only newly introduced trigger installations), restore the 15 prior active-account policies or their prior absence, restore prior admin view/raw-event policy only after explicit security review, and restore the two prior case Storage policies and captured bucket MIME configuration. Preserve all new idempotency rows/table and source columns by default. Removing a new wrapper requires pausing its current app callers; don't substitute the legacy RPC silently. Never use CASCADE to remove dependencies.
5. **007 data compatibility:** old risk checks cannot be reinstated if new `unknown` rows exist; old confidence NOT NULL cannot return while NULLs exist. Do not relabel unknown as low, invent confidence, or delete provenance to force rollback. Retain additive schema/security protections and use a compatible forward repair until a separately approved data/release plan exists. Restoring 004's manual-case body also reintroduces truncation for future writes. A baseline schema restore may recreate the original broken case-request path, not a working product.
6. **008 inverse:** preserve private original files, metadata columns and reference paths; restore only captured compatible helpers/policies/configuration after evaluating active app callers. Do not drop bucket/columns or make originals public. If an existing bucket was public before 008, restoring public access is a separate security/product decision, not automatic rollback. Remove only exact run-owned test objects through Storage APIs when no valid references remain, then verify cleanup. Account deletion is not proof of byte deletion.
7. **009 inverse:** restoring the captured previous finalizer body plus its owner/ACL changes future reference persistence; no existing references are removed by the replacement. If the previous body had only two IDs, pause new analysis writes or forward-fix rather than silently losing six references. Never rerun all of 007 as the rollback for 009.
8. **Checkpoint recovery, last resort:** owner explicitly authorizes a restore with downtime and an agreed data-loss/reconciliation boundary. First rehearse restore into a separate isolated project where possible, reconcile post-checkpoint application/Auth changes and Storage bytes, and verify relationships/object hashes. Never restore an old database over later valid production writes blindly. Database backup does not restore deleted Storage bytes; separate byte recovery is required. [Supabase restore limitations](https://supabase.com/docs/guides/platform/backups).
9. **After any repair/reversal:** repeat catalog/ACL/owner/policy/trigger/bucket comparison, expose the intended REST signature/cache, then rerun no-document request, idempotency, authorization, analysis, original-file and reference gates. Do not reopen writes or mark completion while these fail. Record actual applied/reversed state and reconcile migration history without fabricating execution.

## Other flows affected by absent migrations

Only the missing request_case_once is confirmed remotely. The remaining rows are **conditional dependencies to verify**, not asserted remote failures:

| Missing prerequisite/change | Affected current application behavior |
|---|---|
| 007 finalizer/provenance/risk schema | Citizen pasted-text analysis may generate an AI result but cannot atomically persist/reopen it through the required RPC; unknown risks and source columns may fail against older checks/schema. |
| 008 original-file columns or bucket/policies | File-based citizen analysis fails in storeCitizenSourceAction before AI; original downloads/shared-lawyer originals fail; deletePrivateDocumentAction selects original_storage_path even for documents with no original, so missing column can also block deletion. |
| 009 allowlist | With only 007, analysis can save but six curated reference IDs are discarded as NULL; saving/reopening provenance is degraded, not necessarily total analysis failure. |
| 007 manual-case replacement | Existing 004 manual-case RPC may still succeed but truncate story text above 5,000 characters. This is an integrity limitation, not proof the flow is fully unavailable. |
| 007 security changes | Disabled/unapproved/rejected access and admin raw-event privacy protections may be absent even while ordinary UI appears to work. Current app has no consumer of the new admin_case_events_overview view; verify its DB boundary directly. |
| Missing/incompatible 004 | Accept/reject/status/viewed RPCs, case timeline/messages/files, notifications, reviews/admin decisions and private views can be unavailable or unsafe. Known successful directory/approval behavior is partial evidence, not full 004 certification. |
| Missing 005 | Saved lawyers/AI conversation history and their loading/saving fail; whole 007 application also fails on missing loop targets. |
| Missing 006 | Admin lawyer/report notifications and governorate-aware signup persistence may differ; function replacements must be inspected before replay. |

## Verification performed for this audit

Read-only filesystem/Git/source inspection; no SQL or network request to the project. Static file inspection confirms 007/008 transactional wrappers, 009's absence of one, 11/2/1 function-definition counts, and finalizer equality after replacing only the allowlist. Checksums of the exact audited files:

| File | SHA-256 |
|---|---|
| 007_security_and_atomic_analysis.sql | bff2b2142a48d11cc00940a96bfa7102dc9966ecd20538a0db4241eb863db467 |
| 008_private_source_documents.sql | fa08ac5fbf477e5fd95b993156d5a1a6612c28ab7481f2d9160a7e6dbf965f0b |
| 009_curated_labour_references.sql | 8a99dc1ed2eebac5e9384a17bdd3afd8e7521ec0f78bb2a174579a35b863350b |

Runtime/migration tests, lint, TypeScript and build were not rerun for this documentation-only audit. Prior checks are historical evidence. No remote migration, RPC success, Storage validation or rollback rehearsal is claimed. No completion checkbox for the underlying blocked flows was changed.
