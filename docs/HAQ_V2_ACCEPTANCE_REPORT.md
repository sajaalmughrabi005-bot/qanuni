# HAQ V2 remaining acceptance — 2026-10-12, Asia/Amman

## Scope and actual implementation

Baseline `1f96a692f2bb6f087fc6b57047d7d91481773efe`, staging-prep. Citizen findings/result/source-viewer/localizations from that commit are hash-protected and unchanged. Current work addresses all six requested independent tasks; it does not certify a production integration.

1. **Upload trace/recovery:** inspected file metadata/signature/size, authenticated extraction/OCR, draft creation, private-original storage, authorized actual-text gate/RAG/analysis, atomic finalizer and scoped result reads. The nullable/boolean adapters erased failures; the page converted source exceptions to one generic toast. Added detailed compatible helpers, bounded schema/access categories and persistent stage-specific errors, retained text/file/draft retry identity, and rejected empty finalizer return as unconfirmed. Original storage compensation/authorization/AI/extraction contracts remain unchanged. Existing human OCR/PDF corrections remain allowed with an edited-text notice and optional file detach.
2. **QA Enterprise portfolios:** integrated a validated snapshot of the existing owner dataset and byte-identical fictional PDFs. Three browsable organization portfolios, ID/title search, original PDF links, metadata/topic details, computed metrics and six existing-engine impact scenarios. The owner qa-fixtures directory is not modified or committed. No production seed or tenant repository.
3. **Enterprise presentation:** professional workspace hierarchy, organization cards, contract register and impact controls. One prominent demonstration disclaimer; impact/trace/limitations are native disclosures, preserving material evidence limits. No automatic compliance decisions, official legislation or lawyer assignment.
4. **Consultation-price edit:** found existing `lawyers.consultation_price numeric(10,2)` and migration 004 owner policy/column grant; no additional schema is needed on a correctly deployed baseline. A dedicated price-only server action uses active lawyer identity, ID/profile/non-demo filters and session RLS, writes only the price, and requires a matching returned row. Decimal validation preserves the existing 0–10000 JOD ceiling; empty input cannot silently become zero. Price editor retains rejected input, recovers busy state and separates fees from unrelated profile updates. Demo changes existing own-lawyer memory only and resets on reload.
5. **Consultation recovery:** key generation moved inside try/finally, synchronous duplicate-click guard, inline schema/auth/idempotency failure, retained input/key, empty case ID treated as unconfirmed. Real adapter uses only `request_case_once`; no legacy RPC/client insert/SQL/repair change.
6. **Inquiry UX:** explicit fictional example, associated inline field errors, consent remains unchecked until the user acknowledges, conditional phone recovery and clear-on-disable/reset. Remains local validation only: no submit/save/contact transport or fabricated success.

## Counts derived from actual data

| Item | Actual value |
|---|---:|
| Fictional organizations | 3 |
| Contracts / copied source PDFs | 36 |
| ORG-001 / ORG-002 / ORG-003 | 14 / 12 / 10 |
| Employment / other contracts | 25 / 11 |
| Fixture topic markers | 100 |
| Review / clarification / ordinary fixture expectations | 11 / 24 / 65 |
| Each of four mapped-topic scenarios, all portfolios | 25 affected contracts / 25 topic mappings |
| Completed professional reviews | 0 |

Expected topic flags are lexical QA expectations, never verified legal risks, AI analyses or original clause quotations. Working-hours/wage/leave/termination relationships and before/proposed versions are explicitly hypothetical. Other contracts do not acquire invented legal mappings. Organization impact counts are computed from that organization's flagged records, not hardcoded target totals. Source metadata digest and 36 PDF SHA-256 values are in `src/lib/enterprise/qa-portfolio.json`; regression tests check exact copied bytes. PDFs contain the dataset's original Arabic fictional text, while application controls are bilingual.

## Remaining blocked integrations / exact distinctions

| Stage / integration | Evidence and blocker |
|---|---|
| Real case request | Owner-confirmed missing request_case_once/account_is_active/case_submission_keys and HTTP404/PGRST202. Pending minimal repair untouched/unapplied. New copy is recovery only, not restoration. |
| Real upload/draft | A registered reproduction would create rows, prohibited by the freeze. Controlled actual adapters/components tested; current remote document/grant/policy state not rechecked. |
| Private original | Missing 008 columns (e.g. original_storage_path) produces 42703/PGRST204 before Storage; controlled actual storage action verifies safe categorization/no writes. Private citizen-documents bucket, MIME/size/path policies and authorized metadata updates are prerequisites. Their current remote absence is **not confirmed**. |
| Analysis result save | finalize_document_analysis(uuid,jsonb,jsonb) and compatible 007/009 risk/provenance/allowlist are prerequisites. PGRST202, 42883, 42P01 or 42703 identifies missing schema; 42501 identifies access rejection. Actual finalizer branch/empty response tested with doubles. Its remote presence/status remains unknown. |
| Real fee persistence | Existing 004 owner read/update policy and consultation_price grant should suffice; actual active-own-lawyer and zero-row/error behavior tested with doubles. No registered write/RLS REST read-back or directory reopen claim. |
| Enterprise | Real intake, tenant repository, NDA/service engagement, source/version review, monitoring/queue persistence, billing and professional assignment still unavailable. Public PDFs are fictional assets only. |

The exact historical registered-upload failing stage cannot be claimed from controlled tests or a missing **case** wrapper. No database fix, fake live fallback or whole-migration assumption is introduced. Future owner-authorized acceptance should capture safe stage/category/status, then verify prerequisites separately before any approved targeted repair. Do not blindly rerun 007 or modify the pending wrapper safeguards.

## Actual verification

- `node scripts/dev/v2-acceptance-tests.mjs`: **23 cases passed**, actual portfolio/parser/impact/failure/price action/client adapter modules with controlled dependencies only. No SQL/network.
- `node scripts/dev/v2-acceptance-ui-tests.mjs`: **11 actual React scenarios passed**, with external React 19.2.8 development renderer. Registered-dependency upload source/finalizer/thrown/draft failures, retained key/file/text, OCR correction, consultation schema/throw/UUID recovery, and price validation/rejection/confirmed refresh. Renderer deprecation warning remains; no dependency added.
- `node scripts/dev/upload-recovery-tests.mjs`: **12 passed**, including newly checked missing-column categorization before Storage. Existing uncertain writes retain bytes; no cleanup on unknown outcomes.
- `npm run test:safe -- --no-db`: **24/29 suites passed, five explicitly skipped**. Skips authz, smoke, security-regression, source-storage, curated-source SQL suites. No unflagged full-suite/SQL or pending repair-test pass claimed.
- `npm run lint`, `npx --no-install tsc --noEmit`, `npm run build`: fresh closeout **all exit 0**; build generates **91 pages** with existing middleware deprecation. Build/server child uses empty provider/Supabase credentials and fictional demo signing key, no env-file change; generated QA build is not a deployment artifact.
- `node scripts/dev/v2-acceptance-browser-tests.mjs`: **four Chrome groups passed** (ar360 reduced, ar390 normal, en390 reduced, en1440 normal). Actual mouse/keyboard portfolio selection/search/empty/native disclosures, exact loopback PDF bytes, four topics/six scenarios/queue-reset, disabled inquiry/fictional preset/consent/conditional phone/no POST/reset, fee empty validation/local edit/no POST/reload, actual TXT extraction/edited-text notice/detach/empty-provider failure retaining text and route. Zero observed external requests/page/hydration errors/overflow.
- `node scripts/dev/v2-browser-tests.mjs --all`: **four citizen + four Enterprise + two lawyer groups passed**, preserving citizen detail/highlight/tab/scenario-error/consultation entry, Enterprise scenario/trace/local queue and lawyer navigation/subscription/reviews/messages/requests. Updated only the Enterprise expectations/parent-disclosure selector for the new dataset; citizen assertions retained.
- `node scripts/dev/citizen-findings-linked-browser-tests.mjs`: **two groups passed** (ar390/en1440) through the existing labelled loopback MOCK provider. Actual TXT ingestion -> action/in-memory finalization -> checked-source details/exact-highlight focus/dialog -> original bytes/current report/headless PDF -> chat/What-if -> original-tab return. No provider/legal accuracy, hosted persistence or native print-dialog acceptance claim.

Browser automation is not owner-operated manual or physical-device/screen-reader acceptance. The empty-provider failure is genuine under isolated configuration; no real provider success/accuracy claim. Registered success writes and remote permissions remain unverified. Pure numeric/date/source/PDF checks establish fixture consistency, not current Jordanian legal correctness.

Real versus controlled QA: portfolio/impact/validation computations and memory-only fee edits run as implemented. Real adapters still use the existing authorized schema and RPCs. Registered paths were exercised with explicit dependency doubles, not a connected project. Successful AI upload/save/chat/scenario regression used the existing visibly labelled transport fixture in a separate isolated QA process, never an application fallback. Default acceptance browser used an empty provider and tested genuine failure recovery.

## Inspect / challenge / fix / retest

Separate compatibility review caught an attempted file/text blocking guard conflicting with existing OCR correction guidance. Replaced it with a truthful edited-text notice, retained corrections/originals, and retested actual React/browser paths. Added missing-ID finalizer regression to prevent success navigation on unconfirmed response. Fee edits no longer ride unrelated profile updates or turn empty input into free pricing.

Intermediate failures remain failures: initial private gate invocation passed a directory where a log prefix was expected (logging ENOENT); initial QA start preceded build completion; test helper display-name lint; ref access during render lint (changed to state); over-frequent parallel demo entry hit the existing six-per-minute gate (reused signed QA sessions in memory, no limiter weakening). One shell replacement failed quoting before edits; corrected with patch/private script. Final tests reran successfully. Screenshot review caught a mid-page sticky header from auto-scrolled field errors; final captures reset scroll/wait for actual transition dismissal. No application navigation/animations were changed to accommodate screenshots.

Visually inspected Arabic mobile/English desktop Enterprise workspaces, Arabic fee editor, inquiry and English upload recovery. Compact details reduce repeated warning blocks; material limitations stay in the prominent demo note and matching trace. No new paid service/major dependency/domain/auth-role rewrite.

## Evidence / files / handoff / safety

Private evidence: `C:\Users\mkz37\AppData\Local\Temp\haq-v2-acceptance-20261012-ff8da3a1`.
Representative captures: `acceptance-enterprise-viewport-ar-390.png`, `acceptance-enterprise-viewport-en-1440.png`, `acceptance-inquiry-ar-390.png`, `acceptance-lawyer-price-ar-390.png`, `acceptance-upload-recovery-en-390.png`; full/context counterparts and `acceptance-browser.json`. Baseline hashes/original ledger bytes and sanitized gate logs are retained there. Signed isolated sessions stay in process memory only, never exported.

Changed core paths: `src/app/[locale]/citizen/analyze/new/page.tsx`, `src/lib/documents/storage-actions.ts`, `src/lib/data/actions.ts`, `operation-failure.ts`, `error-key.ts`, `src/components/cases/case-request-dialog.tsx`, `src/messages/{ar,en}/cases.json`, `src/app/[locale]/lawyer/profile/page.tsx`, `src/components/lawyer/consultation-price-editor.tsx`, `src/lib/lawyers/{consultation-price,price-action}.ts`.

Changed Enterprise paths: `src/app/[locale]/(public)/enterprise/page.tsx`, `src/components/enterprise/{portfolio-demo,inquiry-form}.tsx`, `src/lib/enterprise/{portfolio.ts,qa-portfolio.json}`, **36 PDFs** in `public/enterprise-demo-contracts/`. Exact PDF filenames are the 36 contract IDs in the snapshot and Git commit, not a wildcard claim about other assets.

Verification/docs: `scripts/dev/{upload-recovery-tests,v2-browser-tests,v2-acceptance-tests,v2-acceptance-ui-tests,v2-acceptance-browser-tests}.mjs`, `docs/{HAQ_V2_DEVELOPER_HANDOFF,HAQ_V2_ACCEPTANCE_REPORT,HAQ_V2_IMPLEMENTATION_TRACKER}.md`, task-only `IMPLEMENTATION_STATUS.md` appendix. Handoff updated actual feature map, contracts, roles/privacy, failure/retry semantics, dataset/price decisions and next-agent constraints; previous citizen evidence/history preserved.

No SQL (even disposable), remote DB/Storage/account writes, seeding, provider charges, contacts, env/package/domain edits, deployment, push/merge. No changes to original qa-fixtures or pending patch/readiness/repair files. Completed citizen files, package/lock/AGENTS/master/env and preexisting artifacts are hash-compared to baseline; original dirty ledger prefix preserved byte-for-byte and excluded from focused commits. Agent-owned QA listeners stop at closeout; owner :3000 untouched. Local commit hashes/final preservation evidence are recorded in ledger/final response after creation; avoid embedding a document's own hash recursively.

### Exact changed-file manifest (62 distinct paths)

- `IMPLEMENTATION_STATUS.md`
- `docs/HAQ_V2_ACCEPTANCE_REPORT.md`
- `docs/HAQ_V2_DEVELOPER_HANDOFF.md`
- `docs/HAQ_V2_IMPLEMENTATION_TRACKER.md`
- `public/enterprise-demo-contracts/ORG-001-EMP-001.pdf`
- `public/enterprise-demo-contracts/ORG-001-EMP-002.pdf`
- `public/enterprise-demo-contracts/ORG-001-EMP-003.pdf`
- `public/enterprise-demo-contracts/ORG-001-EMP-004.pdf`
- `public/enterprise-demo-contracts/ORG-001-EMP-005.pdf`
- `public/enterprise-demo-contracts/ORG-001-EMP-006.pdf`
- `public/enterprise-demo-contracts/ORG-001-EMP-007.pdf`
- `public/enterprise-demo-contracts/ORG-001-EMP-008.pdf`
- `public/enterprise-demo-contracts/ORG-001-EMP-009.pdf`
- `public/enterprise-demo-contracts/ORG-001-EMP-010.pdf`
- `public/enterprise-demo-contracts/ORG-001-NDA-003.pdf`
- `public/enterprise-demo-contracts/ORG-001-SERVICE-001.pdf`
- `public/enterprise-demo-contracts/ORG-001-SERVICE-004.pdf`
- `public/enterprise-demo-contracts/ORG-001-SUPPLY-002.pdf`
- `public/enterprise-demo-contracts/ORG-002-EMP-001.pdf`
- `public/enterprise-demo-contracts/ORG-002-EMP-002.pdf`
- `public/enterprise-demo-contracts/ORG-002-EMP-003.pdf`
- `public/enterprise-demo-contracts/ORG-002-EMP-004.pdf`
- `public/enterprise-demo-contracts/ORG-002-EMP-005.pdf`
- `public/enterprise-demo-contracts/ORG-002-EMP-006.pdf`
- `public/enterprise-demo-contracts/ORG-002-EMP-007.pdf`
- `public/enterprise-demo-contracts/ORG-002-EMP-008.pdf`
- `public/enterprise-demo-contracts/ORG-002-LEASE-004.pdf`
- `public/enterprise-demo-contracts/ORG-002-NDA-003.pdf`
- `public/enterprise-demo-contracts/ORG-002-SERVICE-001.pdf`
- `public/enterprise-demo-contracts/ORG-002-SERVICE-002.pdf`
- `public/enterprise-demo-contracts/ORG-003-EMP-001.pdf`
- `public/enterprise-demo-contracts/ORG-003-EMP-002.pdf`
- `public/enterprise-demo-contracts/ORG-003-EMP-003.pdf`
- `public/enterprise-demo-contracts/ORG-003-EMP-004.pdf`
- `public/enterprise-demo-contracts/ORG-003-EMP-005.pdf`
- `public/enterprise-demo-contracts/ORG-003-EMP-006.pdf`
- `public/enterprise-demo-contracts/ORG-003-EMP-007.pdf`
- `public/enterprise-demo-contracts/ORG-003-SERVICE-003.pdf`
- `public/enterprise-demo-contracts/ORG-003-VENDOR-001.pdf`
- `public/enterprise-demo-contracts/ORG-003-VENDOR-002.pdf`
- `scripts/dev/upload-recovery-tests.mjs`
- `scripts/dev/v2-acceptance-browser-tests.mjs`
- `scripts/dev/v2-acceptance-tests.mjs`
- `scripts/dev/v2-acceptance-ui-tests.mjs`
- `scripts/dev/v2-browser-tests.mjs`
- `src/app/[locale]/(public)/enterprise/page.tsx`
- `src/app/[locale]/citizen/analyze/new/page.tsx`
- `src/app/[locale]/lawyer/profile/page.tsx`
- `src/components/cases/case-request-dialog.tsx`
- `src/components/enterprise/inquiry-form.tsx`
- `src/components/enterprise/portfolio-demo.tsx`
- `src/components/lawyer/consultation-price-editor.tsx`
- `src/lib/data/actions.ts`
- `src/lib/data/error-key.ts`
- `src/lib/data/operation-failure.ts`
- `src/lib/documents/storage-actions.ts`
- `src/lib/enterprise/portfolio.ts`
- `src/lib/enterprise/qa-portfolio.json`
- `src/lib/lawyers/consultation-price.ts`
- `src/lib/lawyers/price-action.ts`
- `src/messages/ar/cases.json`
- `src/messages/en/cases.json`
