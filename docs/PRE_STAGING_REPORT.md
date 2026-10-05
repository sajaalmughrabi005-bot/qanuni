# HAQ / حق — scoped pre-staging report, 2026-10-05

The latest owner attachment requested focused P0 → P1 → P2 work from the existing committed state, without restarting Phase 0. Read AGENTS.md, CODEX_MASTER_PLAN.md, IMPLEMENTATION_STATUS.md and all five requested reports completely before modifying code. Relevant installed Next 16 server-action/navigation guides were read. Used the OpenAI Docs skill for the OCR-geometry investigation. Existing Next/React/Supabase/OpenAI architecture, roles, bilingual routes, private storage and signed isolated demo remain.

## 1. Signup failure root cause

Current reproducible failure is **transport before Auth**: anonymous GETs to configured Auth settings and public directory fail ENOTFOUND; independent configured-host DNS fails while Supabase/OpenAI control domains resolve. No real signup POST was sent, so the historic generic failure cannot be attributed to a deployed trigger, password policy or SMTP without staging evidence. Project deletion/pausing, wrong reference and target-specific DNS are possibilities, not proven diagnoses. Local Next action completion never established Auth success. The source previously returned raw Auth errors, logged through a privileged production event adapter, conflated conditions and lacked browser rejection/finally recovery.

## 2. Signup changes

Action stages configuration/validation/redirect/auth_signup/profile_lookup/email_confirmation/complete produce request-ID/category/code/status diagnostics without email, password, raw error/provider payload or production-event writes. Safe public codes distinguish duplicate, weak password, rate limit, unavailable configuration/service and unverifiable profile. Actual Auth user is required; confirmation-pending is distinct from an active session. Immediate-session success requires owned active profile/requested role and an owned pending lawyer row for lawyer signup. Invalid profile signs out; no synthetic success. Server validation checks actual string types and bounds. Loopback origin supports HTTP 127.0.0.1/localhost and rejects malformed origin components. UI catch/finally preserves input and recovers submit state. Real email-confirm/profile integration remains unverified remotely.

## 3. Directory failure root cause

The same configured-host ENOTFOUND prevents the request reaching PostgREST, view/RLS or mapper. Remote view existence/grants/data cannot be inferred. Adjacent source defects: query categories were discarded, captured browser client could stay null after a mode change, no hook refetch API, error/loading early returns lost the page hierarchy and retry reloaded the whole page. Malformed public data could reach unchecked string/array render paths.

## 4. Directory changes

One checked public-only lawyers_public helper handles missing configuration, transport, schema, permission, service and invalid-data errors using safe metadata; validates approved/public row shape before mapping. Lazy client creation and scoped real/demo query state preserve isolation. Refetch drives an actual retry with visible disabled retrying state. Heading/layout stay visible; localized compact loading/error, successful empty, filtered-empty and success remain distinct. No synthetic fallback in real mode. Existing profile/review and isolated demo saved-lawyer flows pass regressions.

## 5. Why random content passed

OCR's broad legal-relevance hint allowed uncertainty. The final classifier tested general plausibility of a legal matter, including informal disputes, returned boolean/null and stopped at one positive section. The action rejected false only, allowing null into expensive legal analysis. Readable names/dates/money could therefore pass without legal-instrument structure.

## 6. New document gate

Upload validation → extraction/OCR → meaningful-content check → schema-validated three-outcome classifier → **LEGAL only** → RAG/full analysis. LEGAL requires recognizable agreement/rights/obligations, notice, POA/undertaking or official legal-instrument structure and at least one exact current-section evidence quote. Generic legal words, signatures, names, dates and money are insufficient. Clear non-legal content returns not_recognized; uncertain/partial/mixed/unsupported evidence returns uncertain_document with a clear request for a complete clearer document. No full analysis starts in either case. All sections are considered until a stopping uncertainty/mixed verdict; the first positive no longer approves the whole file. Malformed/provider failure returns ai_unavailable without a substitute. Logs contain enum outcome/reason/section count, no reasoning narrative or text. Scoped hash cache is bounded. Demo and registered actions use the same gate; registered identity/context is checked server-side. General legal questions remain separate.

## 7. Accepted, rejected and uncertain examples

Actual existing provider, fresh opt-in run, **19/19 expected outcomes**:

| Outcome | Cases |
| --- | --- |
| LEGAL | Fictional Arabic employment contract; Arabic rental contract; scanned-agreement transcript; legal notice; official-decision example; actual OCR of ar.png, en.png and scanned.pdf synthetic agreements |
| NON_LEGAL | Random-photo OCR-description fixture; food receipt; social screenshot text; restaurant menu; ordinary personal message; generic invoice; random readable Arabic/English text; actual OCR of synthetic readable restaurant/menu/receipt image |
| UNCERTAIN | Blurry partial legal transcript, cropped contract, mixed-content scan transcript |

These examples test structure, not legal validity. The photo/social/unclear examples above are fictional text fixtures, not proof of every camera/photo condition. Four actual image/scan OCR cases were tested. Loopback UI independently stopped a readable unrelated image and cropped legal text, and accepted legal Arabic/English images through actual OCR/gate/RAG/analysis. These fixtures establish observed cases, not universal classifier accuracy; broader camera/adversarial acceptance remains human/staging work.

## 8. Legal sources added

Six selected employment excerpts: Labour Law 8/1996 articles **15(a), 56(a), 59(a), 61(a), 62, 65**. Existing 63/64 retained; eight total. Topics: written contract/proof, hours, consented overtime, annual-leave entitlement/splitting and sick leave. Paragraph scope and missing exceptions are explicit. No civil/rental/commercial statute text or judicial decision was invented.

## 9. Exact official provenance

Each new entry is an immutable jo-labour-8-1996-art…-20250724 ID. All use the [Ministry of Labour official-hosted PDF](https://www.mol.gov.jo/ebv4.0/root_storage/ar/eb_list_page/قانون_العمل_رقم_8_لسنة_1996_وتعديلاته_وملحقاته.pdf), an official-hosted **Qistas republication**, not original Gazette. Snapshot 2025-07-24; retrieval/check 2026-10-05; 811805 bytes; SHA-256 e56c7e246e2310dd5a75abb9a6c5136ee9ac10733cd310774b3a5cca8e1f14c5. Exact Arabic excerpts are in src/lib/legal/corpus.ts, visually checked against rendered pages, never copied from the corrupted machine text.

| New article | PDF page | Article date shown |
| --- | --- | --- |
| 15(a) | 6 | 2019-05-16 |
| 56(a) | 19 | 2004-05-16 |
| 59(a) | 19 | 2004-05-16 |
| 61(a) | 20 | 2019-05-16 |
| 62 | 20 | 2004-05-16 |
| 65 | 20 | 2019-05-16 |

Law-level date shown remains 1996-06-14. Gazette issue/publication date are null; subsequent amendments/legal status unverified; applicability requires_review. Structured title/number/year/article/instrument/publication/URL/retrieval/date/version/hash/page/exact text/verification retained. No CURRENT/VALID/UNAMENDED/APPLICABLE designation. [LEGAL_SOURCE_CURATION.md](LEGAL_SOURCE_CURATION.md) records preferred Gazette→Bureau→Justice→competent-authority hierarchy, retrieval attempts, scope and review requirements. Retrieval/citation existence does not prove a legal conclusion.

## 10. Unsupported Jordanian-law areas

Rental/lease, civil obligations, sale/service, commercial agreements, companies/business, family/criminal law, employment termination/dismissal, article-specific exceptions and later amendments remain incomplete. Official Gazette archive was reachable but no complete relevant consolidated instrument established; Bureau provided no usable exact legislation text; Justice index/service pages and DPA law list did not establish needed article text. Third-party copies were not promoted as authority. Unsupported statutory conclusions must remain unverified; explaining document wording is not verifying legality.

## 11. Analysis-result UX

Summary first, top concerns, at most three priority clauses with exact original text when defensible, plain AI explanation and why-it-matters wording; next steps/questions; legal evidence; advanced risk categories/all clauses only on demand. Retains disclaimer, unknown risk, chat/scenarios/term tools, original text/download, export, existing marketplace and case-request dialog. Directory error is localized to next-step area; corrupted Arabic loading copy removed. Final review found and documented stale two-article/page-20 export metadata before fixing it to per-source page/version/check dates and selected Labour Law scope; report regressions pass. No fabricated advice certainty, risk percentages or progress.

## 12. Image/text highlight status

Exact unique non-overlapping offset/quote mappings retained and regression/browser verified. Original bytes download remains. Current OCR contract provides text/readability/completeness/relevance, **no validated page/word geometry**. [Official OpenAI vision documentation](https://developers.openai.com/api/docs/guides/images-vision) identifies precise spatial localization limitations; requesting model coordinates would not establish trustworthy OCR geometry. No image coordinates fabricated and no provider replaced. True overlays require validated word/line boxes, page dimensions/order/rotation transforms and alignment accuracy evidence; this remains incomplete.

## 13. Homepage changes

Landing-scoped deep navy/off-white palette, restrained gold accents and navy final surface. Calmer bilingual document-understanding copy; removed free/instant/seconds promises in scoped homepage copy. Primary analyze button, secondary existing localized marketplace link, professional sign-in as a smaller separate text link. Existing brand, responsive structure, fonts, account themes and public domain preserved. Screenshots visually inspected for desktop English/mobile Arabic. Final visual review documented insufficient inherited white-on-gold CTA contrast before changing both landing analysis buttons to navy text. Actual rendered default contrast is 8.12:1 on both buttons in each language; the focused browser regression asserts at least 4.5:1 for the hero CTA in default and hover states.

## 14. Transition root cause and change

Existing scales were landing/processing animations without a persistent route observer. New pathname-keyed Framer Motion scale in root layout gives a **550 ms route-arrival cue** on actual meaningful navigation. Sibling component never wraps/remounts page content, blocks pointer events, intercepts routing or delays pages. Conservative reduced-motion hydration snapshot and no initial pulse; reduced preference yields no route pulse. Both languages verified using actual link navigation, frame samples with visible opacity and pointer-events:none, screenshots and no page/hydration errors. This is an arrival cue, not a fake progress indicator or promised pending-load percentage.

## 15. Exact files changed

**53 files: 40 modified, 13 added; no deletions.**

| File | Change | Purpose |
| --- | --- | --- |
| `IMPLEMENTATION_STATUS.md` | Modified | Current evidence, scope, provenance, staging or exact manifest |
| `README.md` | Modified | Current evidence, scope, provenance, staging or exact manifest |
| `docs/CHANGED_FILES.md` | Modified | Current evidence, scope, provenance, staging or exact manifest |
| `docs/ENGINEERING_REPORT.md` | Modified | Current evidence, scope, provenance, staging or exact manifest |
| `docs/LEGAL_SOURCE_CURATION.md` | Modified | Current evidence, scope, provenance, staging or exact manifest |
| `docs/PRE_STAGING_REPORT.md` | Added | Current evidence, scope, provenance, staging or exact manifest |
| `docs/STAGING_RUNBOOK.md` | Modified | Current evidence, scope, provenance, staging or exact manifest |
| `scripts/dev/context-and-citations-tests.mjs` | Modified | Focused verification/fixtures or affected regression harness |
| `scripts/dev/curated-source-tests.mjs` | Added | Focused verification/fixtures or affected regression harness |
| `scripts/dev/directory-tests.mjs` | Added | Focused verification/fixtures or affected regression harness |
| `scripts/dev/fixtures/legal-document-cases.mjs` | Added | Focused verification/fixtures or affected regression harness |
| `scripts/dev/legal-document-gate-live-tests.mjs` | Added | Focused verification/fixtures or affected regression harness |
| `scripts/dev/legal-document-gate-tests.mjs` | Added | Focused verification/fixtures or affected regression harness |
| `scripts/dev/marketplace-browser-tests.mjs` | Modified | Focused verification/fixtures or affected regression harness |
| `scripts/dev/pdf-browser-tests.mjs` | Modified | Focused verification/fixtures or affected regression harness |
| `scripts/dev/pg-harness.mjs` | Modified | Focused verification/fixtures or affected regression harness |
| `scripts/dev/pre-staging-browser-tests.mjs` | Added | Focused verification/fixtures or affected regression harness |
| `scripts/dev/query-session-tests.mjs` | Modified | Focused verification/fixtures or affected regression harness |
| `scripts/dev/report-tests.mjs` | Modified | Focused verification/fixtures or affected regression harness |
| `scripts/dev/run-safe-tests.mjs` | Modified | Focused verification/fixtures or affected regression harness |
| `scripts/dev/signup-tests.mjs` | Added | Focused verification/fixtures or affected regression harness |
| `scripts/dev/source-test-loader.mjs` | Modified | Focused verification/fixtures or affected regression harness |
| `src/app/[locale]/(public)/lawyers/page.tsx` | Modified | Checked public queries, scoped isolation, error/refetch states |
| `src/app/[locale]/(public)/page.tsx` | Modified | Landing palette and CTA hierarchy |
| `src/app/[locale]/(public)/signup/page.tsx` | Modified | Safe signup diagnostics, validation, session/profile and rejection recovery |
| `src/app/[locale]/citizen/analyze/[id]/page.tsx` | Modified | Summary-first result hierarchy and defensible clause details |
| `src/app/[locale]/layout.tsx` | Modified | Persistent nonblocking route-arrival scale |
| `src/app/globals.css` | Modified | Landing palette and CTA hierarchy |
| `src/components/citizen/clause-detail-dialog.tsx` | Modified | Curated provenance, exact sources and interpretation scope |
| `src/components/citizen/clause-map.tsx` | Modified | Summary-first result hierarchy and defensible clause details |
| `src/components/citizen/legal-evidence.tsx` | Modified | Curated provenance, exact sources and interpretation scope |
| `src/components/shared/data-load-error.tsx` | Modified | Checked public queries, scoped isolation, error/refetch states |
| `src/components/shared/route-scale-transition.tsx` | Added | Persistent nonblocking route-arrival scale |
| `src/lib/ai/actions.ts` | Modified | Strict pre-analysis document gate and accurate source scope |
| `src/lib/ai/analysis-service.ts` | Modified | Strict pre-analysis document gate and accurate source scope |
| `src/lib/ai/relevance.ts` | Modified | Strict pre-analysis document gate and accurate source scope |
| `src/lib/auth/actions.ts` | Modified | Safe signup diagnostics, validation, session/profile and rejection recovery |
| `src/lib/auth/signup-diagnostics.ts` | Added | Safe signup diagnostics, validation, session/profile and rejection recovery |
| `src/lib/auth/use-lawyer.ts` | Modified | Checked public queries, scoped isolation, error/refetch states |
| `src/lib/data/public-directory.ts` | Added | Checked public queries, scoped isolation, error/refetch states |
| `src/lib/data/query-failure.ts` | Added | Checked public queries, scoped isolation, error/refetch states |
| `src/lib/data/use-scoped-query.ts` | Modified | Checked public queries, scoped isolation, error/refetch states |
| `src/lib/documents/report.ts` | Modified | Curated provenance, exact sources and interpretation scope |
| `src/lib/legal/corpus.ts` | Modified | Curated provenance, exact sources and interpretation scope |
| `src/messages/ar/auth.json` | Modified | Scoped bilingual safe errors/document/homepage copy |
| `src/messages/ar/citizen.json` | Modified | Scoped bilingual safe errors/document/homepage copy |
| `src/messages/ar/landing.json` | Modified | Scoped bilingual safe errors/document/homepage copy |
| `src/messages/ar/marketplace.json` | Modified | Scoped bilingual safe errors/document/homepage copy |
| `src/messages/en/auth.json` | Modified | Scoped bilingual safe errors/document/homepage copy |
| `src/messages/en/citizen.json` | Modified | Scoped bilingual safe errors/document/homepage copy |
| `src/messages/en/landing.json` | Modified | Scoped bilingual safe errors/document/homepage copy |
| `src/messages/en/marketplace.json` | Modified | Scoped bilingual safe errors/document/homepage copy |
| `supabase/migrations/009_curated_labour_references.sql` | Added | Additive reviewed source allowlist; local SQL only |

Manifest is relative to clean baseline db5bfb50785cf3d06f4256aceaa968b5d8755fa5, on staging-prep. Old cumulative manifests in CHANGED_FILES.md remain historical. No deletion, package/lockfile change or rewrite of 007/008. Only migration change is newly prepared additive 009; no deployed database/storage change.

## 16. Exact commands and actual results

| Current command | Actual result |
| --- | --- |
| npm run lint | Exit 0 |
| npx tsc --noEmit | Exit 0 |
| npm run build | Exit 0; Next 16.3.8, 83 generated pages |
| npm run test:safe | Exit 0; 23/23 suites; real credentials stripped, disposable PGlite/controlled adapters only |
| node scripts/dev/query-session-tests.mjs | Exit 0 with HAQ_TEST_RENDERER pointing to external React 19.2.8 development renderer; actual query/hook/session isolation/recovery |
| node scripts/dev/workflow-ui-tests.mjs | Exit 0 with same external renderer; actual workflow rejection/input recovery |
| node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/verify-legal-source.mjs --network | Exit 0; fresh public PDF hash/bytes match |
| node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/legal-document-gate-live-tests.mjs --live | Exit 0; 19/19 fresh actual provider outcomes; fictional inputs; no full analysis or Supabase |
| node scripts/dev/pre-staging-browser-tests.mjs --live | Exit 0; Arabic/English desktop/mobile, actual navigation/reduced motion, controlled directory states, aborted signup recovery, live isolated OCR/gate/RAG/results/highlights/original/export/chat; zero demo Supabase requests and page errors |
| node scripts/dev/pre-staging-browser-tests.mjs | Exit 0 after the final landing-only contrast change; Arabic/English rendered default/hover contrast, primary localized login/return path, navigation/reduced motion, controlled directory states and aborted signup recovery. Earlier fresh live business-flow run preceded this two-class style change; AI/auth/directory business code is unchanged since that run. |
| node scripts/dev/browser-failure-tests.mjs | Exit 0; loopback invalid provider-key server, actual 401, retained input/no substitute/retry, unsigned demo denied |
| node scripts/dev/marketplace-browser-tests.mjs | Exit 0; controlled review loading/failure/empty and isolated demo save/unsave in both languages |
| node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/pdf-browser-tests.mjs | Exit 0; 21-page English/21-page Arabic synthetic PDFs including expanded page-6/page-19 sources; final marker, mixed readable Arabic, private IDs absent |

Browser tools are external optional Playwright/Chrome; no new app dependency. Loopback endpoints 127.0.0.1:3005/3006. Actual model/provider configuration unchanged. No credentialed live Supabase suite or real signup POST, migration/fixture/create/remove helper was executed.

Safe runner invokes alias loader for each: analysis-coverage-tests, meaningful-content-tests, extract-text-tests, legal-relevance-classifier-tests (legacy helper only; not evidence for the strict gate), authz-tests, smoke, provider-tests, session-security-tests, ingestion-tests, analysis-service-tests, security-regression-tests, source-storage-tests, context-and-citations-tests, report-tests, demo-workflow-tests, workflow-adapter-tests, upload-recovery-tests, qa-target-tests, reminder-tests, signup-tests, directory-tests, legal-document-gate-tests, curated-source-tests. New gate tests also exercise actual demo/registered action branches to prove NON_LEGAL/UNCERTAIN/provider failure cannot reach RAG/full analysis. SQL tests verify eight persisted reference IDs, ownership/disabled access/rollback/idempotency and non-destructive 009 rerun in local disposable Postgres.

Failures retained, not counted as passes: first safe run 21/22 (old fixed two-source count after expansion); initial React controlled-probe class-identity mismatch; initial browser pre-hydration timeout; second browser overly specific Arabic generated-summary numeral assertion; first live-classifier PowerShell wrapper returned 1 despite 19/19 assertions. Initial final-security helper stopped on a coverage assertion before scanning: it incorrectly required three secrets despite the optional dedicated demo secret being absent, and its name filter omitted SERVICE_ROLE_KEY. Corrected helper explicitly covers the configured provider/service-role values; fresh scan exits 0 with no matches. Corrected assertions/dependency/wait/exit handling have fresh exit-0 reruns. Final browser checks nonempty summary separately from exact document content, without requiring a generated wording. Historical failure evidence remains in IMPLEMENTATION_STATUS.md and previous reports. Warnings: Next middleware deprecation, Node loader/module type, optional React renderer deprecation. Prior high tooling dependency advisories remain unresolved; no major downgrade/upgrade introduced.

Private local temp evidence: haq-pre-staging-20261005/{baseline.json,public-readonly-probes.json,final-lint.log,final-types.log,final-build.log,final-safe.log,final-browser.log,final-browser-export.log,final-browser-contrast.log,final-gate-live.log,document-gate-live.json,final-provider-browser.log,final-marketplace.log,final-pdf-browser.log,secret-review.json,home-*.png,directory-*.png,result-*.png,labour.pdf,labour-page*.png}. These files are not staged or published. Logs do not contain user documents/provider secrets; source PDF and fixtures are public/fictional.

## 17. Staging dependencies

Confirm actual non-production project identity, correct reachable URL/public key; inspect signup/password/email/SMTP/confirmation/Site URL/callback allowlists and deployed handle_new_user/profiles/lawyers/RLS. Verify real signup/confirmation/login and approved public-directory read/retry/empty, with owner-controlled staging addresses. Compare/apply required reviewed additive 007→008→009 after verified prerequisites; never replay schema on an existing project. Verify actual pgvector/grants/storage/signed expiry/registered persistence/atomic retries and cleanup. Hosted runtime, multipart/OCR/deadline limits, trusted proxy and shared multi-worker quotas remain required. Existing variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, server-only SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, OPENAI_MODEL, optional OPENAI_EMBEDDING_MODEL, DEMO_SESSION_SECRET; no new variable introduced. Follow STAGING_RUNBOOK.md, with separate authorization for future remote changes.

## 18. Legal/human review

Jordanian lawyer must verify exact new transcriptions, paragraph scope/remaining exceptions, original Gazette evidence, amendments/repeal/currentness, historical applicability and AI interpretation/entailment. Broader official corpus is incomplete. Human Arabic/English UX/camera/poor-scan and adversarial classifier evaluation, existing unpublished privacy/legal-policy review and any OCR geometry choice remain required. No material legal policy was published.

## 19. Git and safety

Branch **staging-prep**. Baseline HEAD/main db5bfb50785cf3d06f4256aceaa968b5d8755fa5; main preserved. .env.local ignored/untracked and hash unchanged; no secret staged. AGENTS.md, CODEX_MASTER_PLAN.md, package.json, lockfile, original 007/008 unchanged. One local commit requested: **HAQ pre-staging fixes and UX hardening**. This report is included in that commit; its hash is reported in the final response and `git log -1`, without a self-referential commit-hash edit. No push/merge/deploy or remote change. Exact privileged-value and Git integrity review recorded at closeout. Own QA servers stopped normally with Ctrl-C; no unrelated process/window terminated.

Final security evidence: configured privileged values absent from **301 non-secret repository files**, **108 current client static files** and **53 actual staged blobs**. Both configured privileged keys are covered; optional dedicated demo secret is absent and the existing server-only service-role fallback applies. Exact staged manifest matches section 15, no extra unstaged/untracked files, staged diff --check exits 0, main/private-env hashes and protected baseline files preserved. Evidence: private local final-secret-review.json and staged-secret-review.json; no credentials or QA artifacts included in the commit.

## 20. Readiness

**LOCAL VERIFIED** for the scoped code and executed cases. **STAGING REQUIRED** for live Supabase/hosted integration. **LEGAL/HUMAN REVIEW REQUIRED** for legal currency/applicability/coverage and remaining acceptance. Production prerequisites are not verified. Configuration remains a real blocker; no synthetic success hides it.
