# HAQ / حق — Engineering report, 2026-10-04

**Current update (2026-10-05):** Git is now usable on staging-prep. The report below remains historical evidence. See [PRE_STAGING_REPORT.md](PRE_STAGING_REPORT.md) for current scoped root causes, verification, exact files and staging/legal blockers.

**Evidence chronology:** The eleven sections below preserve the earlier report, including its historical 130-file/15-suite counts and limitations. The latest exact-state continuation is consolidated in [CONTINUATION_REPORT.md](CONTINUATION_REPORT.md); current evidence and corrected limitations appear at the end of this document. Earlier passes are not counted as current reruns.

The owner's attached update authorized safe P0 → P1 → P2 work after the audit. This report distinguishes local implementation evidence from deployed acceptance. No production deployment, database mutation, destructive migration, domain change, secret rotation or message to a real user was performed. The complete historical audit and current task ledger are in [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md).

## 1. Architecture found

Inspected the complete repository inventory (182 original source files, 46 pages), package/lockfile/configuration, environment names, schema and migrations, AI, authentication/authorization, demo, citizen/lawyer/admin workflows, documents, marketplace, data adapters and tests. Critical flows were traced end to end; this does not claim every runtime branch was exercised.

Existing Next.js App Router, React 19, TypeScript, Tailwind v4 and next-intl preserve Arabic RTL, English LTR and dark/gold presentation. Supabase supplies Auth, Postgres/RLS and private Storage. Server-only OpenAI performs analysis, drafting, chat, extraction, OCR and embeddings. Existing Radix, Framer Motion, Recharts, dnd-kit and isolated Zustand demo state remain. The existing marketplace/case lifecycle is reused.

No project-local Git checkout or Git executable is available. The ancestor home-directory repository is unrelated to an established HAQ checkout. An untouched SHA-256 baseline preserves original non-secret files; no reset, init, stash or commit was performed. Baseline lint failed; baseline types/build/local tests passed within documented limits. Baseline dependency audit had one critical Next.js and five high tooling findings.

## 2. Confirmed root causes

The ledger contains evidence and files for every original finding DISC-001–017. These are confirmed source/local findings, not a claim of deployed exploitation.

| Original defect | Root cause / outcome |
|---|---|
| Open redirect and reset-origin weakness | Callback used unvalidated next; reset used a string prefix. Parsed same-site validation and checked exchange now applied. |
| Suspended or rejected access; foreign analysis parent; admin private-event leak | RLS/helpers omitted active/rejected state, analysis owner checks omitted parent ownership, and admins could read raw private timeline metadata. Additive migration 007 guards these boundaries; disposable database regressions pass. Live deployment remains pending. |
| Truncated input, unsupported scans, unsafe extraction | UI/server prefix slices and clause caps; extension-only checks and no bounded expansion/OCR. Shared validated direct/OCR ingestion, full sections, explicit limits and truthful failures added. |
| Fake AI results, risk/confidence/health claims | Heuristic fallback, permissive mapping, invented numeric defaults and key-presence health. Real provider operations, strict schemas, unknown risk/null confidence and actual health probes replace these paths. |
| Partial/duplicate writes and destructive failure cleanup | Independent ignored writes and deletion after uncertain responses. Atomic finalization, retry keys, stable document IDs and retained input replace them. |
| Empty-on-error/stuck-loading/history gaps | Query errors discarded; missing catch/finally; chat ignored history and trusted browser context. Checked failures/recovery and server-loaded document-scoped context added. |
| Demo bytes, progress and accessibility gaps | Attachments kept names, reminders claimed success, progress was timed and cards lacked keyboard/reduced-motion handling. Retained bytes/local notifications, truthful stages and accessible controls added. |
| Historical install and PDF extraction defects remain | The old fresh-install SQL sequence duplicates policy definitions; embedded Arabic PDF Lam-Alef extraction can reorder glyphs. These remain documented, not described as repaired. |

## 3. Changes implemented

- **AI-01/02/03, LNG-01, CHAT-01:** Typed provider errors, bounded response-body timeouts, transient retries, validated structured results and actual provider health. Legal operations process actual input; no successful heuristic substitute on error. Analysis sends every section within an explicit 240,000-character cap, consolidates findings while retaining section facts, and maps exact quotes. Conversation history and relevant sections are authorized/bounded; partial retrieval is disclosed. No invented litigation percentages or confidence scores.
- **DM-01, SEC-01:** Signed one-hour HttpOnly demo sessions; UI-cookie tampering cannot authorize paid actions. Role/session/IP/worker limits and size bounds. Real professional actions independently require approved active lawyers. Demo data/files/history and requests stay in memory; no real lawyer is contacted.
- **DOC-01, OCR-01, VAL-01:** Common server validation for PDF, DOCX, TXT, JPG/JPEG, PNG, WEBP. MIME/extension/signatures/size/UTF-8, PDF integrity, bounded DOCX expansion/CRC/local-header checks. Direct extraction precedes existing-provider vision OCR for scans/images. Unreadable/incomplete/unrelated content fails honestly; uncertain plausible legal content is allowed through classification. Camera capture uses the file input where supported.
- **DB-01, REL-01, MKT-02:** Owner-derived document creation, atomic/idempotent analysis RPC and caller-scoped case-request retry keys. Original bytes retained privately. Explicit consent defaults to no document sharing. Assigned lawyers can view authorized original/analysis links; disabled/rejected access is revoked by prepared SQL. Checked query failures, loading recovery and preserved retry input added.
- **RAG-01:** Two annual-leave articles visually checked against a Ministry of Labour-hosted July 2025 PDF, with snapshot/hash/version/verification metadata. Real 1536-dimensional embeddings and lexical retrieval; exact source-ID/quote validation. Broader topics, amendments, legal entailment and historical applicability remain unverified. See [source curation requirements](LEGAL_SOURCE_CURATION.md).
- **CIT-01, HLT-01, MKT-01:** Simple upload/paste with optional hint and automatic classification; exact unique source highlights, contextual detail and uncertainty; original download, real follow-up chat and existing localized marketplace links.
- **BR-01, PDF-01, ANIM-01:** HAQ/حق visible strings, metadata, README and product references; technical identifiers/domain retained. Selected-result native PDF/print export with escaped text, RTL/LTR, source limits and no private IDs. Existing Framer scale/scan animation with truthful stages and subscribed reduced-motion preference.

Whole-task completions are deliberately limited to BR-01, HLT-01, MKT-01, PDF-01 and ANIM-01. Other task IDs retain PARTIAL/BLOCKED status and exact remaining acceptance requirements.

## 4. Files changed

[CHANGED_FILES.md](CHANGED_FILES.md) lists every meaningful modified/added file with its purpose, using the Phase 0 hash comparison. There are 82 modified baseline files and 48 newly authored files; zero baseline files are missing. Most additions are focused helpers, additive SQL and verification scripts/fixtures. Existing hidden .claude files and generated next-env.d.ts were not authored changes and are identified separately.

Application dependencies were not added or removed. Next.js and matching eslint-config-next received the compatible patch 16.3.5 → 16.3.8. No framework/provider/database replacement or major-version upgrade. Temporary Playwright lives outside the repository, solely for headless verification. Existing .env.local, AGENTS.md, CODEX_MASTER_PLAN.md and production domain settings were preserved.

## 5. Database/storage/config changes

Prepared, **not applied remotely**:

- [007_security_and_atomic_analysis.sql](../supabase/migrations/007_security_and_atomic_analysis.sql): Active/approved helpers, restrictive policies and sensitive-write guards; foreign-parent denial; rejected file revocation; sanitized admin timeline view; unknown risk/null confidence/exact quotes; stable legal-reference IDs; atomic finalize_document_analysis and request_case_once; complete manual-case text.
- [008_private_source_documents.sql](../supabase/migrations/008_private_source_documents.sql): Original metadata and private citizen-documents bucket with 10 MB/MIME limits, owner upload/delete and authorized assigned-lawyer read. Existing case-documents stays private; WEBP support prepared.

Next Server Actions body ceiling is 11 MB; host limits can be lower. Current validation/native CRC was tested with Node 24. Server runtime/platform compatibility must be confirmed.

Existing required configuration: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, OPENAI_MODEL. All five existed locally with valid syntax; actual OpenAI calls succeeded. Remote Supabase configuration/current schema are unverified, not missing-key code defects. Optional DEMO_SESSION_SECRET (at least 32 characters; existing server-only service key fallback) and OPENAI_EMBEDDING_MODEL (default text-embedding-3-small, 1536 dimensions) documented in .env.example. No local secret was changed or printed.

## 6. Verification evidence

| Command/check actually executed | Final actual result |
|---|---|
| Clean-copy npm ci --ignore-scripts | Exit 0; 531 packages; package/lock copied into an isolated temp directory, no production credentials. Install scripts deliberately not executed in this final copy. |
| npm run lint | Exit 0, no final warnings/errors. |
| npx --no-install tsc --noEmit | Exit 0. |
| npm run build | Exit 0; Next 16.3.8, compile/type checks, 83 pages. Middleware deprecation warning remains. |
| npm run test:safe | Exit 0; 15/15 suites. Includes baseline coverage 12, content 12, direct extraction 13, legacy relevance 7, authz 99; provider 10, sessions 12, ingestion 10, analysis 12, security 12, storage 12, context/citations 18, report 20, demo 13, and local database smoke (59 public policies). Transport tests are mocked; DB is disposable PGlite. |
| ocr-live-tests.mjs --live with alias loader | Exit 0, 4/4: Arabic/English image, scanned PDF and blank rejection; fictional input. |
| rag-live-tests.mjs --live with alias loader | Exit 0; actual embeddings and employment analysis, 2 retrieved excerpts and 1 allowlisted clause citation in recorded run; applicability not verified. |
| long-analysis-live-tests.mjs --live with alias loader | Exit 0; 26,887 characters / 2 sections, final 890/43 term, retained consolidation and exact offsets; representative injected instruction did not replace analysis. |
| verify-legal-source.mjs --network with alias loader | Exit 0; public PDF 811,805 bytes, expected SHA-256 matched. No corpus auto-publication. |
| browser-live-tests.mjs --live | Exit 0, English 1440px / Arabic 390px: actual OCR/analysis/highlight/original/report/chat/case handoff/attachment and popup failure, reduced-motion/layout, no Supabase REST/storage requests; callback external redirect blocked. |
| lawyer-browser-live-tests.mjs --live | Exit 0 in both locales: live draft, shorten, formal, opposite-language translation retain 317; clipboard denial truthful, isolated save, layout, zero Supabase REST/storage traffic. |
| browser-failure-tests.mjs | Exit 0 in both locales against local process-only invalid key: actual 401, empty output, retained input/button recovery; client-cookie-only server authorization denied. .env.local untouched. |
| pdf-browser-tests.mjs with alias loader | Exit 0; native 21-page English / 20-page Arabic synthetic reports, final marker/317/mixed Arabic/private-ID checks, rendered first-page screenshots visually inspected. |
| Final exact privileged-secret scan | 0 matches in 107 .next/static files and 276 non-secret workspace files; values never emitted. Historical Git/remote logs not proven. |
| npm audit --json | Exit 1; 5 high tooling findings, 0 critical. braces/micromatch/fast-glob/Next lint chain. Compatible braces 3.0.4 lookup returned E404; no force-fix/major replacement. |

Recorded failures remain visible: baseline lint and bare ESM runner errors; original adverse authorization probes; an Arabic fixture initially encoded as question marks; intermediate SQL delimiter/TypeScript parsing/state-declaration mistakes corrected and retested; long-test refund field assumption broadened to all material fields; PDF exact Arabic extraction assertion corrected for PDF text ordering; browser wrong-label/response-body/unchanged-output instrumentation failures corrected. Failed/interrupted runs are not counted as passes. Old helper coverage/relevance tests do not by themselves prove current live analysis; dedicated/live checks provide that evidence.

## 7. Manual scenarios verified

Headless browser interaction with real provider and fictional/public input exercised both language directions and mobile/desktop layouts. Visual review covered Arabic OCR fixture, report HTML and rendered multi-page PDF first pages. Original image bytes and case attachment names were retained/downloaded. English chat answered 317, then 634 from prior context. Case consent started unselected, explicitly linked the document, retained the request/attachment locally and made no real contact. Provider denial, cookie tampering, clipboard denial and blocked popup surfaced truthful failure paths.

This is automated browser/visual evidence, not a human non-technical user study. No real account login, auth email, OAuth, remote case acceptance, remote signed-URL expiry or physical phone camera was verified. Demo admin traffic/isolation was inspected and exercised without real privileged access; comprehensive real admin acceptance requires staging.

## 8. Discovered issues

In addition to baseline defects, documented and corrected: unbounded inflation despite forged ZIP size declarations; pending-lawyer actions relying on middleware; signed demo cookie surviving client-only logout; uncertain save responses deleting documents; duplicate document creation on retry; Framer reduced-motion hydration state; clipboard success before completion; auxiliary queries hiding errors; translation lacking explicit target; consolidation potentially discarding section facts; demo attachments opening a preview rather than downloading under their original name. Local fixes and relevant tests are in the ledger.

The existing privacy policy's browser-only demo description is now incomplete because demo AI/OCR processes actual input through the server/provider. Only product-name references were changed; material legal-policy edits are prohibited without owner/counsel approval. This factual policy mismatch must be reviewed before public release. Existing Arabic embedded-PDF ligature issue and historical fresh-install SQL duplication remain.

## 9. Blocked/unverified items

- **Git:** Actual HAQ checkout/normal diff/branch history unavailable; restore the project checkout and install/provide Git before reviewing/committing.
- **Remote persistence/security:** No designated safe staging target or approval to mutate production. Apply/review pending migrations in staging and run scoped temporary-account/live authorization/storage tests before release. Do not run existing fixture/admin/cleanup scripts blindly.
- **Deployment-only:** Shared multi-worker quotas, trusted proxy/IP handling, provider budget, function timeouts, 10 MB request handling, PDF tracing and Node runtime unverified. Per-worker limits are not a distributed quota.
- **Legal grounding:** Seed corpus covers annual leave only. Rental/civil/commercial coverage, up-to-date amendments, historical applicability, claim entailment and Jordanian counsel acceptance require source curation and legal review. A valid source quote does not prove every associated interpretation.
- **Data integrity limits:** Postgres atomicity does not make Storage API + database deletion transactional. Lost-response uploads/account deletion can leave orphaned bytes; staging failure injection and an approved reconciliation/cleanup design remain. No broad deletion/cleanup was attempted.
- **Remaining reliability/QA:** Historical fresh-install path, broader/mixed low-quality scan accuracy, physical camera, auxiliary review queries, real auth/admin/citizen-lawyer handoff and human usability acceptance remain unverified. Five high tooling advisories remain; no hidden pass or broad upgrade.

## 10. Deployment checklist

1. Obtain the actual Git checkout; review the hash/file manifest and all local changes. Preserve unrelated work and secrets.
2. Designate non-production Supabase and safe run-specific QA accounts/cleanup. Compare its current schema; do not blindly replay historical migrations.
3. After explicit deployment/database authorization, test 007/008 in staging, RPC grants, reruns, active/approved/rejected boundaries, admin redaction, storage privacy/expiry, atomic retries, original files and cleanup failure paths.
4. Verify Node/runtime/tracing, platform request/body/time limits, model/vision/embedding access, secret placement and shared quotas. Set a dedicated demo-signing secret if chosen; no rotation performed here.
5. Complete broader verified-source/counsel and material privacy-policy review. Run human Arabic/English/mobile acceptance and real auth/case/storage flows.
6. Re-run lint, types, safe tests/build and appropriate scoped staging checks. Coordinate schema/application release only after approval. Keep qanuni.site, DNS/canonical/OAuth settings unchanged unless separately authorized.

## 11. Final readiness statement

Local implementation and the executed safe/live-synthetic checks pass within the stated scope. **The project is not fully complete or production-ready.** PARTIAL/BLOCKED tasks remain, primarily deployed schema/RLS/storage/runtime acceptance, legal-source scope/review, policy review and real-user QA. Local QA servers started for this task were stopped. No deployment occurred; the remaining work requires the owner-designated environment or explicit higher-risk/product-policy authorization described above.

## Exact-state continuation evidence — 2026-10-04

The latest attachment authorized recovery of the interrupted continuation and completion of safe adjacent work. All seven required documents were read before further edits. Original 225-file baseline and prior 130-file final hashes remain preserved; recovery captured 276 non-secret files and identified 20 interrupted changes. No resets/replacements/Git operations. The recovery and final command results, failures, manual/browser limits and twelve requested reporting sections are consolidated in [CONTINUATION_REPORT.md](CONTINUATION_REPORT.md).

Current authored manifest: **165 files (102 modified, 63 added), zero original files missing**. Exact continuation union: **69 files**, consisting of 20 recovered files and 57 changed/added after recovery, with overlaps counted once. [CHANGED_FILES.md](CHANGED_FILES.md) lists each interval/path/purpose and every original-baseline difference. This supersedes the earlier 82/48 counts without erasing the earlier snapshot.

Additional confirmed roots were documented before correction: old filter/identity reads and out-of-order refetches; stale sign-out/session profile responses and async auth callbacks; same-page draft ID state; discarded auxiliary/history read errors and rejection recovery; metadata-error deletion of potentially committed upload bytes; fake demo review/reminder success; browser-supplied reminder amount/title; credentialed QA target overrides/broad cleanup/public bearer sessions; Next's 10 MB middleware buffer truncating a 10 MiB multipart file. Shared scoped queries, synchronous checked session lifecycle, record-keyed consumers, explicit loading/error/finally, stored demo operations, persisted-value authorized reminders, byte-verified stable source retries, non-destructive uncertainty handling, strict QA gates/private artifacts and 12 MB proxy/11 MB action limits address those local paths. Arabic PDF warning is a mitigation; no glyph reconstruction claim. Suspected TXT bypass was disproved.

**Current verification:** final lint zero errors/warnings, standalone TypeScript exit 0, production build exit 0 (83 pages), full safe runner 19/19, optional actual-React query/session/mutation probes exit 0. Bilingual current-build marketplace, draft/workspace, upload-boundary, citizen live OCR/analysis/chat/local handoff and lawyer live transforms pass. Actual invalid-key provider 401 and cookie-only denial recover truthfully. OCR 4/4, real embeddings/allowlisted citation, full 26,887-character/two-section analysis and public 811,805-byte hash check pass. Native synthetic PDFs retain final text over 21 English/20 Arabic pages. Exact privileged-value scan: **106 static files + 288 non-secret workspace files, zero matches**; .env.local and both authoritative contracts preserved. Current npm audit exits 1: five high tooling findings, zero critical. External renderer is deprecated and optional; no app dependency added. No new clean-install pass claimed.

Failures remain recorded: initial 10 MiB HTTP 500, incorrect controlled-test selector, intermediate lint issues, an entry timeout while sharing demo limits, unbounded Playwright completion waits interrupted, null multipart test payload, and bare workspace invocation lacking the alias loader. Corrected reruns passed; failed/interrupted attempts are not passes. Browser suites were sequenced rather than weakening rate limits. Next middleware deprecation and Node loader warnings remain.

Local query/review reliability and QA-helper defects are no longer deferred merely to staging. Remaining **STAGING REQUIRED** work is actual Supabase schema/grants/Auth/Storage/signed expiry/registered persistence/atomic retry/failure/cleanup and intended host runtime/shared quotas/proxy. Existing 007/008 unchanged and not remotely applied. Local schema + 004–008 sequence documented, actual Supabase fresh path pending. Storage/DB/account deletion is not atomic and uncertain objects can remain; no broad reconciler/delete was introduced. Git executable/genuine checkout and compatible tooling remediation remain external dependencies.

**LEGAL/HUMAN REVIEW REQUIRED:** source coverage remains two annual-leave articles with unverified amendments/applicability/AI entailment; broader corpus and human Arabic/English/poor-scan/camera acceptance pending. The separate [privacy draft](PRIVACY_REVIEW_DRAFT.md) documents the factual browser-only mismatch and proposed bilingual copy, without publishing material policy changes. Follow the [staging runbook](STAGING_RUNBOOK.md) and the consolidated production checklist only after target proof/required authorization. No production action, real-user contact, secret/domain/provider change or major upgrade. Whole-task completions remain limited to the previously verified five IDs.
# Current scoped continuation — 2026-10-05

The latest owner request narrows work to pre-staging signup, directory, legal-document classification, source reliability, result UX, homepage and navigation fixes. Git is now usable on staging-prep. The earlier report above remains historical evidence. Current root causes, changes, exact file manifest, executed verification, failures/reruns and staging/legal blockers are in [PRE_STAGING_REPORT.md](PRE_STAGING_REPORT.md). No production deployment, remote SQL/write, domain/provider change or major dependency upgrade was performed.
