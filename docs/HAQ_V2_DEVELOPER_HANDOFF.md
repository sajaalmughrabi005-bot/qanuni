# HAQ V2 developer handoff

Maintained 2026-10-12, Asia/Amman. Read `AGENTS.md`, `CODEX_MASTER_PLAN.md`, the complete `IMPLEMENTATION_STATUS.md`, then this document before editing. The ledger includes historical reports; later entries supersede earlier facts only within their stated verification scope. Nothing here authorizes remote operations.

## NEXT ENGINEER / NEXT AI AGENT — READ FIRST

- Work on **staging-prep**. The preserved citizen-UI commit is `1f96a692f2bb6f087fc6b57047d7d91481773efe`, over V2 `7ac678d`. Current continuation commits are discoverable with `git log --oneline 1f96a69..HEAD`; their hashes are recorded in the ledger/final response after creation. No push/merge/deploy is authorized.
- Preserve pending **untracked** `docs/CASE_REQUEST_WRAPPER_REPAIR.md`, `docs/MIGRATION_READINESS_AUDIT.md`, `scripts/dev/case-request-wrapper-patch-tests.mjs`, `supabase/patches/`, and owner-provided `qa-fixtures/`. `IMPLEMENTATION_STATUS.md` already contains uncommitted repair/V2 work; retain its complete original bytes, append evidence, and do not commit unrelated history accidentally. No reset/clean/stash or blanket `git add .`.
- Current implementation: completed citizen findings preserved; stage-aware upload recovery, inline wrapper-only consultation errors; 36-contract/3-organization synthetic portfolio/PDF browsing and computed impact; existing-schema owner-only price editor; fictional inquiry preset/validation/reset. Verification scope and remaining integrations are in `docs/HAQ_V2_ACCEPTANCE_REPORT.md`. Real integrations remain subject to the boundaries below.
- Current continuation gates/browser evidence are in `docs/HAQ_V2_ACCEPTANCE_REPORT.md`; the unchanged citizen baseline is documented in `docs/CITIZEN_FINDINGS_UI_REPORT.md`. Older V2 history remains in the local report/tracker. A build or mock success does not prove hosted behavior, legal correctness, human usability or remote security.
- Production case submission remains blocked by the last confirmed missing `public.request_case_once` / HTTP 404 / PGRST202. The earlier real-upload failure is not repaired or verified by the UI task. Enterprise intake/monitoring/persistence/billing and lawyer paid-status integration are unavailable.
- Keep AI reasoning/prompts/extraction/OCR/backend DTOs/data persistence unchanged when adjusting citizen presentation. Preserve Arabic RTL, English LTR, reduced motion, navy/gold tokens and source/applicability uncertainty. Never derive a definitive violation from a priority label.
- Next safe work: owner usability/legal review and separately authorized hosted upload/fee acceptance after prerequisites are reviewed. Do not substitute the legacy case RPC or remove pending repair guards. This task's absolute freeze includes disposable SQL; controlled adapters are the regression boundary. Database execution and registered writes require explicit authorization and target/recovery review.

## 1. Architecture and execution boundaries

Next **16.3.8** App Router / React 19.2.8 / TypeScript 5 / Tailwind 4 / next-intl. Root layout is `src/app/[locale]/layout.tsx`; route groups separate public, citizen, lawyer and admin areas. `src/i18n/routing.ts`, `navigation.ts`, `navigation-client.tsx` preserve locale-aware Link/router interfaces. Messages are in `src/messages/ar/` and `src/messages/en/`. Read relevant installed `node_modules/next/dist/docs/` guides before unfamiliar Next changes.

Interactive pages are client components. Server Actions and `server-only` modules hold sensitive operations. Supabase browser/session clients use existing RLS; `src/lib/supabase/admin.ts` is privileged and must stay server-only. `src/lib/data/use-scoped-query.ts` hides earlier identity/filter results and discards stale responses, with loading/error/empty distinct. UI guards are usability boundaries, not database permission enforcement.

`src/components/layout/dashboard-shell.tsx` owns shared role shells and the demo banner. Existing Radix wrappers are in `src/components/ui/`. `src/app/globals.css` defines dashboard off-white/white, navy/gold and dark-theme tokens. `.haq-landing` has its own public dark palette. Preserve current theme boundaries rather than imposing landing colors on dashboards.

## 2. Frontend/backend feature map

| Feature | Actual implementation / safe extension point |
|---|---|
| Citizen upload/result | `src/app/[locale]/citizen/analyze/new/page.tsx`, `analyze/[id]/page.tsx` |
| Summary / attention findings | `src/components/citizen/results-brief.tsx`; Summary tab uses `case-understanding.tsx` and `term-simplifier-card.tsx` |
| Original text / details | `source-document.tsx`, `clause-map.tsx`, `clause-detail-dialog.tsx`; exact validator `src/lib/documents/highlights.ts` |
| Reports | `src/components/citizen/analysis-export.tsx`, `src/lib/documents/report.ts` |
| Chat / What-if | `ask-the-law-panel.tsx`, `scenario-simulator-panel.tsx`, server actions in `src/lib/ai/actions.ts` |
| Marketplace / consultation | Existing public `/lawyers` and `/lawyers/[id]`, `src/components/cases/case-request-dialog.tsx`, `src/lib/data/actions.ts::requestCase` |
| Enterprise | Public `/enterprise`, `/enterprise/demo`, `src/components/enterprise/`, `src/lib/enterprise/inquiry.ts` |
| Lawyer | `src/app/[locale]/lawyer/layout.tsx`, dashboard/requests/messages/profile/subscription/reviews; cases/drafts/calendar/client tools remain available |
| Admin | `src/app/[locale]/admin/` and guarded data RPC adapters; no new admin permissions in V2 |
| Data/auth/integrations | `src/lib/data/`, `src/lib/auth/`, `src/lib/supabase/`, `src/middleware.ts` |
| Price editing | `src/components/lawyer/consultation-price-editor.tsx`, `src/lib/lawyers/consultation-price.ts`, `price-action.ts`; existing numeric column/004 owner RLS |
| Upload/request failures | `src/lib/data/operation-failure.ts`, detailed adapters in `actions.ts`; public bounded categories, no raw SQL/provider messages |

## 3. B2C workflow and citizen finding contract

Upload/paste → authenticated ingestion → meaningful-content and strict legal-instrument classification → source retrieval → section analysis → save → selected result → original/ask/What-if/export → existing lawyer marketplace/request. `src/lib/documents/ingestion.ts`, `extract-text.ts`, `direct-extraction.ts`, `ocr.ts`, `validation.ts` provide the shared ingestion boundary. MIME/signature/size validation and retained full text must not be bypassed by a new UI entry point.

The result page reads documents/clauses/analysis using the existing session-scoped query and RLS. The bundled rental (`src/lib/mock-data/contract.ts`) is reachable only in demo; live demo results are in `src/lib/demo/store.ts`. No bundled sample substitutes for a registered-user query error.

`ResultsFindings` receives existing `LegalDocument`, `Analysis`, `DocumentClause[]`, plus an optional **client-to-client** `onViewOriginalAction(clause)` callback. It delegates scope/risk/evidence/order/count to unchanged `deriveNextSteps`. High → unknown → medium; top three non-low clauses are visible, extras are native `details`. Identical repeated IDs do not inflate counts; conflicting definitions of one ID fail closed. Different clause identities are preserved even when their wording is similar. Unmapped general notes are retained separately and not counted as independent risks. All clauses remain in the advanced disclosure.

`DocumentClause` has **no authoritative title**: use the actual clause number, never a guessed/generated title. The compact concern and explanation are bounded **18-word excerpts** with explicit ellipses; full text remains in the card. Some actual analysis clauses have no separate concern: show the recorded explanation as the concern excerpt and disclose that personal effect is unestablished. This is presentation, not a new reasoning pipeline. Original quotation, full concern/interpretation, source passage/provenance and comparison action live inside `Show details`. Source gaps, conflicting data, unknown priority and material need for human review stay visible while collapsed.

The page owns one consolidated next-actions/consultation section. Generic review/preservation advice is not repeated in lists in each card; the brief action references the actual clause and remains procedural, with no invented deadline/remedy. One general AI/applicability disclaimer remains in the unchanged results-summary panel. Supporting details may repeat material provenance/limitations intentionally.

The original viewer remains the existing component. The parent opens its native disclosure after activating the risk tab, then focuses a `data-source-clause` button **only if the unchanged validator rendered that marker**. Without an exact match it focuses the original disclosure, makes no location claim, and preserves comparison. Browser tests must await the next animation frame; synchronous post-click evaluation can sample before this focus/reveal completes. Native disclosures need no backend calls, save/reset or retry behavior.

## 4. Legal Engine and Next Steps

`src/lib/ai/analysis-service.ts::analyzeText` uses schemas, sections, coverage and exact source offsets; its results remain AI interpretations. `src/lib/legal/corpus.ts` holds eight selected Labour Law excerpts, with allowlisted identifiers/quotes, snapshot/hash/page/date metadata. `retrieval.ts` combines lexical scores and existing OpenAI embeddings; it is not proof of current law or claim applicability. `scenario-evidence.ts` is separate bounded lexical selection for the existing What-if request, not another LLM.

`src/lib/legal/next-steps.ts::deriveNextSteps` is a **pure presentation module**, not authorization: callers must already obtain authorized document data. It verifies matching analysis owner/document, rejects ambiguous clause IDs, deduplicates stable IDs, normalizes invalid risk to unknown, uses `verifiedHighlights`, checks stored source metadata against the curated allowlist, and computes complete/partial/unknown coverage. Categories: information, clarification, other_party_question, preserve_evidence, professional_review, unsupported_action. `ActionFinding` contains clause, normalized risk, exactOriginal, evidence, optional canonical source and procedural steps. `NextStepsResult` contains findings, attentionCount, coverage, contextMismatch, generalSteps.

Evidence states are source_text_checked / missing / conflicting / unsupported_domain. A source-text match is not professional review, confirmed violation, current-law certification or established applicability. Rental/civil/commercial corpus coverage is incomplete; do not reuse employment references to make rental results look supported. `verifiedHighlights` uses exact unique UTF-16 ranges and rejects ambiguous/overlapping quotes; OCR page coordinates are unavailable and must never be fabricated.

## 5. Contract chat, What-if and failure behavior

`src/lib/ai/actions.ts` authorizes server callers independently. Real document context/history/clause IDs are reloaded through the user's server Supabase/RLS client; browser identity/text/source claims are untrusted. Demo input is isolated and bounded. `src/lib/documents/context.ts` returns ranked bounded sections with explicit partial coverage. Existing ask-history is bounded, not an unlimited conversation context.

What-if calls the same provider after bounded lexical curated selection. Exact citations/allowed clause IDs are filtered; `src/lib/ai/scenario-history.ts::readScenarioHistory` schema-checks saved JSON, rejects foreign clause IDs and requires exact canonical quotes before checked-source presentation. Legacy saved source IDs alone remain unverified. The panel retains question/busy recovery on failure and discloses uncertainty. No new persistent scenario-specific multi-turn engine exists.

`src/lib/ai/provider.ts` is server-only, schema-validates structured replies, bounds response-body handling, retries transient failures only, and distinguishes configuration/auth/quota/rate/timeout/network/model/refusal/malformed output. Main operations do not substitute heuristics for failed AI. Cached health is an actual request, not just key presence. Never log private content, prompts, provider bodies or secrets. Current task's success transport is visibly labelled **MOCK QA**, not a live provider claim.

## 6. Legislative Impact Engine and B2B

`src/lib/impact/engine.ts::evaluateImpact(ImpactInput): ImpactResult` is IO-free. Interfaces: Instrument, Article, ArticleVersion, Provenance, PortfolioContract, PortfolioClause, ClauseRelationship, ImpactEvent, PotentialFinding, ReviewAction. Validate IDs/dependencies/calendar dates/order/status; index mappings, preserve relation/event traces, deduplicate compound findings; cap entity groups at 10,000 and findings at 50,000. Output is **potential_reassessment**, **not_reviewed**, **unassigned professional_reassessment**, never automatic compliance violation.

Limitations include hypothetical/missing provenance, unsupported domain/jurisdiction, future/expired/superseded versions. Safe HTTPS links do not establish provenance truth. A future adapter must independently enforce tenant access and validate source/version authenticity; do not treat this engine as either authentication or legal certification.

`src/lib/impact/fixtures.ts` remains the small pure-engine test fixture. Enterprise now uses `src/lib/enterprise/portfolio.ts` and `qa-portfolio.json`: an explicitly synthetic snapshot of the owner's QA dataset, 3 organizations/36 contracts (14,12,10), 25 employment contracts and 100 topic markers. Byte-identical fictional PDFs are in `public/enterprise-demo-contracts/`, with SHA-256 in the snapshot. Organization filters/search/native detail browsing and six impact scenarios use the unchanged engine. Each of four topics maps 25 employment contracts at all-portfolio scope; unsupported/unmapped contracts do not acquire fabricated relationships. Topic markers/QA review expectations are NOT source clauses or legal judgments; scenario clauses say so. Review queue is component memory only, no real lawyer assignment, tenant access or persistence. The public snapshot contains fictional data exclusively, never private uploads.

Enterprise introduction explains prospective portfolio/evidence/human review. `inquiry.ts::validateDemoInquiry` validates bounded fields only. The real form is disabled; explicit opt-in enables **fictional local validation**, with no send/save/contact adapter. Confidentiality/NDA/data-processing/engagement and service terms must be reviewed before real intake. No billing, tenant repository, uploaded-amendment parser, live monitoring, job worker or production subscription service exists.

Inquiry fictional preset fills fields only after an explicit click, leaves acknowledgement unchecked, preserves errors/values for correction, and resets when demo is disabled. Inline field errors have described-by targets. A locally validated message expressly says nothing was sent/saved and no contact follows; never reinterpret this as a successful inquiry.

## 7. Lawyer/admin workflows

Lawyer navigation has six primary links and eight preserved legacy tools in a disclosure. Dashboard prioritizes citizen requests/messages/profile; legacy cases/calendar/stats/voice tools remain. Requests and accepted case workspaces use the existing lifecycle/private-document/message adapters. Subscription is an explicit unavailable/unknown preview, not a paid entitlement or purchase. `/lawyer/reviews` queries existing own-lawyer reviews, distinguishes error/loading/empty, and provides no self-review form; citizen review eligibility remains the existing workflow.

Real professional actions require an active profile and approved non-demo lawyer independently of middleware. Demo lawyer/admin operations use memory fixtures; an editable demo cookie cannot grant server admin authority. Admin verification/user/report RPCs remain existing guarded interfaces; this UI work adds no permission.

Self-edit pricing preserves existing active-lawyer profile-edit permission; professional-work approval is not silently added as a new self-edit permission. `saveConsultationPriceAction(lawyerId,input)` validates UUID/JOD decimal (0–10000, at most two decimals), derives active lawyer identity through `getAccessContext`, writes only consultation_price with ID/profile_id/non-demo filters through session RLS, and requires one confirmed matching returned price. No service-role/grant/schema change. Zero rows/throw/schema/access failure never produce saved. `ConsultationPriceEditor` isolates fee edits from unrelated profile writes, retains rejected input, gates duplicate clicks synchronously and updates only the current demo lawyer in memory. Reload restores demo fee. A saved-but-refresh-failed result asks to check stored price rather than erase a potentially committed update. Hosted grant/RLS/read-back acceptance is unverified; 004's existing column grant/policy should suffice if correctly deployed.

## 8. Models, persistence and privacy

Public TypeScript contracts in `src/types/index.ts` distinguish LegalDocument, Analysis (optional AnalysisCoverage), DocumentClause (sourceText/UTF-16 offsets/optional source ID), LegalSource, CaseRecord, CaseDocument, Message, Review and role/profile status. `src/lib/supabase/mappers.ts` bridges database snake_case to these DTOs. Preserve additive/backward-compatible optional coverage for historical analyses; absent/malformed metadata must not become complete/low risk.

Real analysis finalization calls `finalize_document_analysis`; source creation/storage/download actions are in `src/lib/documents/storage-actions.ts`. Real case requests call `request_case_once(p_key,p_request)` via `src/lib/data/actions.ts`; the dialog retains failure input/idempotency key and sharing defaults to no document. Failed/uncertain responses must not delete potentially committed records or bytes. Original uploads use content-derived paths and short-lived authorized URLs. Keep private `citizen-documents` and `case-documents` access dependent on authorization; no public permanent URL.

`createDraftDocumentResult` / `finalizeDocumentAnalysisResult` preserve safe error categories for the upload page; original nullable/boolean helpers remain compatible for other callers. Missing function/table/column codes become schema_unavailable; authorization remains forbidden, not schema absence. Finalization requires a returned result ID before navigation. The public upload error names draft/source/analysis/save stage, retains input/file/key, and never includes SQL/object names or private content. Human OCR/PDF text corrections remain allowed; a notice distinguishes edited extracted text from unchanged original bytes. The explicit detach control keeps text. Retry can run AI again before the existing idempotent finalizer; resume/caching is future work, not a production retry guarantee.

Consultation key generation is inside try/finally with a synchronous busy ref. Safe known schema/auth/idempotency failures appear inline, unchanged retries preserve the same key, and empty returned case IDs are unconfirmed. Wrapper is the only real RPC path; no client insert/legacy fallback or repair modification. Public copy does not reveal RPC names or Supabase codes.

Auth is Supabase email/password + existing callback/reset handling. `src/lib/auth/access.ts::getAccessContext/getProfessionalAccessContext` uses verified server identity, active profile and professional approval. `use-session.ts` and middleware/RoleGuard manage route UX; RLS/server authorization remain necessary. Client claims never replace them. `src/lib/demo/session.ts` provides signed expiring HttpOnly demo sessions; `mode.ts` is UI isolation and `store.ts` holds files/results/history/cases/reviews in memory, clearing on reset/reload. Demo AI can call the real provider in normal operation; published privacy wording's older browser-only claim is still awaiting owner/counsel review (`docs/PRIVACY_REVIEW_DRAFT.md`).

## 9. Integrations and configuration

Supabase Auth/Postgres/RLS/private Storage; existing OpenAI provider/OCR/embeddings; next-intl/Radix/Framer/Recharts/dnd-kit. No new dependency/provider/configuration for findings. Existing environment names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`; optional `OPENAI_EMBEDDING_MODEL` and server-only `DEMO_SESSION_SECRET` (minimum length and existing service-role fallback are defined in session.ts). Never document values or put privileged keys in client code.

`next.config.ts` configures 11 MB action parsing / 12 MB proxy buffering for bounded 10 MiB files. Hosted platform/runtime limits remain separate. Current domain stays `qanuni.site`; internal cookies/tables/RPC/package identifiers retain legacy names intentionally. Dependency/lockfile version upgrades are outside this UI scope.

## 10. Production/database blockers and limitations

- Owner's confirmed production evidence: request_case exists with 15 arguments/11 defaults and compatible bodies/types; missing request_case_once/account_is_active/case_submission_keys. Last actual submit emits POST and returns HTTP404/PGRST202. The prior pre-network hypothesis was not reproduced. Minimal reviewed repair is prepared in `supabase/patches/`, **not applied**.
- Pending repair adds only helper/private key ledger/wrapper, checks compatibility, active citizen/target and idempotency, and restricts direct legacy request_case execution to close bypass. No production safety certification follows from button success. Read `docs/CASE_REQUEST_WRAPPER_REPAIR.md` for prerequisites, current-session OID/type-shadow reconciliation, staging concurrency/REST/ACL gates and recovery limitations. Do not remove guards to force installation.
- Numbered 007/008/009 contain broader security/atomic analysis/private original/source-allowlist changes; remote presence/compatibility for other flows is not proved just by a missing wrapper. Do not blindly run whole migrations or rerun 007 after 009. `docs/MIGRATION_READINESS_AUDIT.md` and `docs/STAGING_RUNBOOK.md` describe the separate planned checks.
- The earlier registered real-upload analysis failure remains unverified; UI/demo results do not repair remote finalizer/Storage/RLS state. No remote SQL or write is authorized in the current task.
- Broad legal corpus/current amendments/historical applicability, low-quality OCR/human accuracy, hosted timeouts/limits, shared multi-worker quotas, real-account isolation/private file handoff, billing/intake/monitoring and human/device/screen-reader acceptance remain bounded blockers/debt. Existing middleware deprecation and previously documented tooling advisories remain; do not make unrelated architecture/major-version changes.

## 11. Required tests by subsystem

| Changed area | Exact safe checks / additional integration gates |
|---|---|
| Citizen presentation | `node scripts/dev/v2-results-render-tests.mjs`; `node scripts/dev/v2-next-steps-tests.mjs`; `node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/context-and-citations-tests.mjs`; `node --experimental-loader ./scripts/dev/alias-loader.mjs scripts/dev/report-tests.mjs`; `node scripts/dev/citizen-findings-browser-tests.mjs` |
| Original/export/chat/scenario integration | `node scripts/dev/citizen-findings-linked-browser-tests.mjs` against the isolated labelled mock transport only; `node scripts/dev/v2-scenario-tests.mjs`, existing context/report/workflow suites; separately authorized hosted real-account/provider acceptance |
| Analysis/ingestion | Existing `analysis-service-tests`, `analysis-coverage-tests`, `ingestion-tests`, `extract-text-tests`, `legal-document-gate-tests`, `legal-relevance-classifier-tests`; no credentialed/live helper without target/privacy review |
| Next Steps / impact | `node scripts/dev/v2-next-steps-tests.mjs`, `node scripts/dev/v2-impact-tests.mjs`; source/version/applicability review is human, not an assertion count |
| Enterprise / lawyer | `node scripts/dev/v2-inquiry-tests.mjs`, `node scripts/dev/v2-lawyer-tests.mjs`, `node scripts/dev/v2-browser-tests.mjs --all`; real services/RLS not established by demo |
| Shared changes | `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test:safe -- --no-db`; 5 SQL suites are explicitly skipped, never claim full suite |
| Acceptance adapters/portfolio/price | `node scripts/dev/v2-acceptance-tests.mjs`; `node scripts/dev/v2-acceptance-ui-tests.mjs` with optional external `HAQ_TEST_RENDERER` pointing to React 19.2.8 dev renderer; `node scripts/dev/v2-acceptance-browser-tests.mjs` on the isolated empty-provider QA helper |

Browser scripts require private `HAQ_V2_EVIDENCE`, optional external `HAQ_PLAYWRIGHT_MODULE` (Windows `file:///...` URL), installed `HAQ_CHROME_PATH`, and dedicated loopback `HAQ_V2_QA_URL=http://127.0.0.1:3015`. Use process-only empty Supabase/provider values for the build/server, a fictional local demo-signing secret, and external egress denial. Never run against the owner's :3000 or export auth sessions. The linked browser transport is `scripts/dev/citizen-findings-provider-fixture.mjs`; an isolated loopback harness routes only chat/embeddings to it, blocks all other egress, and labels results MOCK QA. The actual selected report popup is inspected and captured as a headless browser PDF; native human print-dialog acceptance is unverified.

Reproducible server setup is now checked in: `node scripts/dev/citizen-findings-qa-server.mjs --build` creates the credential-isolated QA build and starts :3015; run `citizen-findings-browser-tests.mjs` and the citizen-only `v2-browser-tests.mjs` from another terminal. Stop that owned helper with Ctrl+C, then run `node scripts/dev/citizen-findings-qa-server.mjs --mock` and `citizen-findings-linked-browser-tests.mjs` from another terminal. Stop it afterward. `citizen-findings-qa-egress.cjs` is a child-only guard and not an application import; the mock has no credentials or network persistence. Do not reuse the generated QA build as a deployment artifact. Playwright is an optional external QA tool, not a new project dependency.

## 12. Architecture decision log

| Decision | Problem, choice and trade-off |
|---|---|
| Reuse domain outputs | UI overload did not require new AI/DTOs. Use existing deriveNextSteps and native details, keeping source/risk authorization boundaries unchanged. Full interpretation is preserved; the brief is deliberately an excerpt, not a new semantic summary. |
| Actual clause number, no title inference | No title contract exists. Use truthful Clause N rather than category/title guessing. More specific authoritative titles need a separately reviewed additive data contract. |
| Visible uncertainty + hidden verbosity | Priority/evidence/applicability/material review stay visible; original/full reasoning/provenance/navigation are disclosed. Progressive disclosure reduces reading load but human 5–10 second comprehension remains owner acceptance, not a test guarantee. |
| Consolidated actions | Repeated boilerplate obscured findings. One page-level review/preservation/consultation section and clause-specific procedural prompt retain advice without changing legal reasoning or consultation payloads. |
| Exact marker focus | Never infer offsets from clause number or translations. Open the existing viewer and focus only its validator-produced marker; otherwise compare without a highlight claim. No new highlight implementation. |
| Pure impact + honest demos | DB freeze and unverified provenance prevent real monitoring/intake. Pure engine plus synthetic presentation demonstrates computation; no fake service success, professional review, legal change or persistence. Future repositories/adapters need explicit authorization and tests. |
| Bounded What-if evidence | Reuse authorized context/ask history and canonical lexical excerpts with exact citation filtering. No extra embedding call/new provider; broader retrieval quality and scenario-specific persistence remain limited. |
| QA portfolio snapshot | Existing owner dataset is untracked and must remain unchanged. Commit only a validated synthetic snapshot and byte-identical PDFs, with source/PDF digests. Avoid runtime dependence on owner files or a production seed. Expectations are fixture markers, not AI/legal results. |
| Failure categories, no schema bypass | Retain bounded schema/access/uncertain categories and stage-specific copy; preserve old helpers. Whole migrations/legacy RPC fallback would violate the freeze and lose security safeguards. Remote missing-object presence must be established separately. |
| Isolated authoritative price edit | Existing field/grant/RLS supports price editing. Use a price-only session action plus confirmed returned row to avoid unrelated writes/zero-row fake success; keep existing self-edit role semantics. No new price schema or service-role privilege. |
| Preserve OCR correction | An attempted strict text/file mismatch gate conflicted with existing correction guidance. Use an explicit edited-text notice and optional detach, retain original bytes and analyze actual corrected text. No guessed PDF coordinate mapping. |

## 13. Safe continuation protocol

Inspect Git and preserve dirty work; trace existing callers; select the smallest compatible change; document failure paths and boundaries in code; run relevant safe checks; inspect actual browser evidence; update this handoff/report/ledger together. Apply a second review for information loss, false confidence, duplicate advice, input/state regressions and documentation accuracy. Stage exact owned files/hunks only. No production SQL/data/Storage/account actions, deploy, push, merge, env/domain edit or unapproved major dependency change. Never turn skipped tests or fixture success into production claims.
