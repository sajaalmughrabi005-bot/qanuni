# Staging verification runbook — 2026-10-04

**STAGING REQUIRED.** None of these credentialed steps was executed in this continuation. Existing local credentials do not establish a non-production identity. Obtain owner confirmation of the project reference and inspect its dashboard/environment designation before supplying credentials. Setting a variable alone is not proof. Never substitute the production project.

## 1. Preserve and compare

Recover the actual HAQ Git checkout, review [CHANGED_FILES.md](CHANGED_FILES.md), and preserve the current schema/configuration and a recoverable staging snapshot. Compare existing tables, functions, grants, policies, buckets and applied migrations before choosing SQL. Keep production domain/DNS/OAuth settings unchanged.

For an **empty disposable project only**, the locally tested canonical sequence is `supabase/schema.sql`, then migrations `004`, `005`, `006`, `007`, `008` in that order. The schema already incorporates older changes; do not append `002`/`003` blindly (duplicate policies are a reproduced historical setup defect). PGlite replaces vector columns and models Auth/Storage, so this sequence still needs actual Supabase/pgvector/extension verification. Do not replay the schema on an existing project. Existing projects need a schema comparison and the applicable additive migrations, normally 007 then 008 after verified prerequisites. Neither prepared migration was recreated or remotely applied here.

Apply reviewed SQL only to the confirmed staging project. Capture each result; rerun 007/008 there and inspect grants/policies/functions again. A failed statement is a failure, not an accepted partial application. Do not disable RLS or make a bucket public.

## 2. Explicit target and private QA artifacts

Supply these variables privately in the process environment, without logging values:

- `HAQ_QA_ENVIRONMENT=staging`
- `HAQ_QA_PROJECT_REF=<owner-confirmed project reference>`
- `NEXT_PUBLIC_SUPABASE_URL=https://<same-reference>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging public key>`
- `SUPABASE_SERVICE_ROLE_KEY=<staging server key>`
- For the staging application: `OPENAI_API_KEY`, `OPENAI_MODEL`; optional `OPENAI_EMBEDDING_MODEL` (1536 dimensions) and `DEMO_SESSION_SECRET` (at least 32 characters).

The credentialed helpers do not load `.env.local` or override the explicit target. In a restricted checkout, run individually and inspect the exit status before the next command:

```bash
node scripts/dev/qa-fixtures.mjs create
node scripts/dev/live-authz.mjs
node scripts/dev/qa-session.mjs
```

Creation uses synthetic `example.com` identities and confirms them directly without sending auth email. It records exact account IDs/emails/run ownership in `.qa-run.json` and credentials in `.qa-credentials.json`; existing artifacts are never overwritten by a new run. Sessions are private `.qa-sessions/<runId>/<role>.json` cookie-name/value pairs; load them locally into a browser context for the staging application, never through a public route. These files are ignored but contain bearer credentials; enforce filesystem ACLs on Windows and delete them after verified cleanup. Test real auth email/OAuth separately using owner-controlled test addresses and approved redirect settings.

## 3. Acceptance matrix — all still unverified remotely

| Boundary | Required staging evidence |
|---|---|
| Identity/status | Registered citizen, approved/pending/rejected lawyer, admin, anonymous, disabled citizen/lawyer. Verify direct requests/RPCs as well as page guards. Pending professional AI/extraction must fail independently of middleware. |
| Ownership/RLS | Citizen A cannot read/update B's documents, analyses, history or original objects; foreign analysis parent denied; no browser identity grants access. Check actual grants, not only returned empty lists. |
| Admin privacy | Aggregate/sanitized metadata works; raw private events/messages/notes/originals remain inaccessible. Demo admin never obtains real admin access. |
| Atomic analysis | Deliberately invalid later clause rolls back clauses, analysis and status; concurrent/double finalization returns one committed result; lost response and retry preserve complete coverage and source provenance. |
| Requests/consent | Sharing starts off; explicit sharing reaches only the chosen lawyer. `request_case_once` repeated/concurrent key yields one request; changed payload under the same key fails. Accept/reject and reload as both real participants. |
| Private Storage | Both buckets private; cross-owner upload/read/delete denied; approved assigned lawyer can read only authorized originals; rejection/disable revokes access. Compare original filename/MIME/size/bytes, download and signed-URL expiry. An already-issued signed URL may remain usable until expiry; measure that separately. |
| Failure recovery | Inject upload denial, metadata failure before commit, response loss after commit, duplicate object conflict, route/user changes while reads are pending, dropped connection and expired session. Matching citizen-source retries must recover without overwriting/deleting referenced bytes. |
| Cleanup | Run-owned account deletion/cascades, original and case bytes, interrupted cleanup, unavailable Storage and lost delete response. Record retained/orphaned objects explicitly. Storage + database deletion is not atomic; no general automatic reconciler has been deployed. |
| UI | Registered-user analysis save/reopen, chat isolation, draft reopen, review eligibility/duplicates, bookmarks, notification read errors, financial reminder from persisted balance, calendars, admin decisions and account suspension. No real lawyer/user contact. |

`live-authz.mjs` is an existing regression subset, not an implementation of the entire matrix. Passing it does not complete new 007/008, Storage API, lost-response or browser acceptance. Add scoped staging probes for missing matrix rows after the target is established.

## 4. Cleanup and failure limits

After inspecting the run manifest and its staging identity:

```bash
node scripts/dev/qa-fixtures.mjs remove
```

The helper checks each exact ID against the recorded email and `haq_qa_run` metadata before deletion; it does not enumerate/delete matching email prefixes or unrelated messages. A failed lookup/delete leaves the manifest for investigation. A deletion whose success response is lost can require manual confirmation of that exact ID before recovering the manifest. Account creation whose response is lost before an ID is returned also requires dashboard review of the exact run tag; no broad cleanup fallback is provided. Do not delete unrelated accounts/files to make cleanup pass. Confirm remaining Storage objects separately; account deletion is not proof of byte deletion.

## 5. Runtime and production gates

Use the intended host/Node runtime (local Node 24 verified). Confirm `node:zlib.crc32`, bounded inflation, PDF external package tracing and OCR/image handling. Test a 10 MiB file plus multipart overhead: local proxy buffer is 12 MB, action parser 11 MB, file validator 10 MiB. Verify hosted limits, headerless/chunked oversized requests, OCR and long-analysis deadlines; local HTTP success does not establish hosting support.

Verify actual model/vision/1536-dimension embedding access and budget, transient retry/timeout behavior, shared multi-worker quotas and trusted proxy/IP headers. Per-process quotas are not distributed controls. Complete privacy/counsel/source review and human Arabic/English/mobile/camera acceptance, then rerun lint, types, build, all safe suites and scoped staging checks. Production SQL/deployment requires separate explicit authorization and coordinated schema/application release. Preserve `qanuni.site` and existing technical identifiers.
