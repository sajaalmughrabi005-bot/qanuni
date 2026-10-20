# HAQ V2 — Lawyer pricing + realistic synthetic QA portfolio

You are working in the existing HAQ repository on `staging-prep`. The user wants (1) a lawyer to control consultation prices shown to citizens and (2) representative synthetic data for citizens and Enterprise portfolio testing.

## Supplied assets
The ZIP `HAQ_QA_Contracts_and_Company_Portfolios_v1.zip` contains 36 synthetic company contracts across 3 distinct organizations, 6 individual PDF fixtures (including a nonlegal distractor), 6 OCR scan/negative cases, an index and scenario manifests, 8 fictional demo lawyer pricing profiles, and a clearly hypothetical amendment scenario. All documents are fake and must remain marked as such in demo/test contexts.

## Mandatory safety boundaries
1. The configured Supabase is tagged PRODUCTION and the `request_case_once` RPC is still missing. Never seed it, run remote SQL, create/authenticate fake real accounts, alter profiles or approval status, publish fictional lawyers, change `.env.local`, deploy, or call external LLMs without a new explicit authorization.
2. Preserve the owner's pending SQL repair patches, prior reports, all committed V2 work, and unrelated dirty files. No reset, clean, force checkout, merge or push.
3. Build a zero-production-traffic demo/mock integration of the supplied fixtures. If a truly isolated local Supabase exists, create a guarded optional local-only seed command and tests, not a production executable.
4. Do not claim legal accuracy for fixture flags; `expected_topic_flags` are test expectations to assess model/parse output. No fabricated statutory citation or official amendment. No real messages/contact attempts or billing.

## Pricing: required behavior
- First inspect the existing `lawyers` schema/model/profile edit action, citizen directory and lawyer detail price display. Identify the canonical existing fee field(s); do not assume names or add a column without explicit DB authorization.
- In the lawyer-owned profile/settings UI, add a clearly labelled price editor for the existing supported consultation fee in **JOD**, with validation for finite, nonnegative, capped sensible values and meaningful error/retry states. If it supports multiple fees already, expose only truly backed fields. Distinguish personal consultation price from HAQ's subscription fee.
- Never allow changing another lawyer's price. Verify server-side identity and approved account status when possible; do not rely on client-only checks. For schema-locked work, implement a properly typed adapter/interface plus safe demo-only behavior and explicitly mark persistence blocked. Never falsely report a save to remote production.
- A missing/unset fee must display **«السعر عند التواصل»**, not `0 دينار`. A fee of zero means free **only if explicitly selected as free**; preserve a separate flag if supported, otherwise use an honest unset state and document the schema dependency.
- A changed authorized price should appear consistently in citizen marketplace cards and lawyer profile without requiring hard-coded UI values, once connected to authoritative storage.
- No checkout/commission/payment handling. Real consultation fees are agreed between lawyer and citizen outside HAQ. Avoid unreviewed fee-sharing.

## QA and enterprise data
- Use `data/organizations.json`, `data/enterprise_portfolios.json`, `enterprise_contracts/*.pdf` for 3 independent fictional company portfolios. Compute dashboard aggregates from the selected portfolio records, never hardcode totals. Demo navigation must make company A/B/C comparison easy while retaining tenant isolation assumptions.
- Keep fixture annotations/golden labels out of user-visible AI conclusions. Show authentic contract titles and metadata from fiction; allow opening original PDF/scan in the mock demo. Mark synthetic demo once clearly at the view header rather than repeating warnings on every component.
- Wire `impact_scenarios/simulation_scenarios.json` into a hypothetical-impact UI through the existing pure impact engine. Reassess potential relevance by explicit links, not treating all linked clauses as violations. Show version/provenance caveats when a legal version is not verified.
- Citizen QA: validate legal vs non-legal gates and test OCR file formats. Do not claim OCR worked unless a genuine local run succeeds. Image-only PDF, phone-quality, blurry and blank cases must be testable.
- Keep existing real application behavior intact; the pending missing RPC and analysis-save blockers remain separate documented issues. No fake success to hide them.

## Required tests and evidence
- Price unset, explicit free, valid positive JOD price, malformed/negative/excessive input, denied cross-lawyer update, offline save failure, retry, citizen rendering, locale/ar RTL.
- Organization switching does not leak state; expected counts derived from 36 rows and 3 organization IDs; no cross-tenant data; all PDF paths resolve locally; missing contract and duplicate IDs handled; actual scanned images included.
- Impact: unrelated amendment yields zero; qualifying topic selects affected clauses/contract IDs; no duplicate inflation; unsupported domain stays unsupported; all outputs label `potential_reassessment`.
- Lint, TypeScript, focused tests, local browser at Arabic mobile + desktop and English; no external browser network. Preserve all existing pending patches and `main` branch.
- Log exact changes and limitations, which features are mock-only, and the safe plan for eventual local/test database seeding. No generic claims that production flows were fixed.

## One clear end result
A lawyer sees a simple **"أسعاري"** section in editable profile settings and citizens see a truthful corresponding JOD quote, while HAQ Enterprise Demo can switch between 3 clearly fictional portfolios and browse/reassess their contract documents. Do not stop at a visual-only mock if safe local functionality can be tested.
