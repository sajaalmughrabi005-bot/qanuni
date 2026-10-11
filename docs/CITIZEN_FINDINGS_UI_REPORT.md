# Citizen Risk & Clause UI simplification — 2026-10-11

## 1. Architecture understood

Inspected complete AGENTS/master/ledger, installed Next use-client documentation, existing result page, Summary reference (`case-understanding.tsx`), ResultsSummary/ResultsFindings, typed clauses/analysis, pure Next Steps, source validator/viewer/dialog, reports, chat/scenario, request entry, demo store/data, existing tests and V2 modules. Central architectural handoff: [HAQ_V2_DEVELOPER_HANDOFF.md](HAQ_V2_DEVELOPER_HANDOFF.md). Actual stack and server/RLS/privacy boundaries are documented there; presentation remains over the existing authorized DTOs.

## 2. Confirmed root causes

Default findings showed full original quotations, detailed concern/interpretation and repeated generic advice lists. More generic advice and several lawyer referrals followed the findings. This overloaded a citizen's initial view. Existing clauses have no authoritative title, and actual analysis can omit a distinct concern; inventing a title or rewriting AI output would violate the UI-only scope. The rental sample has incomplete legal coverage and missing original offsets/coverage metadata; simplifying it must not imply checked rental law or complete analysis.

## 3. Changes implemented

- Tab renamed **نقاط تحتاج انتباه / Points needing attention** with its stable `risk` state retained. Summary tab components/content unchanged.
- White/off-white, restrained navy/gold cards matching the Summary's simple typography/spacing/borders. Actual Clause N title, textual priority, short concern/why/one contextual procedural action, compact evidence state. No invented title, violation, statutory deadline or remedy.
- Existing concern/interpretation excerpts capped at 18 words each and explicitly ellipsized, never regenerated. If the separate concern is absent/whitespace, use the recorded interpretation and keep personal effect unverified. Covered rental briefs: **51–65 Arabic words**, **57–68 English words**; native disclosure label adds only a few words.
- Native `Show details` retains full quotation, concern/interpretation, available exact source passage/link/provenance/date/page, applicability and mapping limitations, and original comparison/navigation. High/unknown priority and source conflicts retain visible human-review cues.
- Three most important non-low clause findings first; remaining finding and all-clause disclosures retained. Count comes from unchanged stable-ID Next Steps deduplication, excluding generic notes; sample has four findings and all seven clauses. Similar text with distinct clause IDs is preserved, not silently merged.
- One next-actions/consultation section; one general AI/applicability disclaimer in unchanged ResultsSummary replaces the duplicate standalone disclaimer. Generic preservation/review advice is consolidated. Existing lawyer directory remains reachable through contact-options disclosure; original viewer/highlights, citation link, export, chat, What-if, request dialog and payload/persistence contracts survive.
- Original viewer is disclosed; parent opens it and focuses only a validator-rendered exact marker. Unmatched/sample clauses compare with the original disclosure without a false location claim. No automatic analysis/data reset, fetch or provider call is introduced by opening details.

## 4. Exact files changed

| File | Purpose |
|---|---|
| `src/components/citizen/results-brief.tsx` | Compact finding projection, priority/evidence, full native details; unchanged ResultsSummary/domain behavior |
| `src/app/[locale]/citizen/analyze/[id]/page.tsx` | Consolidated actions/disclaimer/CTA; original disclosure and safe exact-marker focus |
| `src/components/citizen/source-document.tsx` | Only `data-source-clause` attribute on existing exact-highlight buttons |
| `src/messages/ar/citizen.json` | Only localized risk-tab label |
| `src/messages/en/citizen.json` | Only localized risk-tab label |
| `scripts/dev/v2-results-render-tests.mjs` | Expanded to 34 bilingual presentation/adverse cases |
| `scripts/dev/v2-browser-tests.mjs` | Only parent-summary selector for newly nested finding disclosures |
| `scripts/dev/citizen-findings-fixtures.mjs` | Actual-component SSR adverse fixtures, test-only |
| `scripts/dev/citizen-findings-browser-tests.mjs` | Before/after, actual rental + native disclosure/viewport/adverse-state checks |
| `scripts/dev/citizen-findings-provider-fixture.mjs` | Explicitly labelled local synthetic provider/embedding transport responses |
| `scripts/dev/citizen-findings-linked-browser-tests.mjs` | Actual demo TXT/action/save/source/highlight/download/report/chat/scenario regression |
| `scripts/dev/citizen-findings-qa-egress.cjs` | Child-process loopback-only guard; never application-imported |
| `scripts/dev/citizen-findings-qa-server.mjs` | Reproducible credential-isolated build/server and labelled mock transport |
| `docs/HAQ_V2_DEVELOPER_HANDOFF.md` | Central architecture/contracts/decisions/boundaries/tests/read-first handoff |
| `docs/CITIZEN_FINDINGS_UI_REPORT.md` | This exact scope/evidence/limits report |
| `docs/HAQ_V2_IMPLEMENTATION_TRACKER.md` | Current bounded UI verification/handoff checkpoint appended |
| `IMPLEMENTATION_STATUS.md` | Current task evidence appended; only task appendix included in focused commit, prior dirty work preserved |

## 5. Database/storage/config changes

**None.** No AI action/prompt/provider implementation, extraction/OCR, backend DTO, authorization, Supabase/migration/patch, legal corpus/retrieval/Next Steps, analysis persistence, Enterprise/lawyer application, dependency/lockfile or `.env.local` edits. No new product environment requirement. Tests use explicit process-only empty Supabase/provider credentials and a fictional local signing key; mock mode uses a fictional provider value redirected to loopback only. No remote SQL, database/Storage/account writes, contacts, deploy, push or merge. Generated `.next` is QA output, not a deployment build.

## 6. Verification evidence

- `npm run lint`: final exit **0**, no errors/warnings. An intermediate new QA guard used a variable named `module`, rejected by Next lint; renamed to `networkModule`, rerun passed.
- `npx --no-install tsc --noEmit`: exit **0**. Equivalent requested `npx tsc --noEmit` uses the installed compiler. Fresh closeout follows the final concern-normalization change.
- `npm run build`: exit **0**, **91 pages**, credential-isolated child environment. Reproducible `citizen-findings-qa-server.mjs --build` also compiled/type-checked/generated all 91 pages and started the isolated server. Existing middleware convention deprecation remains.
- `npm run test:safe -- --no-db`: exit **0**, **24/29 suites passed, 5 explicitly skipped**. Includes 34 result render, 24 unchanged Next Steps, existing context/citation/report/analysis/extraction/ingestion/gate/workflow and other V2 suites. Six V2 suites now total **112** cases. No full unflagged-suite pass claimed. Skips: authz, smoke, security-regression, source-storage, curated-source SQL suites; no pending repair tests run.
- `citizen-findings-browser-tests.mjs`: exit **0**, **6 actual rental-app contexts**, ar/en × 360/390/1440 with normal/reduced preference, plus **48 actual-component SSR/native-disclosure cases** (rental, empty, unknown, no citation, checked citation, partial, long, repeated). SSR fixtures exercise actual presentation with built CSS/native behavior; they do not claim React hydration/live integration of those data variants.
- Existing `v2-browser-tests.mjs` citizen-only: exit **0**, **4 actual-app context groups**. Its first rerun failed a selector matching both parent and nested summaries; changed only to direct child and all four reran successfully.
- `citizen-findings-linked-browser-tests.mjs`: final exit **0**, ar390/en1440, actual demo TXT ingestion/action/in-memory save → checked-source detail → exact clause marker focus/Enter dialog → exact original bytes → selected report popup/headless PDF → actual chat/What-if actions using labelled mock responses → original-tab return. Both reran through the committed isolated helper. No real provider/legal accuracy or real-account result claim.
- Zero observed browser external requests, page errors, detected console hydration errors or horizontal overflow in covered contexts. Existing exact-highlight pure tests and escaped-markup/source-conflict tests pass. Native keyboard Enter/Space and disclosure headings/unique clause names/definition lists checked; no physical screen-reader claim.

Intermediate checks are not hidden: initial ESM path invocation failed before launch (Windows requires file:///); an intermediate safe run used the obsolete per-card professional_review-marker assertion while the UI was changing, then updated/expanded suite passed; first desktop original-open assertion sampled before scheduled animation frame, corrected to wait for actual DOM state; first print-interception predicate was not observed before popup closure, replaced by actual selected-report/PDF verification without claiming a proven cause or native-dialog acceptance; first chat exact-text selector included the existing child CTA, corrected to active-panel content; early source screenshot caught the existing 350 ms route cue, final capture waits for its clean dismissal. These are harness/assertion problems or intentional UI-test synchronization changes, not falsely reported passing attempts or production repairs.

## 7. Browser scenarios / screenshots

Actual mouse clicks and keyboard input were automated in installed Chrome via optional external Playwright, not owner-operated manual usability approval. Static rental example and fictional upload only; signed demo state stayed in process memory, never exported. The owner's :3000 server was not used or restarted.

Private evidence root: `C:\Users\mkz37\AppData\Local\Temp\haq-clause-ui-20261011-3f0f18ed`.

- Before: `before-citizen-ar-390.png`, `before-citizen-en-1440.png`, `before-summary-*.png`, `before-findings-*.png` from unchanged baseline build.
- After: `after-findings-ar-360.png`, `after-findings-ar-390.png`, other locale/viewport full pages, `after-findings-viewport-*.png`, `after-summary-*.png`.
- Adverse/source details: `fixture-long-*.png`, `fixture-checked-citation-*.png`, `fixture-partial-*.png`.
- Exact original: `actual-linked-highlight-viewport-ar-390.png`, corresponding English/full-page captures; `mock-report-ar.pdf`, `mock-report-en.pdf`.
- Structured result: `findings-browser.json` records all six contexts/word counts/zero traffic/errors. Sanitized gate logs: `closeout-lint.log`, `closeout-types.log`, `closeout-build.log`, `closeout-safe.log`; original bytes/hashes in `baseline.json`, `status-original.md`. Final safety/commit evidence is recorded separately at closeout.

Representative Arabic mobile before/after, English desktop source detail, long and partial fixture states, actual exact-highlight viewport and Summary reference were visually inspected. Stable Summary-tab components and original evidence behavior were retained; full-page after screenshots reset scroll to avoid a misleading mid-page sticky header.

## 8. Second self-review and discovered issues

Reviewed separately after implementation: brief comprehension, repetition, visible uncertainty, full information retention, visual simplicity and surviving interactions. Default cards are substantially shorter with three explicit questions, no nested advice cards/gradients/decorative warnings, textual priority and honest clause-number fallback. Generic advice appears once in next-actions; material evidence/applicability warnings are intentionally retained. Unknown/partial coverage remains visible in the existing summary. Full details and all clauses are accessible; original focus/dialog/download/report/chat/What-if/consultation entry passed.

Second review caught whitespace-only concerns blocking the recorded explanation fallback; trim only that presentation value and add two regression cases. No model output/data is rewritten. Screenshot review caught transition-overlay timing in an early capture; corrected capture readiness rather than changing navigation. Reusable commented test helpers and central handoff make continuation reproducible. No confirmed unrelated application defect was changed.

## 9. Blocked/unverified items

Owner 5–10 second comprehension, Jordanian legal interpretation/applicability/expert review, physical devices/full screen-reader/native print-dialog acceptance, real provider, registered upload/result/storage/handoff and hosted RLS remain unverified. The previous real-upload failure and confirmed missing request_case_once/PGRST202 are **not repaired** by this task. Rental corpus remains incomplete. Ellipsized text is an excerpt, not a newly authored semantic summary; long or missing analysis may require details/professional review. The old dirty repair artifacts and qa-fixtures remain preserved/excluded.

## 10. Safe continuation / execution

Use the exact QA helper/commands and subsystem tests in the central handoff. Inspect Git first; stage only owned paths/hunks. Optional future instruction addition, proposed only: “Read docs/HAQ_V2_DEVELOPER_HANDOFF.md before changing HAQ features and update it with verified behavior.” AGENTS/master remain unchanged.

No deployment is authorized. If later authorized, rebuild with the separately approved target/configuration and validate registered-user acceptance before release; do not reuse this empty-credential QA build. Review database repair prerequisites and staging/recovery independently, never apply remote SQL as a side effect of UI acceptance.

## 11. Readiness and Git

Locally implemented and tested **within stated demo/mock/presentation scope**. Owner usability, legal and production readiness are not established. One focused local commit on staging-prep; its final hash is recorded in the final response/ledger/Git history after creation (the document does not embed its own hash). Original main and protected-file hashes/ledger prefix are checked before committing; no prior repair artifacts/history included. Agent-owned :3015/:3016 helpers are stopped at closeout.
