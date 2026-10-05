# حق / HAQ

**Understand your rights before you sign. · افهم حقك قبل ما توقّع.**

Bilingual Jordanian LegalTech: citizens understand documents and intentionally connect with lawyers; lawyers manage cases and use professional AI tools. Production readiness is not established. See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for evidence, pending migrations and blockers.

## Architecture

Next.js 16 App Router, React 19, TypeScript, Tailwind v4 and next-intl (Arabic RTL / English LTR). Supabase provides Auth, Postgres with RLS and private Storage. OpenAI calls stay server-side. Radix UI, Framer Motion, Recharts and dnd-kit are retained. The npm name, technical Qanuni identifiers and qanuni.site domain remain intentional internal/deployment identifiers.

- src/app/[locale]: public pages and citizen/lawyer/admin portals.
- src/lib/auth: active-account server authorization, auth actions and role/session providers.
- src/lib/ai: bounded provider requests, typed failures, validated output, section analysis/consolidation, legal questions/scenarios and drafting. Deterministic validation/navigation helpers are separate from AI success.
- src/lib/documents: shared validation, direct extraction, OCR, source storage, exact highlighting and report generation.
- src/lib/legal: small curated corpus, real semantic plus lexical retrieval, exact-quote citation validation. [Curation and limitations](docs/LEGAL_SOURCE_CURATION.md).
- src/lib/data: RLS queries with error states; atomic/idempotent RPC adapters.
- src/lib/demo: signed server session and isolated memory files/results/history/workflows.
- supabase/schema.sql and migrations: database security/workflow changes.
- scripts/dev: disposable local database and extraction/provider/security/report tests. Live checks are opt-in.

## User flows

Citizen: upload/paste → extract/OCR → plausibility check → classify → retrieve limited legal sources → analyze all sections → understand risks/obligations → review source text/highlights → ask follow-ups → existing marketplace → explicit sharing consent → case request. Reports use the selected analysis; choose Save as PDF in the browser print dialog. Allow popups for report preview.

Lawyer: verified signup → request review/acceptance → private case workspace, messages/documents/notes/fees/calendar → AI data entry and drafting, shortening, formal rewriting and translation. Admins use verification, suspension/reporting tools and aggregate/sanitized oversight, without case-private content.

## Demo isolation

Entry creates an HMAC-signed HttpOnly session (one hour) plus the qanuni_demo UI cookie. Editing that UI cookie does not authorize server AI or grant real privileges. Demo AI uses actual input and the real provider. Database/storage browser access is disabled; mutations and downloads use memory/blob files, never contact real lawyers/users. Refresh/exit loses demo work. The static sample is separately selected and labeled.

## Documents and legal safety

PDF, DOCX, TXT, JPG/JPEG, PNG and WEBP are supported locally up to 10 MB. Embedded text precedes OCR; scanned PDFs/images use existing OpenAI vision. Direct PDF extraction has a 40-page safety bound. Poor/incomplete extraction is rejected or warned. Arabic PDF ligature/font extraction varies; compare with the original. Text has an explicit 240,000-character limit and 24,000-character sections followed by consolidation. Failure never creates a complete substitute result; input is retained for retry.

Risks are unverified AI interpretations, never litigation probabilities or invented confidence percentages. The initial corpus has two annual-leave articles checked in a Ministry of Labour-hosted July 2025 snapshot. Source text verification does not verify interpretation, current amendments or historical applicability. Uncovered rental/civil/commercial topics have insufficient legal evidence and require lawyer review. Prompts and quote validators reduce hallucination risk but cannot guarantee correctness of every generated statement.

## Environment

Supply actual values privately using .env.example as a template; never commit secrets:

- NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for public/Auth clients.
- SUPABASE_SERVICE_ROLE_KEY: server only, existing admin operations and optional demo-signing fallback.
- OPENAI_API_KEY: required for live/demo AI and OCR. No heuristic success fallback.
- OPENAI_MODEL: default gpt-4o-mini.
- OPENAI_EMBEDDING_MODEL: optional default text-embedding-3-small; compatible model must support requested 1536 dimensions.
- DEMO_SESSION_SECRET: optional dedicated signing secret, at least 32 characters; otherwise the existing server-only service key signs demo sessions.

Per-worker limits are bounded, but distributed deployments need shared abuse/quota controls. Next's action ceiling is 11 MB and proxy buffer 12 MB to allow multipart overhead around the 10 MiB file limit. Known oversized action requests receive HTTP 413 locally; hosting request/time limits may be stricter. Verify host support before claiming production 10 MB or long-document processing. No .env.local values or production domain were changed.

## Local checks

Use Node 24 (verified environment), npm and the committed lockfile:

```bash
npm ci
npm run dev
npm run lint
npx tsc --noEmit
npm run test:safe
npm run build
```

The safe runner removes real service credentials from child environments, mocks provider transport and uses disposable PGlite. Individual TypeScript scripts require the alias loader supplied by the runner. Safe tests do not prove deployed RLS or live services.

Optional explicit checks use synthetic/public input, real provider calls and no Supabase writes:

```bash
node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/ocr-live-tests.mjs --live
node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/rag-live-tests.mjs --live
node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/verify-legal-source.mjs --network
```

Do not run credentialed helpers against an unknown/production project. The QA helpers now require explicit staging designation/reference and matching process-environment credentials, never loading .env.local. They track run-owned IDs and write private session artifacts outside public/. Follow the [staging runbook](docs/STAGING_RUNBOOK.md); no remote staging run has occurred.

Additional local React query/session and mutation-failure probes use an optional external React 19.2.8 development renderer, selected through HAQ_TEST_RENDERER; it is not an application dependency. Run scripts/dev/query-session-tests.mjs and scripts/dev/workflow-ui-tests.mjs with that variable set. The renderer is deprecated; these controlled-adapter probes do not replace real-account staging acceptance. Optional loopback Playwright scripts use HAQ_PLAYWRIGHT_MODULE and HAQ_CHROME_PATH; run live synthetic-provider suites sequentially to respect demo entry/AI limits.

## Database and deployment

No live migration/deployment performed. Review remote schema before applying SQL; do not blindly replay historical migrations. The local harness applies schema and 004–008, not every historical fresh-install sequence.

Pending additive migrations:

- 007_security_and_atomic_analysis.sql: active/approved account helpers, parent ownership, rejected-file revocation, admin event redaction, unknown risks/exact quotes, atomic analysis, request idempotency, complete manual-case text.
- 008_private_source_documents.sql: original metadata and private citizen-documents bucket/policies. Existing case-documents remains private.

Validate in owner-approved staging Supabase, then coordinate app/schema deployment. Confirm RPC grants, disabled/rejected access, signed URL expiry, cleanup and reruns. Configure Site URL/redirect allowlist for the existing approved domain and localhost; do not automatically change DNS/domain/OAuth settings. Registered-user new persistence depends on pending migrations and is not remotely verified.

Remaining: broader legal curation/expert review; production OCR/upload/function runtime; distributed rate limits; registered-user/handoff staging acceptance; actual Supabase fresh-install path; storage/DB deletion and account-deletion orphan cleanup are not a distributed transaction. No payment processor or external Bar Association integration added. Existing privacy/terms meaning is retained; the browser-only demo description is factually incomplete. A separate [privacy review draft](docs/PRIVACY_REVIEW_DRAFT.md) requires owner/counsel approval before publication.
