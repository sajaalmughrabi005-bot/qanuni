# HAQ / حق — Implementation Status Ledger

> `[x]` means implemented AND verified. Current status below reflects the owner’s attached authorization to continue P0 → P1 → P2. The Phase 0 section is historical baseline evidence; its original failures are not current results. No production deployment or database mutation was performed.

## Historical Phase 0 report — 2026-10-04 (Asia/Amman)

At the Phase 0 audit boundary, the original instruction required a stop. The owner subsequently superseded that gate through the attached update and authorized continued safe implementation. Historical observations below describe the original repository.

Read AGENTS.md, CODEX_MASTER_PLAN.md and the original IMPLEMENTATION_STATUS.md completely before changes. Inspected README, package/lock/config/env example, schema and every migration, auth/session/guards, demo mode/store/dataset, AI/provider/heuristic/coverage/relevance, extraction/polyfills, data writes/hooks/mappers, citizen/lawyer/admin/marketplace/case consumers and test/helper scripts. Inventory/import/data-flow scan covered all 182 source files (18,789 lines; 46 pages); critical flows were directly reviewed. This does not claim all runtime paths were exercised. Read installed Next Server Actions and middleware guides; middleware is deprecated but supported.

## Baseline snapshot and preservation

- No project-local `.git`. Ancestor repository: C:/Users/mkz37/.git; HEAD refs/heads/master; raw-ref commit 70aec1641ea11f7214022124cd21a4656507fa57.
- Ancestor index v2 contains 3 entries, none under OneDrive/Desktop/HAQ/. This is not an established HAQ checkout. Git executable unavailable on PATH/checked installation locations: `git status --short`, branch and log commands failed. Project Git baseline/diff remains BLOCKED; obtain the actual HAQ checkout and Git. No init/reset/clean/stash/commit performed.
- SHA-256 snapshot of 225 non-generated, non-secret files captured BEFORE ledger edits: C:/Users/mkz37/AppData/Local/Temp/haq-phase0-20261004/baseline-sha256.json. At the original Phase 0 report boundary, only IMPLEMENTATION_STATUS.md had changed; 0 missing files. See the final change manifest for implementation changes.
- Node v24.19.0; npm 11.17.0; lockfile v3 (643 entries including optional platforms). Installed Next 16.3.5, React/DOM 19.2.8, TS 5.9.3, Tailwind 4.3.3, next-intl 4.14.5. `npm ls --depth=0` exit 0.
- Clean install performed in a TEMP directory using copies of package.json/package-lock.json; original installation/lockfile retained. Generated .next and TS metadata were produced by checks. Source, secrets, SQL, domain and production data unchanged.

## Verification evidence

| Check | Command actually run | Actual result / limit |
|---|---|---|
| Install | `npm ci` in temp haq-phase0-20261004/clean-install | Exit 0; 531 packages added; original workspace node_modules retained. Clean-copy build not run. npm warned 3 install scripts await allowScripts review; no approvals given. |
| Dependency tree | `npm.cmd ls --depth=0` | Exit 0. |
| Lint | `npm.cmd run lint` | Exit 1: 2 forbidden require-import errors in scripts/dev/i18n.cjs:2/3; 2 unused-variable warnings in live-authz.mjs:216/220. |
| Types | `npx.cmd --no-install tsc --noEmit` | Exit 0, local compiler. |
| Build | `npm.cmd run build` | Exit 0; compile + build TypeScript + 83 pages; middleware deprecation warning. |
| Coverage | `node scripts/dev/analysis-coverage-tests.mjs` | Exit 0; 12 passed, 0 failed. Math/prompt tests, not complete document flow. |
| Content | `node scripts/dev/meaningful-content-tests.mjs` | Exit 0; 12 passed, 0 failed. |
| Extraction (bare) | `node scripts/dev/extract-text-tests.mjs` | Exit 1 before tests: extensionless dom-matrix-polyfill module not found. |
| Extraction (documented loader) | `node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/extract-text-tests.mjs` | Exit 0; 13 passed, 0 failed. PDF Arabic Lam-Alef spelling defect documented/reproduced. |
| Relevance (bare) | `node scripts/dev/legal-relevance-classifier-tests.mjs` | Exit 1 before tests: extensionless provider module not found. |
| Relevance (documented loader) | `node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/legal-relevance-classifier-tests.mjs` | Exit 0; 7 passed, 0 failed; mocked fetch/dummy key, no real AI. |
| Authorization | `node scripts/dev/authz-tests.mjs` | Exit 0; 99 passed, 0 failed; in-memory PGlite, schema+004/005/006. Skips historical 003. |
| Smoke | `node scripts/dev/smoke.mjs` | Exit 0; 45 public policies; local DB smoke, not browser. |
| Dependency audit | `npm.cmd audit --json` | Exit 1; 5 high + 1 critical package findings. No fixes applied. |
| Additional probes | Inline Node ESM scripts (saved in audit temp dir as audit-probes.mjs/privacy-probes.mjs/timeline-probe.mjs) | Exit 0; confirmed adverse authorization/privacy/migration behaviors below. Disposable in-memory data only, NOT passing security acceptance. |
| HTTP | `npm.cmd run start -- --hostname 127.0.0.1 --port 3005` + local GET probes, redirects disabled | Locale/protected/demo route checks + open redirect reproduced. Server stopped; port 3005 no longer listening. |
| Secret scan | Private exact-key comparison against 108 .next/static files | 0 matches for actual OPENAI_API_KEY or SUPABASE_SERVICE_ROLE_KEY; no values emitted. Historical Git/remote secrecy unverified. |

143 successful existing local assertions (12+12+13+7+99). The two bare-command failures remain recorded, not converted into passes. Local tests do not prove live Supabase/OpenAI/deployment behavior.

## Architecture understood

| Area | Actual flow |
|---|---|
| UI / routing | Existing Next App Router, ar default RTL/en LTR, eight JSON namespaces per locale, Tailwind/Radix, dark/gold theme, Framer Motion, Recharts, dnd-kit; existing Zustand demo state. |
| Auth | Supabase email/password and PKCE callback/reset; middleware validates user/profile role/status/lawyer verification. SessionProvider/RoleGuard are client UX. Server session client uses RLS; server-only service client supports privileged operations. Signup citizen/lawyer only after 004. |
| Citizen | TXT browser read or PDF/DOCX extraction -> description/documents -> content/relevance gates -> AI -> clauses/analyses -> results/ask/scenario -> existing marketplace/request. Original bytes discarded; citizen_description stores text, file_url not populated. |
| Lawyer | Verification/profile, requests, lifecycle RPCs, case kanban/workspace, clients/calendar/messages/private notes/docs/fees; AI drafting/transforms; TXT/paste extraction to manual case; deterministic voice parsing. |
| Admin | Stats/system events, verification/users/reports through guarded RPCs, metadata case overview. Raw case/private tables denied in tested scenarios; timeline leak below. |
| Demo | qanuni_demo editable role cookie; browser Supabase client disabled; local Zustand mutations/bundled data. Citizen routes to sample; sessionless demo AI uses heuristics. Cookie creates no real admin session. |
| AI | Server-only OpenAI Chat Completions fetch; model env; JSON/text; 30s timeout, max 2 attempts; retries 429/5xx/network. Manual output mapping, no schemas. Jordan/untrusted-data prompt locks; failures collapse to null, operational events via service client. |
| Legal layer | legal_sources table reserves vector(1536); no ingestion/retrieval/citation validator found. Main UI/chat uses 6 static sources (all verified=false, placeholder=true), not verified legislation. No legal proposition independently verified in audit. |
| Case/marketplace | Existing /lawyers public approved/non-demo/active view, profiles/bookmarks, case-request dialog. request_case filters owned doc/clause IDs; locked lifecycle RPCs derive identity and emit events/notifications. |
| Storage/data | RLS on documents/clauses/analyses/cases/messages/notes/docs/drafts/appointments/reviews/history/bookmarks/reports/events. Private case-documents bucket, 10MB, 60s signed URLs. Avatar compression to data URL. No retained citizen source-upload path. |
| Deployment | Vercel linkage present; qanuni.site canonical unchanged. Remote revision, policies, bucket/auth settings, PDF tracing and AI connectivity unverified. |

## Branding classification — BR-01 not implemented

User-facing: ar/en common brand.name, landing how-it-works, locale metadata/OpenGraph, global not-found, README, legal-content privacy/terms product references, env-example commentary. Navbar/footer/auth/dashboard inherit common strings. AI prompts still reference QANUNI.

Preserve technical identifiers: package qanuni, qanuni_demo cookie, qanuni-theme localStorage, routes/tables/RPCs/historical migration comments. Preserve qanuni.site in metadata/robots/sitemap. Ordinary Arabic legal/legal-specialty/disclaimer words are not automatically brand names. Brand is text plus existing scale icon; no binary logo or manifest found under public.

## Historical baseline bugs / root causes — unrepaired at audit boundary

Confirmation is direct source evidence or a local reproduction, as specified. Deployed state/exploitability not established.

| ID | Priority | Root cause and evidence | Likely files |
|---|---|---|---|
| DISC-001 | P0 security | Callback concatenates unvalidated origin+next; local next=@example.com returned 307 to parsed external hostname. No code exchange or external redirect followed. safeNextPath exists but unused here; exchange errors ignored. | auth/callback/route.ts; auth/next-path.ts/actions.ts |
| DISC-002 | P0 security | Suspension checked in middleware/AI but not many RLS/RPCs. Disabled approved lawyer accepted a request; disabled citizen read/inserted documents in local probes. | schema documents policy; 004 approved-lawyer/participant helpers/policies |
| DISC-003 | P0 privacy/integrity | analyses owner policy checks user_id without parent document ownership. Foreign-document analysis insertion succeeds; definer notification reads foreign file_name and discloses it to attacker. Both reproduced locally. Full document contents were not demonstrated accessible. | schema analyses_owner_all; 004 analyses_after_insert |
| DISC-004 | P0 privacy | is_case_participant checks IDs, not rejection/access state; storage select uses it. Rejected lawyer still read synthetic case storage object locally, although contract-table policies exclude rejection. | 004 helper/case_docs_read |
| DISC-005 | P0 privacy | Private document/clarification message prefix written into event metadata; admin can read full event rows. Admin read synthetic private prefix locally. | 004 messages_after_insert/case_events_admin_read |
| DISC-006 | P0 integrity | Uploaded TXT/PDF/DOCX sliced to 20,000 chars before persistence and coverage; 24,000 server cap measures already-shortened input. Heuristic analyzes first 20 clauses yet action claims full coverage. Source traced. | citizen/analyze/new:66/82; ai/actions/engine/coverage |
| DISC-007 | P0 AI safety | Missing/malformed risks become low, confidence defaults to 70/60 or heuristic constants; malformed clauses become empty fields; null risk-category entries can throw. Types/schema cannot express unknown risk. Source confirmed. | ai/actions/engine; types/index; schema |
| DISC-008 | P0 reliability | Independent clause/analysis/status writes; final status error ignored then true returned; ready notification before status commit. No analysis-per-doc uniqueness/idempotency; cleanup deletes ignore errors. Source confirmed; live failure injection not run. | data/actions; schema; 004 analysis notification |
| DISC-009 | P0 reliability | Hooks discard query errors -> empty/zero data. Analysis/drafting/extraction/chat/scenario/case handlers lack consistent catch/finally, allowing loading to strand on rejection. Source confirmed; interactive failure injection pending. | data/hooks; auth/use-lawyer; analyze/results; drafts/new; lawyer/documents; chat/scenario/case dialogs |
| DISC-010 | P0 AI honesty | “Connected” means active account + key exists; no health request. Failed drafting/chat/scenario/extraction return heuristic success (extraction silent, others include warning); consumers lose source. Missing key also heuristic success. Contract analysis DOES return ai_unavailable on configured-provider failure. | ai/actions/provider; ai-status-indicator; AI consumers |
| DISC-011 | P0 ingestion security | Extract action lacks app authentication/rate/session, MIME/signature validation and decompression/page/time/text ceilings; extension+compressed size only. Default Next action body cap 1MB conflicts with advertised/parser 10MB. Source/docs confirmed; large HTTP upload untested. | documents/extract-text; next.config |
| DISC-012 | P0 chat | history accepted but ignored; English clause fields used as model context, all client-supplied rather than server-loaded relevant sections; legal-source arguments not sent to model. Source confirmed. | ai/actions askTheLawAction/Turn; ask panel |
| DISC-013 | P0 setup | README schema->002->003->004->005->006 fails: schema includes 003 policies; CREATE POLICY duplicates them. Local sequence failed with documents_case_lawyer_read already exists. Historical migration not idempotent; test harness skips it. | README/schema/migration003/pg-harness |
| DISC-014 | P0 baseline | CommonJS helper violates lint import rule; documented bare extraction/relevance commands fail ESM resolution without existing loader. Actual failures recorded. | i18n.cjs; ESLint config; verification documentation |
| DISC-015 | P0/P1 honesty | Citizen fixed 650ms stage loop before AI completion; lawyer fixed 70%. Demo reminder shows sent toast without local notification; demo attachment stores name only, no retained bytes/download. Source confirmed. | analyze/new; lawyer/documents; financial tracker; demo/store; data/actions |
| DISC-016 | P1 accuracy | Arabic Lam-Alef glyph order can be wrong in PDF extraction while DOCX correct; explicitly reproduced by extraction fixtures. | extractor/fixture |
| DISC-017 | P1 accessibility | Clickable dropzone/clause/demo cards lack keyboard semantics; no reduced-motion config/override found for animations. Source confirmed; browser verification pending. | upload/clause-map/demo-entry/reveal/globals |

## Missing requested functionality — separate from defects

- BR-01 rebrand absent.
- DM-01/AI-02: real input live demo AI absent; demo citizen opens sample, lawyer uses template. General draft template contains literal generated-content placeholder. Paid demo requests need validated session/limits first.
- DOC-01/OCR-01: images/OCR/scanned-PDF extraction absent. Direct PDF/DOCX citizen extraction DOES exist (README obsolete); lawyer tool only TXT/paste. No unified format-complete secure pipeline.
- LNG-01/DB-01: full-document chunking/coverage, retained source bytes and atomic/idempotent analysis absent. Lawyer AI extraction separately slices 6,000 chars, saved case story 4,000.
- RAG-01: verified ingestion, source versions/effective dates, retrieval and claim support validation absent; reserved vector column alone does not provide grounding.
- HLT-01: cards are not exact source highlights; no defensible source offsets/mapping.
- CHAT-01: model conversation history and authorized contract/source retrieval missing.
- MKT-01: marketplace CTAs exist on landing/dashboard/chat/clause dialog. Citizen sidebar /citizen/lawyers is saved lawyers, not find-lawyer directory; reuse existing /lawyers for direct link.
- PDF-01: no analysis PDF export; lawyer export is TXT.
- ANIM-01/REL-01: generic motion exists; truthful stages, reduced-motion and honest recovery incomplete.

## Suspected / unverified issues

| Concern | Evidence limit / next check |
|---|---|
| Duplicates/orphan rows/files/stale cross-document state | Independent writes/cleanup and component state need double-submit, network interruption, document-switch and identity-switch tests. |
| Appointment mutable identity/reference consistency | Broad update policy lacks some case-reference invariants; adversarial mutation tests needed before localized changes. |
| Verified-source badge | Checks placeholder rather than verified flag; all current static sources are placeholders, so no current false verified badge observed. Test mixed flags in source layer. |
| Reset redirect origin | Prefix match + forwarded-header origin needs exact-origin tests; remote Supabase allowlist unverified. Callback exploit separately confirmed. |
| PDF diagnostics/private parser messages | Tests log exception structure only; private contents not demonstrated logged. Remove/restrict temporary diagnostics after runtime tracing review. |
| Provider failure taxonomy/body timeout/quota/model access | null hides distinct causes; fetch timeout clears at headers; no real authorized connectivity/error request made. |
| Demo hydration/real transitions | HTTP shells only, no interactive session switching; current cookie cannot create Supabase identity but future paid demo must validate server session. |
| Legacy seeded demo admin accounts | Cleanup script warns of historical accounts; current remote presence unverified. No cleanup run. |

## Security and dependency findings

Positive local evidence: server-only provider/service clients; 0 actual privileged-key matches in 108 client static files; 99 tests deny self-promotion, foreign private-table access, forged identities and direct privileged writes. Demo flag creates no real admin account. These results do NOT negate confirmed authorization/privacy defects or establish remote policy state.

npm audit's six findings are package nodes, not six demonstrated reachable app exploits:

- Next 16.3.5 affected by critical [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j). Official advisory checked: requires attacker-controlled SVG passed to Node next/og ImageResponse. No ImageResponse/next/og/image-generation route found here. Installed vulnerable version confirmed; reachable exploit not demonstrated. Advisory patch starts 16.3.6; npm suggests 16.3.8. Evaluate aligned Next/eslint-config patch after approval, no major replacement.
- Five high findings propagate from [braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) through micromatch/fast-glob/@next/eslint-plugin-next/eslint-config-next (lint chain). npm suggests major downgrade to eslint-config-next 14.2.35; do not blindly downgrade Next 16 tooling. Runtime exploitability not demonstrated.
- qa-session.mjs writes real session cookies under public/__qa; unsafe if run on publicly served deployment. No QA credentials/public sessions exist locally. qa-fixtures remove deletes every qa-*@example.com account, not only a run's IDs. Both are blockers to blind credentialed QA.
- No dependency upgrade/fix, secrets rotation or production inspection performed.

## Environment / configuration versus deployment

| Variable | Local state | Unverified |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Nonempty .env.local; HTTPS URL syntax valid | Correct target/reachability. |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Nonempty non-JWT/modern shape | Authenticity; not called invalid simply because non-JWT. |
| SUPABASE_SERVICE_ROLE_KEY | Nonempty non-JWT/modern shape; server-only app client | Privilege/authenticity. |
| OPENAI_API_KEY | Nonempty; expected sk- prefix | Validity/quota/billing. |
| OPENAI_MODEL | Nonempty | Availability/access; provider default gpt-4o-mini. |

No required listed variable missing locally. No value printed. Parent-process variables absent, but Next loads .env.local as expected; this is not a configuration defect. Local tests do not load real .env values; relevance uses dummy key/mocked fetch, so system-event logging cannot reach real Supabase from those tests. Credentialed scripts explicitly load .env.local and were NOT run.

Deployment-only unknowns / requirements:

- Exact remote schema/migration 004/005/006, RLS/grants and private bucket state unverified. Schema alone is unsafe; 004 hardens signup/privileged writes.
- Correct fresh-project migration path/reapplication behavior locally before SQL deployment; historical files not blindly safe to replay.
- Supabase Site URL/confirmation/reset redirect allowlist must match approved existing domain + localhost; no remote auth setting changed.
- Deployed Node/PDF-worker tracing/polyfills, execution duration and platform body limits unverified. Local extraction does not prove Vercel behavior.
- Deployed secrets/model/project environment unverified; build/key presence is not service readiness.
- Live QA BLOCKED: no verified non-production target, run-specific accounts or safe cleanup. Real OpenAI exercise and live auth/RLS/storage remain unverified.

## Current work tracker — final local verification, 2026-10-04

Whole-task checkboxes are conservative. Local fixes with deployment dependencies remain PARTIAL. Detailed files/reasons: [CHANGED_FILES.md](docs/CHANGED_FILES.md). Complete report: [ENGINEERING_REPORT.md](docs/ENGINEERING_REPORT.md).

| Task | Status | Evidence / exact remaining work |
|---|---|---|
| AUD-01 | [ ] PARTIAL | Complete repository audit and preserved SHA-256 baseline; Git executable/actual HAQ checkout unavailable. |
| BR-01 | [x] | Visible HAQ/حق across strings/metadata/legal product references/README; bilingual browser branding and final source scan. Internal cookie/theme/package/domain and historical identifiers retained. |
| AI-01 | [ ] PARTIAL | Typed central provider, actual cached health, schemas, timeouts/transient retries; 10 provider scenarios and live requests pass. Production model/runtime/quota configuration unverified. |
| AI-02 | [ ] PARTIAL | Actual-input analysis/drafting/extraction/chat/scenarios; no heuristic success fallback. Bilingual live generation/transforms/chat pass; registered accounts and all live professional flows require staging. |
| AI-03 | [ ] PARTIAL | Untrusted-input prompts, exact allowed source quotes, bounded authorized context; representative live injection check passes, not a universal guarantee or expert legal acceptance. |
| DM-01 | [ ] PARTIAL | Signed expiring HttpOnly sessions, tamper denial, actual AI/results/file bytes/history, local requests and zero data/storage traffic observed. Distributed limiter and full admin action acceptance pending. |
| DOC-01 | [ ] PARTIAL | Shared validated PDF/DOCX/TXT/JPEG/PNG/WEBP ingestion; 10 security + 13 direct extraction tests pass. Hosted 10 MB/time limits and physical camera integration unverified. |
| OCR-01 | [ ] PARTIAL | Actual Arabic/English images and scanned PDF pass, blank rejected (4/4). Broader low-quality/mixed scans, deployment runtime and human transcription accuracy acceptance pending. |
| VAL-01 | [ ] PARTIAL | Deterministic meaningful gate, actual section relevance classification before full analysis, uncertain allowed safely, unrelated rejected. Adversarial/broad legal-document corpus acceptance unverified. |
| LNG-01 | [ ] PARTIAL | No live prefix truncation; all 24k sections up to explicit 240k cap, cross-section consolidation retains findings; 12 regression checks and 26,887-character live final-term test pass. Hosted execution/long real contracts unverified. |
| RAG-01 | [ ] PARTIAL / BLOCKED | Real 1536-dimensional embeddings/retrieval and exact quote validation for 2 visually checked annual-leave articles. Broader rental/civil/commercial coverage, current amendments/historical applicability and expert claim review require curated sources and counsel. |
| CIT-01 | [ ] PARTIAL | Simple optional-hint upload/paste, truthful stages, auto type, clear uncertainty, original/chat/export/marketplace actions; bilingual mobile/desktop browser passes. Non-technical human acceptance and real save/staging pending. |
| HLT-01 | [x] | Exact unique UTF-16 quotes only; duplicate/ambiguous/overlap fixtures excluded; bilingual mobile/desktop clicked highlight/dialog checks pass. OCR coordinates not fabricated. |
| CHAT-01 | [ ] PARTIAL | Real accounts reload RLS-scoped text/history/clauses; demo full text/history; retrieval discloses partial context. Live 317 → 634 follow-up passes. Real cross-account browser isolation requires staging. |
| MKT-01 | [x] | Citizen sidebar/result links reuse existing localized marketplace; final browser checks verify correct ar/en directory destinations. |
| MKT-02 | [ ] PARTIAL | Consent defaults unselected; isolated case request, linked summary/clauses/original and attachment download pass in both languages; local ownership/rejection tests pass. Real citizen/lawyer handoff and idempotent RPC deployment pending. |
| PDF-01 | [x] | Selected real AI result native PDF/print in ar/en, escaped text, dates/limits/sources/no private IDs; 20 assertions + 21-page English/20-page Arabic PDF final-term and visual checks; popup denial handled. Native save/cancel remains browser-controlled. |
| ANIM-01 | [x] | Subtle existing Framer scale/scan motion, truthful stages, no artificial navigation delay; subscribed reduced-motion preference and responsive interaction verified in both browser flows. |
| DB-01 | [ ] PARTIAL / BLOCKED | Additive 007/008 prepared; atomic analysis, request retry keys, owner-derived document creation, retained private originals. Local regression/storage tests 12+12 pass. No live SQL applied; staging schema/Storage API failure injection, storage/DB orphan cleanup and historical fresh-install sequence unverified. |
| SEC-01 | [ ] PARTIAL | 99 authorization + 12 security + 12 storage local checks pass; redirect/tamper/provider-failure browser checks pass; exact actual privileged secret scan has 0 matches. Deployed RLS/grants/storage/runtime/global abuse controls and historical Git secrecy unverified. |
| REL-01 | [ ] PARTIAL | Scoped queries/session/history/drafts, checked rejection recovery, truthful loading/error and stored demo operations now verified locally with adverse adapters/browser checks. Real network/Storage failure injection and registered-user acceptance require staging. |
| QA-01 | [ ] PARTIAL | Current lint, TypeScript, build and 19 safe suites pass; optional actual-React probes pass. Prior clean-copy install is historical evidence, not rerun this continuation. Current audit still reports 5 high tooling findings; bare TypeScript-script invocations require documented loader. |
| QA-02 | [ ] PARTIAL / BLOCKED | Synthetic/public live provider/OCR/RAG/long analysis and bilingual headless workflows verified. Live registered accounts/admin/cleanup/auth-email/OAuth/storage acceptance require designated owner-approved staging. |

## Historical proposed P0 implementation order

1. Obtain actual HAQ Git checkout/baseline; repair lint and test invocation documentation. Evaluate targeted security patches preserving lockfile/no major upgrade.
2. Confirmed security first: callback safe redirect, database/action suspension, parent analysis ownership, rejected-case storage revocation and admin timeline redaction. Add focused adversarial regression checks; prepare additive SQL for review without remote application.
3. BR-01 safe visible rebrand, retain domain/internal identifiers and legal-policy meaning. Master's first implementation phase; security goes ahead of it only within approved proposed sequence.
4. AI-01/02/03: truthful health/errors, schemas, unknown risk/provenance, remove fake LLM success, actual-input citizen/lawyer tools and bounded conversation context. Live verification only in designated safe environment.
5. DM-01: validated isolated server demo session, role/size/rate controls, then real AI; local functional side effects and admin isolation.
6. DOC/OCR/VAL: shared secure ingestion, compatible action/platform body limits, direct extraction then Arabic/English OCR with quality checks and uncertain relevance path.
7. LNG/DB/REL: retain full source, chunk/track coverage, atomic/idempotent persistence/cleanup, truthful processing/error/retry UI. Actual demo upload acceptance depends on this.
8. Re-run relevant + baseline checks and safe end-to-end auth/AI/case/storage workflows. Legal grounding remains unverified until RAG verified corpus exists. P1/P2 UX/highlighting/export follow P0 correctness.

## Likely modification areas (not yet changed)

- auth callback/next-path/actions, access/middleware/session as needed.
- New reviewed migration after 006 for RLS/helpers/event redaction/integrity; setup README/historical fresh-install logic as needed.
- ai/provider/actions/engine/relevance/coverage; types/index and Supabase mappers.
- documents/extract-text/polyfills where runtime evidence warrants, next.config body/runtime limits.
- data/actions/server-actions/hooks, citizen analyze/results/chat/scenario, lawyer drafts/documents, demo mode/store/session, case documents/request/timeline.
- Branding JSON, locale metadata/not-found/legal-content product references, README/env-example comments.
- Local tests/harness/invocation docs; lint config/CommonJS helper scope; package/lock only for approved patch remediation.

## Migrations / configuration changes in Phase 0

| Item | Local repository / remote changes | Next step |
|---|---|---|
| DB/migrations | None; disposable local test databases only / no remote SQL | Prepare localized reviewed migration after approval. |
| Storage/buckets | None / none | Rejected access/cleanup verification and repair. |
| Secrets/env/domain | None / none | Designated non-production target verification. |
| Legal-source ingestion | None / none | Approved RAG implementation. |
| Dependencies/config | None / none | Evaluate targeted patch updates after approval. |
| Documentation | IMPLEMENTATION_STATUS.md only | Owner reviews Phase 0; explicit implementation approval. |

## Flows actually verified

Automated local fixtures: Arabic text PDF and DOCX, empty/corrupt/unsupported/oversize failures, image-only PDF no_text_layer. Known PDF ligature defect reproduced. These are not manual UI uploads.

Local production HTTP: root 307 to /ar; ar/en public 200 with lang+dir ar/rtl, en/ltr; ar/login 200; CSP present. Anonymous citizen/admin dashboards 307 to locale login. Citizen demo dashboard 200; citizen demo accessing admin 307 to citizen dashboard; admin demo dashboard and lawyer demo drafts shell 200. Callback malicious next redirects external; safe next remains local. No redirect followed, code exchanged, login, real AI or production write. Local server stopped.

No interactive browser tool available: actual upload/demo AI, hydration, real login, citizen->lawyer handoff, signed file downloads, mobile/desktop appearance, keyboard and reduced-motion behavior remain UNVERIFIED. No live QA fixtures, admin promotion, cleanup or database mutations executed.

## Historical Phase 0 verification / blockers

- [ ] All P0 implementation and verification satisfied.
- [ ] Lint passes (baseline FAILED).
- [ ] TypeScript/build pass after future changes (baseline passed only).
- [ ] Real citizen/lawyer/demo actual-input AI verified.
- [ ] OCR/full-document coverage/atomic persistence verified.
- [ ] Verified legal citations supported by actual sources.
- [ ] Confirmed security/privacy/reliability issues resolved.
- [ ] Safe live auth/RLS/storage tests verified.
- [ ] Interactive bilingual/mobile/accessibility flows verified.

Historical next actions at Phase 0 (superseded scope; retained as audit evidence): owner explicitly approves this report/implementation scope; obtain actual HAQ Git checkout and Git executable; designate safe non-production Supabase/OpenAI test target and restricted run-specific QA cleanup; enable interactive browser verification. Locally missing credentials are NOT the blocker: their validity/remote configuration are unproven. Phase 0 establishes a documented baseline, not hackathon or production readiness. This was the original Phase 0 gate, superseded by the attached authorization below.

## Execution authorization update — 2026-10-04

The owner's attached update supersedes the Phase 0 stop gate and explicitly authorizes autonomous P0 -> P1 -> P2 implementation. Previous audit findings remain evidence, not completion claims. Continue independent tasks around external blockers. Production deployment/data changes, destructive migrations, secrets/domain/provider replacement and external-user messages remain prohibited without explicit approval. Start AI/provider/demo safeguards, then ingestion/coverage/security/reliability; update this ledger after each tested task.

## Implementation batch 1 — provider and session boundary (2026-10-04)

Latest attached request authorizes continued P0/P1/P2 implementation; the earlier Phase 0 stop gate is superseded. No production database mutation or deployment is authorized.

- PARTIAL AI-01: central provider now distinguishes configuration, authentication, quota, throttling, network/timeout, model, request, refusal and malformed-output failures. Response-body parsing stays under timeout; only transient failures retry. Schema-validated structured requests added. Logs contain operational codes only and do not write demo failures into privileged production events. Cached actual provider health probe added; wiring into consumers follows.
- Live evidence: Node loaded existing `.env.local` without printing values. A real request with fictional 317-dinar/day-9 rental terms succeeded; response contained both supplied facts (69 characters). No Supabase writes, private input, key changes or deployment.
- PARTIAL DM-01/SEC-01: new HMAC-signed, expiring HttpOnly demo session; server access rejects client-cookie-only impersonation. Entry/session rate limits and bounded memory limiter added. Demo entry now handles errors and keyboard activation. Logout removes signed session. Dedicated optional `DEMO_SESSION_SECRET` (minimum 32 characters) uses existing server-only service-role key if absent. Production multi-worker global limits remain a deployment requirement.
- Additional confirmed redirect defects repaired: callback now uses existing same-site path validator; password reset compares parsed URL origins instead of a string prefix. Invalid code exchange redirects to login.
- Verification: provider-tests 10 mocked-transport scenarios pass; session-security-tests 12 checks pass; TypeScript exit 0. These tests do not claim live demo/UI end-to-end verification.
- Files: provider.ts; auth/access.ts, auth/actions.ts; auth callback route; demo/session.ts, demo/actions.ts; ai/limits.ts; demo-entry-buttons.tsx; two new test runners. No database/storage/dependency changes in this batch.

## Implementation batch 2 — real AI consumers and ingestion (2026-10-04)

- PARTIAL AI-02/AI-03/LNG-01: legal operations now use real provider requests and never return heuristic analyses, drafts, simulations, extracted case facts or answers on failure. Inputs are bounded and role-authorized. Analysis processes every section up to an explicit 240,000-character ceiling (oversize rejects without truncation); every section must succeed before complete coverage is reported. Original exact quotes map to offsets; unmatched quotes remain unmapped. Unknown/invalid risk values become unverified; arbitrary confidence and litigation-success percentages removed. Real document chat reloads RLS-authorized original text and the caller's document-scoped history rather than trusting browser clauses/source claims. Demo history is bounded local input.
- PARTIAL DM-01: demo upload now analyzes actual input and stores actual results in isolated in-memory demo state. Static sample remains an explicitly labeled, separately selected illustration. Provider errors clear loading states in drafting/chat/scenario/help consumers.
- PARTIAL DOC-01/OCR-01: shared ingestion validates extension/MIME/size/signatures, ZIP directory expansion bounds and UTF-8. Embedded PDF/DOCX/TXT extraction precedes vision OCR for images/scans, via the existing OpenAI provider. OCR rejects incomplete/unreadable or clearly nonlegal output. Server action requires authenticated active or signed demo citizen/lawyer access. Original metadata is returned. Default server-action upload ceiling raised to 11 MB; hosting request limits are separate and still need verification. No native OCR dependency or provider replacement.
- Live evidence: fictional rental (317 dinars) -> 3 clauses, 3 exact source mappings, 100% input coverage; fictional employment (881 dinars) -> 4 clauses, 4 mappings, 100%. Two different live synthetic drafting prompts -> 1,991 and 2,507 characters with their respective supplied monetary terms preserved. No private data or Supabase writes involved.
- Verification: analysis-service-tests 11 checks pass (three sections, final-section term, exact offsets, unknown risk, limit rejection); original direct extraction regression suite 13/13 pass. TypeScript exit 0 after integrating risk states and demo results. Original extraction suite now tests the independent direct parser; action authorization/OCR need separate integration evidence. OCR accuracy and browser role flows remain unverified.
- No checklists marked complete: deployment migration, UI verification and failure-path regression work remain outstanding.

## Implementation batch 3 — database guards and transactions (2026-10-04)

- PARTIAL SEC-01/DB-01/REL-01: additive migration 007 hardens active-account authorization in RLS and SECURITY DEFINER writes, blocks requests to disabled lawyers, enforces analysis/document ownership, revokes rejected lawyers' file access, and replaces admin raw timeline access with a sanitized metadata view. Unknown risk and nullable confidence persist without invented values; exact source quotes/offset columns added.
- Atomic `finalize_document_analysis` locks the owned document, commits clauses/analysis/status together, rolls back partial failures, and returns the existing result on retry without deleting historical data. New `request_case_once` stores caller-scoped idempotency keys; changed payload under the same key is rejected. Browser adapters now use these RPCs.
- Verification: security-regression-tests 12/12 pass against disposable PGlite, including cross-user parent reference, failed later-clause rollback, double-finalize/request retries, disabled caller/target, rejected storage access, sanitized admin events, and rerunnable migration. Existing 99-test suite initially reported 98 pass/1 fail: its admin test expected unrestricted raw timeline read. That expectation was updated to require sanitized view access and denial of raw events; rerun follows. TypeScript exit 0.
- Migration not applied to live Supabase. Deployment is BLOCKED pending owner-authorized application; real account persistence on the current remote schema is not claimed verified. No production data was modified or deleted.

## P0 verification update — 2026-10-04

- Existing DB authorization suite rerun: 99/99 pass with migration 007 in disposable local DB. New ingestion suite: 9/9 pass; malformed signatures/MIME, binary TXT and oversized files rejected. Lint/tooling work underway.
- Live OCR: English contract PNG and image-only PDF both returned readable content with synthetic 317-dinar and 17-day terms; blank image was rejected. First Arabic test fixture failed because the PowerShell-to-Node pipeline encoded its Arabic text as question marks. Visual inspection confirmed the fixture error; it was recreated using UTF-8. A rerun then extracted the Arabic words and both terms correctly (157 characters). The failed fixture run is not counted as a pass.
- During this check, newly inserted Arabic UI strings affected by the same shell encoding were located and corrected; no pre-existing Arabic translations were replaced. OCR prompt now specifically requires transcription, not generic legal disclaimers.
- Next.js and matching eslint-config-next patched 16.3.5 -> 16.3.8; npm reports 5 high tooling advisories and no critical advisory. Compatible braces 3.0.4 lookup returned E404; no force-fix or major downgrade attempted. Temporary Playwright installed outside the project solely for verification; no application browser dependency added.
- Additional data-loss risk discovered and corrected: failed/uncertain analysis-save responses previously triggered document deletion. Cleanup deletion removed; input/document retained and retries reuse the pending document id, while atomic DB finalization handles a response lost after commit. Manual-case RPC now retains original text up to an explicit 240,000-character limit rather than silently slicing to 5,000.

## P0 regression gate and browser evidence — 2026-10-04

- Production build on Next 16.3.8: exit 0, 83 pages generated. Middleware deprecation warning remains. TypeScript exit 0. Latest lint rerun exit 0 after correcting CommonJS helper configuration and unused QA locals.
- Actual browser/real provider: signed HttpOnly demo entry verified; English citizen pasted synthetic rental terms -> actual result route with supplied 317 term; Arabic citizen same critical path at 390px RTL -> actual input term present. English and Arabic lawyer generation -> distinct live draft flows with supplied 317 term; Arabic 390px and English 1440px layouts had no document horizontal overflow. Demo traffic observer saw 0 Supabase REST/storage requests. Browser controls initially used two wrong English labels in the test script; corrected to actual labels before passing runs. These are test-script failures, not application passes.
- Full manual-case text verified: 18,019 synthetic characters including final term persisted in disposable Postgres. An SQL delimiter introduced while appending the replacement manual-case function caused a local parse failure; corrected and migration/security regressions rerun 12/12 pass. No migration run on production.
- P0 core locally stable enough to continue independent P1 work. Remaining P0 PARTIAL: real-account end-to-end persistence/deployed RLS; distributed public rate limits; production OCR/runtime/upload limits; complete UI provider-failure/tamper verification. These blockers are preserved and will not be converted to completion claims.

## P1 implementation underway — 2026-10-04

- Migration 008 prepares a private `citizen-documents` bucket and owner/assigned-approved-lawyer access; original metadata added without moving/deleting existing files. Upload actions validate bytes server-side and retain retry uploads. Pending wiring and regression verification; not deployed.
- Newly discovered: demo case attachments kept names only and download was disabled; actual File/blob state is being added, revoked on reset/delete. Demo request metadata now retains analysis/document/clause/date/question links. Consent defaults to no document sharing; choosing a document explicitly grants the selected lawyer access.
- Exact highlight validation excludes wrong offsets, repeated quotes and overlapping mappings. Original extracted text viewer and short-lived original download wiring underway; not yet browser verified.
- Initial Jordanian corpus: two visually checked annual-leave excerpts (Labour Law 8/1996, articles 63/64, PDF p20), Ministry of Labour-hosted Qistas republication, snapshot 2025-07-24. Hash `e56c7e246e2310dd5a75abb9a6c5136ee9ac10733cd310774b3a5cca8e1f14c5`. Source existence/text verification does NOT establish current/historical applicability or legal correctness of an AI interpretation. Retrieval combines keyword matching with real OpenAI embeddings; citations require allowed source + exact quote. Broader curated coverage and lawyer review remain PARTIAL/BLOCKED, never fabricated.
- Local DB rerun after adding 008: authorization 99/99 and security 12/12 pass. Source bucket-specific adverse checks and post-P1 UI/type/lint verification follow.

## P1 regression and P2 progress — 2026-10-04

- Source bucket adverse suite 12/12 passes; citation/highlight/context suite passes; live embeddings retrieve both annual-leave excerpts and live employment analysis produces an allowlisted clause citation. Read-only public PDF download matches the reviewed SHA-256 (811,805 bytes). Curation procedure records all four specified official sites inspected, no assumed APIs/bypassed restrictions, limited seed and human legal review requirement.
- Real browser English contract chat answers from synthetic 317-dinar rent, then correctly uses previous turn to compute 634. No Supabase REST/storage traffic. Initial browser tests used a wrong exact card accessible name and an inactive Radix tab panel selector; those script failures were corrected, not counted as application passes. OCR upload/highlight/original download assertions passed before the incorrect tab selector timed out.
- P1 build/lint/type checks passed. Safe runner initially 14/14 suites pass. Newly added demo workflow suite first failed on legacy TypeScript interface imports under plain Node strip-only execution; type-only imports were corrected and 13 assertions now pass. These were test/runtime-import issues, not observed Next UI failures.
- P2 report uses current analysis, safe escaped text, canonical source IDs, bilingual RTL/LTR layout, long-text/page-break styles, no private IDs, and native browser PDF/print dialog. Report tests: 20 assertions pass; actual browser/PDF visual checks underway. No PDF dependency added.
- Brand metadata/common/landing/README now HAQ/حق. Domain, npm/internal identifiers and generic Arabic legal terminology retained. Documentation/env example updated for required real AI, signed demo, supported ingestion, pending migrations and honest limitations.
- Newly discovered reduced-motion regression: browser matchMedia=true, but installed Framer useReducedMotion hydration retained a non-reduced initial value (`data-legal-motion=active`). Confirmed against installed library implementation; correcting subscription/hydration behavior before claiming ANIM-01 verified.
- Server-derived document creation now accepts a stable caller-owned UUID, checks retry input and preserves pending ID after failed response, avoiding duplicate creation on retry. Source-file fingerprint and synchronous submit guard added. Deployment/staging acceptance remains blocked.
- Additional authorization gap found: middleware approval gating did not itself guarantee server-action denial for pending real lawyers. Professional AI/extraction now independently check the caller's approved, non-demo lawyer record. General help/health remains available for account navigation; paid professional tools cannot rely on a hidden route.
- Archive hardening review found that declared ZIP expansion bounds alone can be lied about: installed Mammoth/JSZip validates decoded size only after decompression. Adding native bounded inflation and CRC/local-directory consistency checks before Mammoth, with forged-size regression evidence to follow.

## Additional reliability/security review — 2026-10-04

- Documented before correction: JSZip checks decoded size only after unbounded inflation; forged DOCX central-directory lengths could bypass nominal expanded-size validation. Added bounded native inflation and CRC/local-header/name checks before Mammoth. Forged-length regression and valid fixtures pass: ingestion tests 10/10. Tested on Node 24; deployment must support node:zlib.crc32 (available from Node 20.15/22.2) and bounded inflation.
- Browser verified reduced-motion still animated despite preference=true under Framer's initial hydrated state. Replaced preference reads with an SSR-safe subscribed matchMedia hook. Both locale browser flows now pass reduced-motion, uploads/OCR, exact highlights, original byte downloads, native report/PDF generation and contract chat; zero Supabase data/storage requests. English follow-up recovered previous 317 payment and answered 634.
- Documented before correction: auxiliary directory/profile/clauses/admin RPC hooks discarded errors, draft copy claimed success before clipboard promise resolved, and draft save could leave rejection unhandled. Added checked query failure states and cancellation, marketplace/admin failure presentation, checked clipboard/save recovery. Translation now specifies the opposite UI language as its output target. Verification pending final checks.
- Added per-worker ceilings for demo entry/AI/extraction as well as existing session/IP limits to constrain new-session/IP cycling. These do not replace a distributed deployment limiter. Real lawyer AI/extraction verifies approval server-side as well as active profile; no reliance on middleware alone.

## Final local verification and readiness — 2026-10-04

- Safe gate: final npm run test:safe exit 0, 15/15 suites; analysis-service retention assertion now 12 checks. 99 authz + 12 security + 12 original-storage checks pass on disposable Postgres. No live Supabase/QA fixture/admin/cleanup mutation.
- Final lint exit 0 with no errors/warnings; standalone TypeScript exit 0; latest production build exit 0, compile/types and 83 pages on Next 16.3.8. Middleware deprecation remains. Final isolated copied-lock install: npm ci --ignore-scripts exit 0, 531 packages; no root install or install-script execution in this final check.
- npm audit --json exit 1: five high tooling advisories, zero critical; no force-fix or major upgrade. Baseline critical Next advisory no longer reported after compatible patch.
- Actual live OCR 4/4; public source hash verification passes; embeddings/retrieval + employment citation passes. Live 26,887-character/two-section analysis preserves final 890-dinar/43-day term and exact offsets. Section findings retained even if consolidation omits them; representative embedded instruction did not replace analysis. This is not universal prompt-injection or legal correctness proof.
- Final bilingual citizen browser suite exits 0: actual image/OCR/analysis, exact highlight/dialog, original download, selected result report/PDF, explicit blocked-popup failure, document chat (317 then 634 follow-up), consent initially off then linked local case request and original-name attachment download. Arabic 390px/English 1440px, RTL/LTR, reduced motion and zero Supabase REST/storage traffic pass. No actual lawyer/user contacted.
- Final bilingual lawyer browser suite exits 0: generate/shorten/formal/opposite-language translation retain actual synthetic 317, denied clipboard shows error, memory draft save succeeds, no overflow or Supabase REST/storage traffic. Early unchanged-output/response-body QA assumptions and an interrupted intermediate run are not counted as passes.
- Invalid-key loopback server, process-env override only: actual provider 401 returns truthful bilingual errors, blank output, preserved instructions/re-enabled button; cookie-only server access denied. Test server stopped; .env.local untouched.
- Report assertions 20 pass; real selected-result export inspected. Native synthetic long English 21-page / Arabic 20-page PDFs preserve final marker/mixed Arabic, omit private IDs and render readable page-one images; both images visually reviewed. Exact Arabic text ordering in PDF extraction is not claimed identical.
- Final actual privileged-secret scan: 107 static bundle files + 276 non-secret workspace files, 0 matches; no values printed. Authored manifest: 82 modified baseline files + 48 new files, 0 baseline missing. Existing un-inventoried .claude files and generated next-env.d.ts excluded from authored count; preserved baseline remains unchanged. No Git operations possible.
- Additional release blocker: privacy policy still describes browser-only demo data although real demo AI/OCR calls the provider. Only name references changed. Owner/counsel approval needed for material policy update; no unauthorized policy rewrite.
- Remaining PARTIAL/BLOCKED: live migration/schema/RLS/storage and real-account handoff/administration/auth flows; historical fresh-install sequence; shared limits/host upload/function/runtime/tracing; storage/database orphan reconciliation; low-quality/mixed scan and physical camera/human acceptance; broader legal corpus/amendments/applicability/expert review; tooling advisories; actual Git checkout. Exact next actions are in docs/ENGINEERING_REPORT.md.

No production deployment, SQL/data changes, destructive migration, external-user message, domain/DNS/provider replacement, secret edit or major dependency upgrade occurred. This is a verified local implementation with documented limits, not a complete or production-ready release.

## Authorized continuation — marketplace query recovery (2026-10-04)

Re-read the attached update and authoritative project instructions. Compared all 130 authored files to the prior final hash evidence: 0 changes since the report. Original baseline and continuation snapshot preserved; Git remains unavailable. No new production/deployment authorization was provided.

Confirmed before implementation (REL-01/MKT-01): lawyer profile review fetch ignores returned errors/rejections and initially displays no reviews while loading; saved-lawyer hook discards loading/error, saved page ignores directory errors, and bookmark click ignores mutation result/rejections. These are local code defects, not staging blockers. Scope: explicit review loading/error and profile-scoped results/cancellation, bookmark state propagation and checked mutation recovery. No role/schema/privacy-policy changes. Verification pending; no additional task marked complete.

Additional source-confirmed REL-01 gaps before correction: existing-draft loading ignores query errors and can present an empty editable record; lawyer client profile/document reads and accepted-case contact reads ignore errors; client-file page also falls back to bundled demo profiles in a real session. Scope is checked reads, explicit load/failure states, response cancellation and identity-scoped displayed results. No extra data permission is granted. Registered-user runtime acceptance remains staging-dependent.

Case workspace review before correction: timeline/notes/clauses errors are discarded, and accept/reject handlers can leave busy=true after a thrown transport error. Priority/note/viewed-marker calls also ignore thrown failures. Demo contact anchors use tel/mail/WhatsApp with sample contact strings, potentially opening an external side effect; guard demo anchors and retain the existing local case-chat workflow. These are adjacent reliability/demo-isolation fixes within authorization.

## Exact-state recovery requested by owner — 2026-10-04

Read all seven current authoritative documents and the new continuation attachment. Preserved the original 225-file baseline, prior final/continuation hashes and a new 276-file non-secret recovery snapshot in the existing audit temp directory. Comparison identifies 20 changed/added files since the previous report; no implementation reset, replacement or Git operation. The interrupted provider-browser run lost its tool session when the new request arrived: it is not counted as a current pass.

Phase A current-state checks: lint exit 0; standalone TypeScript exit 0; production build exit 0, 83 pages (middleware deprecation remains); full safe runner exit 0, 16/16 suites. Current Arabic/English marketplace browser checks exit 0 (controlled review pending/503/empty, isolated bookmark save/list/unsave). Current lawyer-workspace browser checks exit 0 (missing draft, manual save/reopen, keyboard demo contacts, zero REST/storage traffic). These are current runs, not recycled historical evidence.

Additional confirmed local defects documented before implementation: generic list hooks retain the previous filter's data/loading/error on a new filter; refetch/poll results lack response-generation protection. Clause-ID and public lawyer-ID hooks have the same first-render stale-data gap. Session profile queries ignore errors/rejections and can restore an earlier identity after sign-out while its read is still pending; the loading flag can remain true on rejection. The draft editor keeps the first query-string draft ID in component state, so same-page navigation can edit the wrong existing draft. Scope: response/identity scoping, checked auth reads and truthful error/recovery, query-string synchronization, focused adverse tests. No role permissions are expanded.

No clearly designated non-production Supabase target was found in project configuration/documentation. Existing keys do not prove staging identity; no remote SQL, fixture creation or cleanup is authorized on that ambiguous target.

Additional source-confirmed data-loss risk before correction: source/case upload metadata-write errors immediately delete uploaded bytes, even when the metadata write may have committed and only its response was lost. Citizen source retries also choose random paths, increasing lost-response orphaning. Scope: stable content-derived source paths, verified duplicate-object recovery, and no destructive cleanup after uncertain metadata responses. Safe mocked actual-action regression tests will distinguish this from real Storage acceptance. Broad orphan/account cleanup remains a staging/approval dependency.

Targeted consumer review confirms remaining local REL-01/DM-01 defects: notifications, calendars, admin case list, citizen timeline/clauses, history and document-selection consumers discard query failure/loading; read-marker adapters discard mutation errors. Transition/report/calendar/finance handlers still omit rejection recovery. Financial input and fresh chat/scenario state can survive a record/identity change. Demo payment reminder and review submit still report success without a stored local operation. These findings correct the earlier over-broad reminder/reliability claim; historical evidence is retained. Scope: reuse shared error/loading UI, checked mutation results/finally, scoped component state and real in-memory demo notification/review writes. No real notification or external contact will be sent during verification.

Previously documented staging-helper risks are locally actionable: qa-fixtures removes any matching QA email instead of exact run-owned IDs; qa-session writes bearer cookies into public/__qa; the helper dotenv loops overwrite explicit staging environment variables with the ambiguous .env.local target. Preparing strict explicit staging-target gates, run-owned manifests/cleanup and private session artifacts without running credentialed helpers. A gate requires owner-designated project identity; it cannot independently establish that an arbitrary project is staging.

Final targeted results/upload review: analysis-result Promise.all has no cancellation or document/identity response key, so navigating between results can show a previous document. A suspected TXT browser-validation bypass was disproved on reachability review: BROWSER_READABLE_EXTENSIONS is already empty and every supported file uses the authenticated server action. Only its stale explanatory comment is corrected; no TXT runtime defect claimed. Scope: use the existing scoped query helper for result reads. Arabic embedded-PDF glyph ordering is not safely reconstructable; add an explicit compare/correct warning rather than guessing text. Its underlying accuracy limitation remains unverified.

Actual runtime-boundary probe failed before validation: a synthetic invalid PNG of exactly 10 MiB produces HTTP 500. Server evidence: Next middleware buffers only 10 MB by default, truncates multipart overhead and Busboy reports Unexpected end of form. The configured 11 MB Server Actions ceiling alone is insufficient. Read installed Next proxyClientMaxBodySize documentation/schema before aligning the local buffer. This is a confirmed local configuration/code defect, distinct from unverified hosting limits. Failed probe retained, not counted as a pass.

## Continuation implementation and final verification — 2026-10-04

The preceding recovery/source findings were documented before correction. Original audit evidence and failed/interrupted checks above are retained. No additional whole-task checkbox is marked complete.

### Safe local changes implemented

- Shared scoped query generation now hides earlier filter/user results immediately, drops stale overlapping/poll reads, distinguishes loading/error/empty and retains last same-scope data on failure. Public lawyer, clause, admin/stat and document-result hooks reuse it. Session reads are checked and generation-scoped; the Supabase auth callback is synchronous and defers profile queries, preventing nested auth-refresh work. Sign-out cannot restore an old pending identity; same-user token refresh preserves entered work. RoleGuard shows a load failure rather than redirecting a query failure as if signed out.
- Recovered marketplace/review/bookmark/draft/client/contact fixes remain present. Same-page draft query changes reset the editor to the requested record. Chat/scenario/message/report/request/finance state follows document/case/identity. History errors are explicit and a failed history save cannot discard a newly generated response. Calendar/notification/admin/case/document-selection reads and status/report/calendar/finance mutations now expose failures and recover busy state; final lint also caught and prompted the missing citizen case-directory error/loading rendering.
- Demo review submissions store eligible reviews and prevent repeats; demo payment reminders create actual memory notifications from persisted remaining fees. Reset clears these records and saved-lawyer keys. Missing real clients cannot fake review success. Real payment reminders independently require approved active assigned lawyers and use database title/balance, not browser-supplied monetary claims. Only controlled adapters were used; no real notification/contact occurred.
- Citizen source paths use owner/document/content hash. Identical duplicate retries verify stored bytes; changed content is rejected. Metadata response uncertainty rechecks authoritative paths and retains uploaded bytes if commit cannot be established. Case metadata uncertainty also retains bytes. Confirmed unrelated source objects alone can be removed after a verified path conflict; uncertain committed bytes are never deleted. Actual actions pass 11 adverse mock scenarios. General Storage/DB/account cleanup remains non-atomic and blocked pending staging/reconciliation decisions.
- Arabic embedded-PDF extraction exposes a compare/correct warning; no guessed glyph repair. Suspected browser TXT bypass was disproved, as recorded above. Only its stale comment changed.
- QA tools require explicit owner-designated staging reference/URL and process environment; no .env.local overwrite. Creation tracks run-owned IDs; cleanup verifies exact ID/email/run metadata. Sessions are private, ignored files outside public/. Empty-target denial tests for all three credentialed entrypoints pass without network/files. Remote creation/deletion and cleanup interruption remain unverified.
- Installed Next documentation/schema confirmed the middleware default buffer was truncating multipart uploads. Proxy buffer is now 12 MB, action parser 11 MB, file bound 10 MiB; known over-limit action requests are rejected with HTTP 413 before parsing. Actual corrupt 10 MiB files reach validation in both languages and return truthful errors with input/loading recovery, zero browser REST/storage traffic. Headerless/chunked oversize and hosted limits still require staging.
- Separate STAGING_RUNBOOK.md documents the local canonical schema + 004–008 sequence, existing-schema comparison, strict QA target, full acceptance/cleanup/runtime matrix and production gates. PRIVACY_REVIEW_DRAFT.md documents browser-only demo mismatch and proposed bilingual wording, pending owner/counsel approval; published policy remains unchanged. No additional legal sources were added or comprehensive legal coverage claimed.

### Current checks and evidence limits

- Phase A: lint, standalone TypeScript, build (83 pages), 16 safe suites and bilingual marketplace/workspace browser suites all exited 0. The lost/interrupted provider-browser run was not counted.
- Final current lint exit 0, no warnings/errors; standalone TypeScript exit 0; production build exit 0, compile/type checks and 83 pages. Next middleware convention deprecation remains; no automatic routing rewrite.
- Current safe runner: 19/19 suites pass; credential-free children, mocked provider/Storage transports, disposable PGlite. Authorization 99, security 12, private-source policy 12, direct extraction 13, ingestion 10, section analysis 12, provider 10, signed session 12, context/citations 18, report 20, demo 13; baseline coverage/content/relevance and local smoke also pass. New workflow adapters, upload recovery (11 scenarios), staging gates and persisted reminder adapters pass. Actual React query/session and workflow rejection probes pass using an external temporary React 19.2.8 renderer (deprecated; not added to application dependencies).
- Current actual provider OCR: Arabic/English image, scanned PDF and blank rejection 4/4. Current RAG: real 1536-dimensional embeddings, two public source passages and one allowlisted clause citation. Current long analysis: complete 26,887-character/two-section input, final 890-dinar/43-day term, consolidation retention, exact offsets and representative embedded-instruction resistance; not a universal injection/correctness guarantee. Public PDF read-only hash matches the reviewed 811,805-byte snapshot; currency/applicability unverified.
- Current bilingual live citizen browser, lawyer generation/transforms, provider-401/cookie-only denial, marketplace and lawyer workspace checks pass within isolated demo scope. Native long synthetic PDF: 21 English/20 Arabic pages, mixed text/final marker retained, private IDs absent. Original image bytes/download, exact highlights, selected report, chat history, consented local request, retained case attachment, RTL/LTR/mobile/reduced motion/popup/clipboard failures are browser evidence, not real-account staging or human usability acceptance. Final file/command listing and counts are in docs/CONTINUATION_REPORT.md and docs/CHANGED_FILES.md.
- Current npm audit --json exit 1: five high tooling findings, zero critical; affected braces/micromatch/fast-glob/Next lint chain. Reported automated replacement is a major-version change; no force-fix/major replacement performed. Earlier compatible package lookup failure remains historical evidence.
- Intermediate failures retained: first exact-10-MiB HTTP 500 and Next truncated multipart evidence; unbounded Playwright response.finished wait interrupted (test instrumentation), unavailable multipart postDataBuffer corrected to an oversized synthetic body with actual action headers; wrong calendar accessible label/icon selector in a controlled UI probe; lint module naming/scoped-effect/test-display-name errors and unused case-directory loader warnings corrected and retested; lawyer entry navigation timeout during concurrent demo sessions, then one unbounded response wait interrupted, followed by a bounded UI-completion/no-error rerun. Failed/interrupted attempts are not passes and limits were not weakened.

### Remaining-task classification (reviewed all PARTIAL/BLOCKED IDs)

| Item(s) | Safe local work completed | Remaining dependency |
|---|---|---|
| AUD-01 | Baseline/recovery/current manifests, exact continuation review | External Git executable and actual HAQ checkout; no fabricated Git baseline |
| AI-01/AI-02/AI-03 | Actual provider, error/retry/schema/health/input/role/injection probes | B: registered professional flows; C: broad legal correctness review; D: hosted quotas/runtime |
| DM-01 | Signed isolation, actual memory reviews/reminders/files/history, no contact | B: full real-admin contrast; D: trusted proxy and shared multi-worker quotas |
| DOC-01/OCR-01/VAL-01 | Validated actual ingestion/OCR/error/boundary checks and PDF warning | B/D: hosted sizes/timeouts; C: broad low-quality/mixed/camera accuracy acceptance |
| LNG-01 | Full sections/consolidation/live final-term evidence | B/D: hosted deadlines and long real-document acceptance using authorized synthetic staging data |
| RAG-01 | Exact source/provenance validators, actual embeddings/hash | C: broader authoritative corpus, amendments, applicability, Jordanian counsel review |
| CIT-01/CHAT-01/MKT-02 | Bilingual local loop, scoped state/history, consented memory handoff | B: registered save/history/cross-account/original handoff; C: human usability |
| DB-01/SEC-01 | Prepared 007/008, disposable RLS/atomic/idempotent checks, safe uncertain uploads, gated QA | B: real grants/Auth/Storage/expiry/migration/rerun/failure acceptance; C/D: approved reconciliation and coordinated deployment |
| REL-01 | Obvious adjacent scoped-query/loading/rejection/demo defects corrected and tested | B: actual network/Storage loss, registered-user acceptance and cleanup interruption |
| QA-01/QA-02 | Current lint/types/build/19 safe suites/React/browser/live synthetic checks | B: real auth/admin/cleanup/OAuth; C: human acceptance; external compatible tooling remediation/Git; D: production environment |

A = completed safe local engineering, B = designated staging, C = legal/human/product review, D = authorized deployment. No remaining known safe adjacent defect is being left behind merely to write the report. These are scope-bounded verification claims, not proof that every possible defect is absent. No staging identity is proven, so no remote SQL/fixtures/cleanup was run. Local five required variables exist; missing staging designation and unverified remote/runtime configuration are not missing-key code defects. Production and legal readiness remain blocked; no policy approval, secret/domain/provider change, major upgrade or production action is implied.

### Final evidence closeout

Final current-build browser reruns exited 0: citizen loop, bounded lawyer live transforms, provider-401/tamper, marketplace, lawyer workspace and upload-boundary suites. A bare workspace invocation failed alias resolution before browser execution; the documented alias-loader rerun passed. All 19 safe suites were rerun after the final case-directory rendering change and passed; actual React query/session/UI probes also reran and passed. No new application changes followed the frozen successful build. Native PDF/live OCR/RAG/long-input/source-hash checks above are current continuation runs; earlier screenshots/install evidence are explicitly historical.

Final original-baseline manifest: 165 authored files (102 modified, 63 added), 0 missing. Continuation union: 69 files, with 20 recovered interrupted files and 57 changed/added after the recovery snapshot (overlaps counted once). Exact privileged-value scan: 106 static files + 288 non-secret workspace files, 0 matches. .env.local, AGENTS.md and CODEX_MASTER_PLAN.md hashes preserved; original/prior/recovery hash snapshots retained. Current final hashes and manifest are saved separately from prior final evidence in the existing audit temp directory. Exact files/purposes and all twelve final report sections are in docs/CHANGED_FILES.md and docs/CONTINUATION_REPORT.md.

Own QA servers stopped normally with Ctrl-C; ports 3005/3006 have no listeners. No .qa-run/.qa-credentials/.qa-sessions/public QA artifacts were created. No remote migration/fixture/cleanup action, production deployment/data change, real-user notification/contact, legal-policy publication, secret/domain/provider change or major upgrade. Readiness remains LOCAL VERIFIED within tested scope, STAGING REQUIRED, LEGAL/HUMAN REVIEW REQUIRED; production readiness is not established.

Read-only tooling-remediation recheck at closeout: npm view braces version --json reports 3.0.3 (same as installed); npm view braces@3.0.4 version --json exits 1/E404. Current advisory affects <=3.0.3. No compatible patched release is established; npm audit's suggested eslint-config-next 14.x replacement would change a major version. No dependency/lock change or forced downgrade performed. These lookup results are current evidence, separately from the earlier historical E404.
