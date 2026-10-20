# Case-request wrapper: owner-review package

Prepared 2026-10-10 on `staging-prep`, baseline `58399533d6dac6ac81fe42117884619613da90d0`. **Not applied remotely.** No application code, existing migration, environment file, Storage setting or existing authorization policy was modified. The preceding read-only readiness report and its ledger entry were already uncommitted and are preserved.

The owner confirmed that the production catalog contains the fifteen-argument `request_case`, with authenticated execution, but lacks `account_is_active`, `case_submission_keys` and `request_case_once`. The recorded real browser POST returned HTTP 404 / PGRST202. This package repairs only that missing callable wrapper, subject to the compatibility checks below. It is not certification of production security or a successful production submission.

**Current revision supersedes the earlier unchanged-legacy-ACL / disabled-target limitation.** The owner now authorizes addressing inactive targets and evaluating the legacy API. The patch therefore adds target authorization inside the wrapper and withdraws the legacy creator's non-owner EXECUTE grants. It introduces no extra trigger or persistent object.

## Reconciling the earlier NULL lookup

The exact supplied lookup is identical to the original checked-in string:

```sql
select to_regprocedure('public.request_case(uuid,text,text,text,text,uuid[],uuid[],text,text,text,text[],text[],text[],text[],integer)');
```

It has the correct fifteen input types: UUID; four TEXT; two UUID arrays; three TEXT; four TEXT arrays; INTEGER. There is no visible transcription defect in the supplied text. Local tests prove that this string, its fully `pg_catalog`-qualified equivalent, and the catalog row resolve to the **same function OID** over exact 004. Ordinary whitespace and `integer`/`int4` aliases do not explain NULL. Default arguments do not reduce the stored identity signature. PostgreSQL defines the call signature through `pg_proc.proargtypes`; see [the catalog definition](https://www.postgresql.org/docs/current/catalog-pg-proc.html) and [regprocedure name/type resolution](https://www.postgresql.org/docs/current/datatype-oid.html).

Owner's subsequent same-project checks report 15 arguments, 11 defaults, matching body and no type differences. These outweigh treating one historical NULL as proof of absence. **Its historical cause remains unproven**: the pasted text cannot reveal the exact bytes originally executed, an earlier catalog snapshot or session resolution context. No remote query was performed here, and no actual transcription/project error is asserted. PostgREST cache state does not control SQL catalog resolution.

An additional disposable test reproduces **NULL with the exact supplied string and an unchanged compatible request_case**: a local `public.uuid` domain combined with `search_path=public,pg_catalog` makes unqualified argument-type names resolve differently. The fully qualified type/OID comparison still succeeds. This proves a session/type-resolution discrepancy is possible without changing the base function; it is **not evidence that production has such a domain/search path**. The remote preflight records the supplied lookup before fixing the path and reports possible same-named types, then repeats comparison using trusted catalog types. The NULL result cannot be conclusively attributed until that read-only metadata is checked.

The revised patch resolves all four prerequisite functions by `public` namespace, name and **every ordered argument OID from `pg_catalog`**, and rejects additional overloads. It retains every prior body/owner/language/return/configuration/default-count/argument-name/security guard. It does not fall back to name-only resolution. The preflight now outputs the independently discovered catalog OID, fully qualified literal lookup OID, the original checked-in lookup OID, exact argument OID equality, type differences, counts and hashes together in a single read-only transaction. On production these should reconcile to the same non-null OID. If they do not, preserve the metadata and investigate; do not remove guards or change the base function types.

## Artifacts and exact change inventory

| Artifact | Purpose |
| --- | --- |
| `supabase/patches/case_request_wrapper.sql` | Standalone, single-transaction installation; deliberately outside the numbered migration directory |
| `supabase/patches/case_request_wrapper_preflight.sql` | Short read-only remote catalog check; no RPC invocation or private row contents |
| `supabase/patches/case_request_wrapper_postcheck.sql` | Read-only post-install function/ledger/grant verification |
| `scripts/dev/case-request-wrapper-patch-tests.mjs` | Disposable local SQL and authorization/idempotency tests |
| This document | Review, verification and recovery instructions |
| `IMPLEMENTATION_STATUS.md` | Append-only evidence and remaining blockers |

The patch creates exactly these three named application objects:

| Object | Definition / security / dependencies |
| --- | --- |
| `public.account_is_active()` -> boolean | Stable SQL SECURITY DEFINER; reads only the `auth.uid()` profile's active status; no API EXECUTE grant |
| `public.case_submission_keys` | `user_id uuid NOT NULL`, `key uuid NOT NULL`, `request_hash text NOT NULL`, `case_id uuid NOT NULL`; composite PK `(user_id,key)` with its required unique index; two FK constraints to `profiles(id)` and `cases(id)`, both `ON DELETE CASCADE`; RLS enabled, zero policies, no non-owner grants |
| `public.request_case_once(p_key uuid,p_request jsonb)` -> uuid | SECURITY DEFINER; authenticated EXECUTE only; delegates each new request to the unchanged fifteen-argument `public.request_case` |
| Existing `public.request_case(...)` | **ACL change only:** revoke all non-owner EXECUTE, including PUBLIC, anon, authenticated, service/default/custom grantees. Body, signature, defaults, owner and configuration remain unchanged; the wrapper executes it as the same owner |

Both new functions fix `search_path` to `pg_catalog, public, pg_temp` and qualify application tables/functions. All initial non-owner grants on the three new objects are removed, including Supabase/custom default grantees, then wrapper EXECUTE is granted to `authenticated`. Only the legacy creator's existing ACL is also restricted; every other existing ACL and global default privilege is untouched. The table owner must be the same trusted owner as the existing 004 functions/tables. Superuser/owner capabilities are not removed by these client ACLs. Fixed search paths and restricted function grants follow [PostgreSQL SECURITY DEFINER guidance](https://www.postgresql.org/docs/current/sql-createfunction.html).

Ephemeral `DO` blocks check prerequisites and clear new-object ACLs; they create no persistent helpers. Transaction-local settings are a 5-second lock timeout and 30-second statement timeout. A transactional `NOTIFY pgrst, 'reload schema'` requests discovery after commit; it is not a new schema object. [PostgREST documents this cache refresh mechanism](https://docs.postgrest.org/en/stable/references/schema_cache.html).

**Excluded:** every unrelated 007 policy/trigger, `is_admin`/lawyer helper replacement, analysis finalizer, admin view, risk/provenance alteration, Storage bucket/policy change, and all of 008/009. The patch does not create a case by itself, update existing rows, backfill historical idempotency keys, replace `request_case`, or change its defaults.

## Preserved behavior and wrapper safeguards

The fifteen forwarded arguments, absent-field defaults, optional arrays, summary/message handling, and `md5(jsonb::text)` payload comparison follow the exact 007 wrapper. `request_case` from 004 still derives citizen identity from `auth.uid()`, enforces active citizen status, target approval/non-demo/accepting status, validates title/description/category/urgency/message, filters document/clause IDs by ownership, and performs the case insert. Its existing insert trigger creates the case event and lawyer notification. No linked document is required, but those document tables remain SQL dependencies even for empty arrays.

For a given `(authenticated user, UUID key)`, a transaction-scoped advisory lock serializes creation; the first successful call inserts a ledger row atomically with the case/event/notification. Identical canonical JSONB payload retries return the recorded UUID. A changed payload raises `submission_changed` and writes nothing. JSON object property order does not change this comparison. MD5 here is the existing payload-equality convention, not a cryptographic authorization credential. The lock is not a global rate limiter.

Two narrowly scoped safeguards extend the 007 wrapper: reject a null/non-object request explicitly, and require an active **citizen** on cached retries as well as fresh submissions. Therefore changing a citizen's role cannot expose their cached case through a retry; these do not alter fresh `request_case` behavior. No browser identity field is trusted. Same key under a different citizen is a different submission.

After acquiring the key's advisory lock, the wrapper rechecks and share-locks the citizen profile. For a **fresh** request, it requires the target's linked profile to be active and have lawyer role, and share-locks both lawyer and profile rows before delegating. Locks remain through the case/key transaction, preventing a disable/role/verification/availability update from interleaving this check and insert. The existing 004 validation still decides approval/demo/accepting status and its error categories. Failed target checks produce `lawyer_unavailable` and consume no key. An unchanged retry of an already completed submission returns its existing UUID even if the target is now disabled; it creates no new case/notification/event. This is recovery of an existing submission, not permission for a new request. [PostgreSQL documents row-lock conflict and transaction lifetime](https://www.postgresql.org/docs/current/explicit-locking.html). Native multi-session verification is still required.

Existing limitations deliberately retained:

- 004's legacy body remains non-idempotent and lacks the target profile check, but API roles can no longer invoke it. Trusted owner/superuser maintenance can still bypass the wrapper; this is not a sandbox against database administrators or all privileged server code.
- Different keys, deletion of a key/case, or a newly generated client key can permit additional cases. No historical deduplication or blanket rate limiting is performed.
- Cached retries return the existing case after citizen reauthorization; they do not create a new submission or re-run target availability checks. That follows 007's completed-retry behavior.
- Existing RLS/helpers/other flows have not received the full 007 security changes. A working submit button would not prove that these are secure.

**Legacy compatibility impact:** repository application code calls `request_case_once`, so the current citizen UI is compatible. Older external clients and existing `live-authz.mjs`/`authz-tests.mjs` legacy-call expectations require review before using them against a patched database. No tests/app code/migration history are rewritten to conceal this. Other existing SECURITY DEFINER callers must be inventoried remotely: a same-owner caller could still reach the owner-only legacy creator. The read-only preflight lists catalog dependencies and potential source callers without printing bodies; dynamic calls/external callers need manual review. This patch does not claim that every privileged alternate creation flow is closed. Unknown legacy integrations must be resolved before execution approval.

## Compatibility gates and remote prerequisites

Run the **preflight file only** in the owner-identified production project, using its trusted DDL identity. It starts a read-only transaction and reports only catalog metadata: role/version/original search path, same-session OID reconciliation, function fingerprints/attributes/grants, table owner/RLS summaries, conflicting repair objects, API schema CREATE/direct INSERT rights, trigger definitions and potential legacy callers/dependencies. Empty repair-function results and a null ledger are expected **before** installation. The report is a screening query; the patch contains additional column/role/trigger guards.

Still needing remote verification:

1. The correct project/database, PostgreSQL version, exposed `public` REST schema, and DDL identity. This work has not connected to the remote project or inspected secrets.
2. All four function **bodies**, owners, return types and `search_path=public` must match 004. Expected normalized UTF-8 MD5s: `request_case` = `99bf22c2fb651dbc852dd81c1a57da2f`; `cases_after_insert` = `5b68586057ddb621885976fc3efd3b68`; `_case_event` = `a5c3b8e71470a1f75362aad93e5daf14`; `_notify` = `87e47b48ce6283aee0671c7ff4b88b4a`. CRLF is normalized to LF; even other whitespace differences fail and need review, not removal of the guard. Matching a body is not a complete security audit.
3. Trusted current DDL role must own these four functions and seven dependency tables. API roles must not be superuser/BYPASSRLS or have public-schema CREATE. `authenticated` needs schema USAGE and **before installation** existing `request_case` EXECUTE; `anon` must not execute it. **After installation neither API role may execute it.** Neither API role may execute `_notify` or `_case_event`, matching 004's internal-writer revokes, or INSERT even individual columns of cases. The patch rejects direct INSERT privileges and verifies effective legacy API EXECUTE was removed, including inherited grants. `auth.uid()` must exist, return UUID and be callable by the DDL owner. Review actual role inheritance, all legacy ACL grantees/callers and trusted schema ownership as well. A delegated grant chain that cannot be revoked without CASCADE aborts for review; no automatic CASCADE is used.
4. `profiles`, `lawyers`, `documents`, `document_clauses`, `cases`, `case_events`, `notifications` must be ordinary owner-matching RLS-enabled tables without FORCE RLS, with the columns/types enumerated in the patch. Referenced profile/case IDs must support FKs. Existing required insert defaults, constraints and real registered-account behavior still need hosted staging confirmation. The owner has so far confirmed only cases/lawyers existence, not this complete dependency chain.
5. The enabled, unconditional 004 `cases_after_insert` AFTER INSERT row trigger must be intact. Additional non-internal INSERT triggers or rewrite rules on cases/events/notifications are rejected for review, not removed. Unknown custom side effects are not adopted blindly.
6. All three repair objects must still be absent, including overloads or a relation/view with the ledger name. Any collision aborts; rerunning after success intentionally aborts instead of replacing anything. Do not attempt to repair a partially different remote schema by rerunning or by applying all of 007.
7. Owner-reviewed backup/recovery artifacts and an isolated hosted staging project are available. Record the current function definitions, ACLs, policies/trigger metadata and migration history privately before any approved DDL. No production private rows need to be pasted into this review.

Arbitrary extra constraints, corrupted historical data, provider authentication behavior and all possible dynamic dependencies cannot be proven by body/catalog guards alone. Reproduce the reviewed remote schema in hosted staging before requesting production execution approval. The patch aborts transactionally on a detected mismatch or DDL error; it is not intended to adapt unknown schemas automatically.

## Local verification actually performed

Command: `node scripts/dev/case-request-wrapper-patch-tests.mjs` — **37 checks passed, exit 0**, embedded PostgreSQL **18.3** via the existing PGlite dependency. `npm run lint` — **exit 0**. Both read-only SQL artifacts are exercised by the local suite.

The harness starts a fresh in-memory database, applies `schema.sql` and exact migration **004 only**, then the patch. It supplies Supabase-role/auth/Storage test scaffolding; signup inserts `auth.users` and exercises the real signup trigger. It strips extension installation and represents the unrelated vector column as text. No environment file, HTTP request, remote client or credentials are used; the database is closed/discarded in `finally`.

Verified groups:

- Read-only preflight with OID/type/count/hash reconciliation: supplied literal and catalog OID agree in the normal session. A deliberately incorrect signature returns NULL while the function exists. The exact supplied signature also returns NULL under a locally injected type shadow/search path, while canonical OID checks continue to pass. These illustrate possible lookup failures, not a claim about the owner's remote cause. Exact-type-OID and extra-overload rejection prove guards were not weakened.
- Body fingerprints; reject incompatible body, missing dependency function/column, disabled trigger, conflicting table/helper overload, unsafe API CREATE/direct INSERT grant or exposed internal writer; injected late-install failure leaves all three new objects absent **and restores the exact legacy ACL**; successful rerun is rejected without replacement.
- Existing function definitions/owners/unrelated ACLs, table column/default/constraint definitions, policies, triggers and Storage metadata unchanged; fictional historical document unchanged. Legacy grants are withdrawn from authenticated/anon/service/custom roles and direct legacy/table-insert bypass attempts are refused.
- Registered active citizen, approved active lawyer, no document: exactly one case, request event, notification addressed to lawyer profile, and ledger row. Same-key retry and reordered JSON: same UUID and unchanged counts. Changed same-key payload: `P0001/submission_changed` and unchanged counts. Key isolation across users and ignored browser identity field.
- Anonymous EXECUTE denial (`42501`); missing-session/profile, lawyer/admin actors, disabled citizen, and changed-role cached retry denial (`P0001/not_allowed`). Each refusal leaves counts unchanged.
- Pending/demo/missing target (`P0001/lawyer_unavailable`), nonaccepting target (`P0001/lawyer_not_accepting`), input validation and malformed UUID refusal without writes.
- Deliberately failed ledger insert (`23514`) rolls back the just-created case, notification and event. Removing the **local-only** injected failure permits one successful retry and no duplicate on the next retry.
- All fifteen arguments preserve 004 field normalization and owned document/clause filtering. Disabled/role-changed target fresh requests refuse with unchanged counts; failed keys can be retried once after target reactivation. Completed-key retry after target deactivation adds no rows.
- Recovery freeze denies both public creator paths, preserves every case/event/notification/key, and resumption safely returns the cached case UUID.

An initial test run stopped after 20 checks because its fault-injection CHECK attempted to validate existing ledger rows. The fixture was corrected to a local-only `NOT VALID` constraint (still enforced for new inserts). Subsequent complete runs passed; the failed run is not represented as a pass or production defect.

A later internal-writer ACL guard refinement initially mistyped the `_notify` signature in one check and aborted installation. Corrected it to the exact seven-argument 004 signature (UUID plus six TEXT arguments), then reran the full suite. This failed draft was not applied remotely.

In this revision, the first local preflight run rejected an unsupported direct `oid[]` to `oidvector` cast (`42846`). Corrected the implementation to normalize the ordered catalog vector with `unnest` and compare exact OID arrays, including correct zero-/one-based indexing in diagnostic differences. Full regression runs pass afterward; this was a draft error, not a remote schema finding.

**Not verified:** native multi-session advisory-lock contention, hosted PostgreSQL-version parity, PostgREST discovery/HTTP response, real GoTrue JWT/session handling, real-account browser submit or production performance. PGlite serializes its single connection; no parallel-submit claim is made. No TypeScript/build or live test was needed/run for this SQL/JS/docs-only package; no application code changed.

## Recommended execution order (future owner-authorized work)

1. Review this patch and retained security limitation. Run the read-only preflight and retain privacy-safe metadata plus private baseline definitions/backups. Resolve any guard mismatch by inspecting the actual remote baseline and issuing a separately reviewed revision; do not bypass checks.
2. Set up isolated hosted staging matching production's relevant definitions/owners/grants/provider configuration. Apply this patch alone, not a full migration push. Native PostgreSQL two-session contention and hosted/browser tests remain staging acceptance gates.
3. On staging, use registered temporary citizen/lawyer accounts; approve an active, non-demo, accepting lawyer. Submit with no linked document and fictional text through the app. Verify actual POST `/rest/v1/rpc/request_case_once` succeeds, the returned UUID identifies the owned requested case, and exactly one request notification/event exists. Privately record only IDs/counts/status/error codes, not request bodies, tokens or personal information.
4. Repeat the same key/payload through authenticated RPC; concurrently submit it in two sessions as well. Both successful same-key calls must resolve to one case and notification. Change one field under the same key: require `submission_changed` and unchanged counts. Test disabled citizen, role change, anonymous caller and invalid/disabled target with no writes. In a second session attempt citizen/target disable while a submission holds its row locks: it must wait until commit (or time out); if disable wins first, fresh submission must fail. Confirm direct legacy calls fail regardless of target eligibility. Test rollback and rehearse the freeze/forward-repair procedure.
5. **Only after separate explicit production authorization:** apply the exact reviewed file in one connection as the matched DDL owner, during a low-traffic window with backup/recovery access. For owner-configured secure connection settings, the file command is:

   ```text
   psql -X --set=ON_ERROR_STOP=1 --file=supabase/patches/case_request_wrapper.sql
   ```

   Use the owner's existing protected connection configuration; do not embed passwords/tokens in commands or checked-in files. Do not add `--single-transaction`: the patch already owns BEGIN/COMMIT. `ON_ERROR_STOP` stops on a failure; disconnecting an aborted session prevents a lingering transaction. [psql documents these execution controls](https://www.postgresql.org/docs/current/app-psql.html).
6. Run `supabase/patches/case_request_wrapper_postcheck.sql` read-only: verify new signatures/owners/fixed search paths, ledger RLS/PK/FKs/no policies and effective API ACLs. Re-run the preflight's body/OID query and recompare all four original **definitions** against the snapshot; require the same hashes. All unrelated ACLs must remain unchanged; the legacy creator must now have owner-only EXECUTE (authenticated/anon/service/custom grantees denied), and the wrapper authenticated-only EXECUTE. The three new objects should now be present. Separately verify actual REST discovery after the notification. Continued PGRST202 is a cache/exposure/target-project issue to investigate, not authorization to replay the patch.
7. Any production real submit is a **separate authorized data-writing check**. This preparation has not performed one. Before declaring restored, verify actual browser success and one owned case/notification/event with the intended real target. Do not use fallback success or repeat random-key requests as a workaround.

## Existing data effects and recovery

Installation adds an initially empty ledger and two functions, and withdraws non-owner legacy EXECUTE. There is no UPDATE/DELETE/INSERT against existing business tables and no automatic historical backfill. FK/catalog DDL can briefly wait for or block concurrent activity on referenced tables; a 5-second installation lock timeout fails rather than waiting indefinitely. Runtime authorization row locks last only through the request transaction, and may briefly serialize admin edits to those particular profiles/lawyer rows. No Storage bytes, AI/legal sources or other workflow settings are touched. After approved use, each new successful request creates the same business rows as 004 plus one key/hash/case ledger row; retries add none. Existing profile/case deletions cascade their corresponding ledger rows as specified in 007.

**Before COMMIT or on installation error:** the entire patch is one transaction. Issue `ROLLBACK` on the same still-open connection if needed, or disconnect the failed session. Verify all three objects remain absent and the baseline definitions/ACLs unchanged. Do not retry until the cause is reviewed. The local late-failure test verified this atomicity.

**After COMMIT:** there is no automatic reversible transaction. Prefer freezing new wrapper calls and a reviewed forward repair while preserving cases and keys. Future owner-approved emergency freeze, **not executed here**:

```sql
begin;
set local lock_timeout = '5s';
revoke execute on function public.request_case_once(uuid,jsonb) from authenticated;
notify pgrst, 'reload schema';
commit;
```

This does not cancel already-running calls; coordinate a maintenance window and let in-flight work finish before assessing counts. The current app then reports a real permission failure; the legacy creator **stays owner-only**, so the freeze leaves neither RPC callable by API roles. Verify effective privileges after any later ACL changes. Do not delete business rows, erase keys, or silently fall back to the non-idempotent legacy RPC. Preserve the ledger so retries after a forward repair remain safe. Resume requires explicit reviewed restoration of **wrapper only** EXECUTE and hosted verification:

```sql
begin;
grant execute on function public.request_case_once(uuid,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
```

If installation must be removed, first freeze and verify no in-flight submissions or new dependencies. Use `DROP FUNCTION public.request_case_once(uuid,jsonb) RESTRICT` only after review; retain the ledger/helper once real requests have been accepted. If **no requests were accepted and the ledger is empty**, the owner may separately approve removal in order: wrapper, ledger, helper, each with `RESTRICT`, never `CASCADE`, inside a single transaction with the same lock timeout. Keep the legacy creator private: removal should fail visibly instead of reopening inactive-target/idempotency bypass. Catalog dependency inspection alone cannot find every dynamic function-body or application reference; inspect usages added since installation too. Restoring the exact saved prepatch legacy ACL would reopen the confirmed unsafe API and requires a separate owner decision/security review; it is not part of the recommended recovery. Do not offer an unconditional executable down migration for an unknown post-change production state.

Dropping an empty-schema repair restores the current missing-RPC failure, not working submission. Deleting/forgetting keys while accepted cases remain can create duplicates when clients retry. Removing a wrapper does not undo requests already delivered to a lawyer or notifications already read. Any case cancellation must use the separately authorized business workflow; database-wide point-in-time restoration would also discard unrelated activity and is not a narrow rollback. A backup is a recovery resource, not permission to overwrite production.

**Stop point:** this package is prepared for owner review. No remote SQL, fixture creation, deploy, push, merge or commit has been performed. Successful hosted/production submission remains unverified.
