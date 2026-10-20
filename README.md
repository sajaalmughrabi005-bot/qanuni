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

Citizen: upload/paste → extract/OCR → meaningful-content check → strict legal-document classification (only LEGAL continues; NON_LEGAL/UNCERTAIN stop) → retrieve limited legal sources → analyze all sections → understand risks/obligations → review source text/highlights → ask follow-ups → existing marketplace → explicit sharing consent → case request. Reports use the selected analysis; choose Save as PDF in the browser print dialog. Allow popups for report preview.

Lawyer: verified signup → request review/acceptance → private case workspace, messages/documents/notes/fees/calendar → AI data entry and drafting, shortening, formal rewriting and translation. Admins use verification, suspension/reporting tools and aggregate/sanitized oversight, without case-private content.

## Demo isolation

Entry creates an HMAC-signed HttpOnly session (one hour) plus the qanuni_demo UI cookie. Editing that UI cookie does not authorize server AI or grant real privileges. Demo AI uses actual input and the real provider. Database/storage browser access is disabled; mutations and downloads use memory/blob files, never contact real lawyers/users. Refresh/exit loses demo work. The static sample is separately selected and labeled.

## Documents and legal safety

PDF, DOCX, TXT, JPG/JPEG, PNG and WEBP are supported locally up to 10 MB. Embedded text precedes OCR; scanned PDFs/images use existing OpenAI vision. Direct PDF extraction has a 40-page safety bound. Poor/incomplete extraction is rejected or warned. Arabic PDF ligature/font extraction varies; compare with the original. Text has an explicit 240,000-character limit and 24,000-character sections followed by consolidation. Failure never creates a complete substitute result; input is retained for retry.

Risks are unverified AI interpretations, never litigation probabilities or invented confidence percentages. The corpus contains eight selected Labour Law excerpts checked visually in a Ministry of Labour-hosted July 2025 snapshot, expanded from the original two annual-leave articles. Source text verification does not verify interpretation, current amendments or historical applicability. Uncovered rental/civil/commercial topics have insufficient legal evidence and require lawyer review. Prompts and quote validators reduce hallucination risk but cannot guarantee correctness of every generated statement.

## Start here: private team handoff

Read [TEAM_ONBOARDING](docs/TEAM_ONBOARDING.md), [TEAM_WORKFLOW](docs/TEAM_WORKFLOW.md), the [developer handoff](docs/HAQ_V2_DEVELOPER_HANDOFF.md) and [TEAM_BACKLOG](docs/TEAM_BACKLOG.md). Exact current evidence and independent GitHub/production decisions are in [TEAM_HANDOFF_READINESS](docs/TEAM_HANDOFF_READINESS.md).

Use **Node 24**, npm and the committed lockfile. In a clean clone, no secrets or environment file are needed for the isolated demo:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run lint
npx --no-install tsc --noEmit
npm run test:safe -- --no-db
node scripts/dev/citizen-findings-qa-server.mjs --build
```

The last command builds/starts **http://127.0.0.1:3015/ar** (also **/en**). Stop with Ctrl+C. It blanks Supabase/provider credentials, supplies a fictional process-only signing key and blocks external server requests. Do not use the owner's configured :3000 or copy .env.local. Installation contacts npm; the demo does not contact production Supabase or paid AI. Ignore-scripts skips dependency lifecycle scripts; no dependency/lockfile upgrade is needed.

Use the homepage citizen/lawyer/admin demo entry, citizen sample and Enterprise portfolios. Memory-only demo work resets on reload. AI/OCR actions without a provider fail honestly. Enterprise shows 3 fictional organizations/36 contracts (14/12/10), 25 employment contracts and hypothetical scenarios, not official law changes or production intake. Separate --mock helper mode is explicitly synthetic transport, not live AI.

Standalone build in a credential-free clean checkout:

```bash
npm run build
```

Use **npm run test:safe -- --no-db** during the database freeze. Omitting --no-db runs five disposable SQL suites and is not authorized. Credentialed QA/cleanup/live provider commands require separate owner approval. Optional browser/React tools and clean-checkout results are documented in onboarding/readiness; they are not application dependencies.

## Environment and real integrations

[.env.example](.env.example) contains names/empty values only, not connection configuration. Normal configured development uses npm run dev only after an isolated target and its side effects are owner-authorized. Next loads .env.local automatically; localhost does not mean staging.

- NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY: isolated project's public Auth/data configuration.
- SUPABASE_SERVICE_ROLE_KEY: privileged server-only existing operations; never put it in public variables, logs or CI.
- OPENAI_API_KEY: authorized live/demo AI, OCR and embeddings; no heuristic-success fallback.
- OPENAI_MODEL: default gpt-4o-mini; OPENAI_EMBEDDING_MODEL defaults to text-embedding-3-small with 1536 dimensions.
- DEMO_SESSION_SECRET: optional dedicated server-only secret, minimum 32 characters; the existing service-role fallback is implemented. Never deploy the fictional QA key.

Per-worker limits do not establish distributed abuse protection. Actions allow 11 MB / proxy 12 MB multipart overhead around 10 MiB files; hosted runtime/upload limits remain separate. No production environment/domain change is included.

## Database and production boundary

**Production remains NO-GO.** Owner checks confirm missing request_case_once, finalize_document_analysis, documents.original_storage_path and citizen-documents, plus account_is_active/case_submission_keys. Existing accounts, approvals and data must be preserved.

Unapproved references live outside automatic migrations: [C1](supabase/patches/case_request_wrapper.sql), [C2](supabase/patches/document_analysis_c2_candidate.sql), [C3](supabase/patches/private_originals_c3_candidate.sql), [unified read-only preflight](supabase/diagnostics/production_compatibility_20261019_single_result.sql) and [candidate checklist](docs/PRODUCTION_COMPATIBILITY_CANDIDATES.md). **Do not execute SQL during handoff, even diagnostics.** C1 stays unchanged; C2/C3 retain OWNER_REVIEW_REQUIRED/all guards.

Future approved order: recovery and isolated staging rehearsal, C1, re-preflight/review/pin C2, re-preflight/review/pin C3. Exact execution-copy approval is mandatory. Do not replay 004 or blindly execute 007-009: broader state/security/Storage effects, stronger-wrapper overwrite and prerequisite/private-helper incompatibilities make them unsafe as this narrow repair. Do not mark whole migrations applied for subsets. Database dumps do not back up Storage bytes; recover/rehearse both without assuming PITR.

Remaining: registered upload/finalization/consultation/access-control integration; lawyer-price/public directory readback; legal expert/source-currentness review; Enterprise real intake/tenant persistence/billing/monitoring; hosted runtime/distributed limits. Privacy wording needs owner/counsel approval ([draft](docs/PRIVACY_REVIEW_DRAFT.md)). Local checks do not certify production or global security. Existing domain qanuni.site and professional approval states remain unchanged.
