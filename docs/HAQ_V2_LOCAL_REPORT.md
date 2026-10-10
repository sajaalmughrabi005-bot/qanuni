# HAQ V2 local engineering report — 2026-10-10

## A. Executive summary

Implemented three reusable capabilities: citizen findings with evidence-based Next Steps; an independent legislative dependency reassessment engine; and a functioning synthetic Enterprise inquiry/portfolio experience. Also strengthened the existing What-if action/UI and simplified lawyer navigation without removing legacy tools. This is local, scope-bounded implementation and verification, not production/legal readiness.

Architecture inspected: Next 16.3.8 App Router, React 19, TypeScript, next-intl, existing Tailwind navy/gold tokens, scoped Supabase adapters/session guards, memory demo store, authorized document context, provider actions, curated-source validator, exact-text highlights, exports and test harness. Installed Next page/layout/server-client documentation was read before changes. No new framework, dependency, provider, corpus, persistence or background service.

## B. Functional work versus previews

- **Functional over existing typed analysis data:** summary first, actual distinct clause attention count, top three priority findings, keyboard-accessible additional findings/general-note disclosures, explicit unknown/partial coverage, original-text versus analysis-text labels, available evidence with interpretation/applicability limits, deterministic procedural next steps. Existing original viewer/highlights/dialog/export/chat/consultation integration retained. The original action returns from a hidden tab before scrolling. Analysis reads/authentication are unchanged.
- **Functional pure modules:** Next Steps and impact computations, malformed/context/dependency checks, temporal/provenance limitations, deduplication and relationship traceability. Impact is a dependency review trigger, never an automatic violation finding.
- **Functional What-if integration:** same authorized server action and provider, bounded lexical source selection, exact citation filtering, existing authorized chat history, contextual presets, labelled textarea/limit, explicit uncertainty, provider-error input recovery, checked saved scenarios. New helpers add no embedding or model call. Success/save/reopen was tested using a visibly labelled local MOCK QA provider, not a real provider.
- **Synthetic Enterprise demonstration:** three fictional contracts, four fictional clauses, three mappings; changing the mapped hypothetical topic selects two contracts/three clauses. Six scenarios recompute actual displayed counts. Native trace disclosure and a local review list work. No official article text/publication/URL exists in these fixtures, no professional review is claimed, no real lawyer is assigned.
- **Preview/unavailable:** real Enterprise inquiry, contract intake, service engagement, legal approval, live amendment monitoring, persisted queue and billing. Optional inquiry demonstration only validates fictional data; no send/save/contact action exists. Subscription page explicitly has no authoritative paid status or purchasing/entitlement controls.
- **Lawyer interface:** six primary links, eight existing legacy links behind disclosure, simpler request/message/profile dashboard, read-only reviews. Real review access still relies on existing session/approval/RLS; only controlled adapters and demo reads were exercised.

## C. Checklist and evidence scope

The phase checklist, intermediate failures, fixes, evidence paths and bounded statuses are in [HAQ_V2_IMPLEMENTATION_TRACKER.md](HAQ_V2_IMPLEMENTATION_TRACKER.md). TESTED means the listed pure/mock/demo checks passed, never real-account/provider/legal/hosted verification. No old global master-plan checkbox was changed based on these local results.

## D. Important changed files

| Area | Files / purpose |
|---|---|
| Citizen | `src/components/citizen/results-brief.tsx`, existing citizen `analyze/[id]/page.tsx`: findings hierarchy, truthful counts/evidence/coverage, preserved actions |
| Next Steps | `src/lib/legal/next-steps.ts`: typed bilingual categories and deterministic recommendations, exact text and context guards |
| What-if | `src/components/citizen/scenario-simulator-panel.tsx`, `src/lib/ai/actions.ts`, `src/lib/legal/scenario-evidence.ts`, `src/lib/ai/scenario-history.ts`: existing action grounding, UI/recovery and saved-result validation |
| Impact | `src/lib/impact/engine.ts`, `fixtures.ts`: IO-free typed domain and hypothetical portfolio |
| Enterprise | public `/enterprise` and `/enterprise/demo` pages, `src/components/enterprise/*`, `src/lib/enterprise/inquiry.ts`, `public-navbar.tsx`: introduction, local validation, computed demonstration and locale-aware entry |
| Lawyer | lawyer layout/dashboard/reviews/subscription pages, `dashboard-shell.tsx`: focused nav, legacy disclosure, truthful loading/reviews/preview; shared mobile demo banner wraps properly |
| Verification | Six `scripts/dev/v2-*-tests.mjs` feature suites, two V2 browser scripts, `run-safe-tests.mjs` explicit `--no-db` mode; tracker/report/ledger append |

Existing schema/migrations/patches, Supabase configuration, authentication, role permissions, provider implementation, ingestion/analysis pipeline, original highlight validator/viewer, report implementation, legal corpus, packages/lockfile and production domain are unchanged.

## E. Tests and actual limits

- Fresh baseline, milestone and closeout lint, TypeScript and production build pass. Build uses child-process empty Supabase/provider credential overrides, not an edited env file. Latest build generates **91 pages**, up from baseline 83; existing middleware deprecation warning remains.
- `npm run lint`: exit 0. `npx tsc --noEmit`: exit 0. `npm run build` uses the exact repository Next build entrypoint in the sanitized process harness: exit 0. No install/upgrade required.
- `npm run test:safe -- --no-db`: **24/29 suites pass, five explicitly skipped**, exit 0. Eighteen existing non-SQL suites plus six new suites. The unflagged full suite was **not run** under the absolute freeze; skipped suites are authz-tests, smoke, security-regression-tests, source-storage-tests, curated-source-tests. Pending wrapper patch tests were not run.
- New suites: `v2-next-steps-tests` 24; `v2-results-render-tests` 14; `v2-impact-tests` 24; `v2-inquiry-tests` 11; `v2-scenario-tests` 14; `v2-lawyer-tests` 5. **92 cases**, real source modules compiled with existing SWC test loader; provider/database transports are doubles, no SQL or external traffic.
- `v2-browser-tests.mjs --all`: actual built app on dedicated loopback :3015, four citizen/What-if unavailable-provider groups, four Enterprise groups, two lawyer groups. Arabic 360/390 and English 390/1440, normal/reduced motion, native keyboard disclosures, dialogs, preserved input, local validation with no inquiry POST, six impact scenarios, derived counts, refresh/reset, legacy links/reviews/subscription/messages/requests; zero external browser requests, page/hydration errors or horizontal overflow.
- `v2-scenario-browser-tests.mjs`: ar/390 + en/1440 actual action/result/save/reopen using a local, visibly labelled MOCK QA provider transport. One browser action POST per context, reopening adds none. No real provider success/cost/accuracy claim.
- Additional final visual checks **pass**: citizen and What-if gold-action contrast >=4.5 and the What-if action center hit target clearing the fixed assistant. Full browser matrix and both MOCK QA success groups reran successfully after the correction, with no subsequent application changes.
- Not run: live Auth/Supabase/SQL/Storage/account tests, private document ingestion, paid AI, legal-expert review, real-human usability acceptance, native concurrent DB tests, hosted/mobile-device acceptance, large production portfolios.

## F. Visual evidence

Private evidence root: `C:\Users\mkz37\AppData\Local\Temp\haq-v2-20261010-dB4zp2` (not committed).

Actual baseline: `before-citizen-ar-390.png`, `before-citizen-en-1440.png`. Current screenshots: `citizen-viewport-ar-360-reduce.png`, other citizen locale/viewport full-page and viewport PNGs; `enterprise-inquiry-*.png`, `enterprise-demo-*.png`, `enterprise-demo-viewport-*.png`; `lawyer-reviews-*.png`; `what-if-mock-success-*.png`. Screenshot review found and prompted the Arabic banner wrap, text contrast and final-action clearance fixes. Browser input was driven by Playwright/installed Chrome; no owner-operated manual acceptance is claimed.

## G. Legal trust, architecture and LLM efficiency

Source-text checked, AI interpretation, temporal/applicability uncertainty and human professional review are separate. New procedural templates create no statutory deadline, amount, remedy or article reference. Missing/conflicting/unsupported sources and unknown risk stay explicit. Generic analysis concerns remain visible without inflated counts. Raw AI/document text renders through React escaping, not HTML injection.

Existing curated Labour excerpts retain snapshot and applicability limitations; no new law/version verification is claimed. The hypothetical impact fixtures cannot enter that corpus. The impact engine accepts validated entity/date/dependency inputs, preserves mapping/event/version trace, flags missing/expired/superseded/future/unsupported inputs and caps work/output; trusted future adapters must still establish provenance and tenant authorization.

Next Steps/impact/inquiry use no LLM. What-if performs bounded lexical selection before the same interpretation call, with no new embeddings. This is deliberately limited retrieval, not a replacement for legal reasoning or proof of comprehensive legal coverage. Existing authorized chat history is reused; a new persistent scenario-specific conversation system was not implemented. No numerical cost/accuracy claims.

Future integration points: authorized analysis DTO -> Next Steps; tenant-scoped portfolio/version repository -> pure ImpactInput; trusted source-version ingestion -> reviewed events; licensed-professional review records and background jobs -> separate adapters. No DB schema, queue, search service or new persistence was created.

## H. Unfinished work, classified

- **Needs database / separate authorization after freeze:** missing remote case-request wrapper, real private-original/storage/schema acceptance; secure Enterprise inquiry and tenant portfolio/version/review persistence; background legislative monitoring. Pending repair files are untouched, and the previously confirmed PGRST202 is not declared repaired.
- **Needs legal expert:** authoritative amendment/version/jurisdiction/applicability validation, expanded source coverage, high-consequence finding/action review, confidentiality/data-processing/engagement terms. Potential reassessment is not compliance certification.
- **Needs owner product decision:** actual Enterprise commercial intake/contact channel/service scope, reviewed payment/subscription terms and provider, monitoring consent/retention. No prices/status/entitlements invented.
- **Needs hosted / real-provider / real-account / human verification:** provider structured scenario output and new citation field with the configured model, registered analysis/results and approved-lawyer handoff, real review RLS behavior, hosted runtime/limits, device/screen-reader/counsel acceptance.
- **Deferred:** consumer contract monitoring opt-in, uploaded amendment parser, live legislative ingestion, paid subscriptions, large law-firm operations removal, broad refactors, material published privacy-policy changes. Legacy routes remain accessible.

## I. Safety

Exact hashes verify `.env.local`, pending repair files/related preexisting docs/test, AGENTS/master and package/lock unchanged; the entire original dirty ledger prefix is preserved. Privileged-value scan over authored files/current client chunks found zero matches, without printing values. No remote SQL, DB/schema/policy/grant/bucket/account/row operation, real notification/contact/email/billing, deploy, push, merge, main change or paid provider call. QA builds/servers use process-only credential overrides, a separate local signing secret, external egress guards and browser request blocking. The owner's :3000 server is never stopped or restarted. Agent-owned :3015/:3016 helpers are stopped at closeout. The generated .next build is credential-isolated QA output, not a deployment artifact; normal development configuration was preserved.

## J. Git state

Branch `staging-prep`, baseline `58399533d6dac6ac81fe42117884619613da90d0`; main stays `db5bfb50785cf3d06f4256aceaa968b5d8755fa5`.

Verified feature commits: `3e35ec4` impact, `d40b165` citizen/Next Steps/What-if, `0dbf75d` Enterprise, `c3a0382` lawyer focus, `c8dfccc` citizen accessibility. The documentation/browser/verification commit hash is in the final ledger/response and Git log. No existing pending repair work is included in any commit. The appended ledger intentionally remains uncommitted along with the owner's original untracked repair/audit artifacts.

## K. One focused next step

Review the employment finding -> canonical source quote -> procedural next-step examples with a Jordanian legal professional. Refine only reviewed templates/evidence limitations using synthetic fixtures while the DB freeze remains in effect; then separately authorize isolated hosted acceptance before any real submission/storage deployment.
