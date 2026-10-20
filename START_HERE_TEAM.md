# START HERE — HAQ / حق

Team entry point, maintained 2026-10-20 (Asia/Amman). Read this file first, then [AGENTS.md](AGENTS.md), [CODEX_MASTER_PLAN.md](CODEX_MASTER_PLAN.md), the latest [implementation ledger](IMPLEMENTATION_STATUS.md) and the [technical handoff](docs/HAQ_V2_DEVELOPER_HANDOFF.md). Historical checkboxes and fixture expectations are not production acceptance.

## 1. Product and current decision

HAQ helps Jordanian citizens understand legal documents, inspect supporting sources and intentionally contact lawyers. Lawyers have case-management and AI-assisted professional tools. Arabic RTL, English LTR and the existing navy/gold identity are preserved. The current domain and internal Qanuni identifiers are intentional; do not rename infrastructure for branding.

**Source handoff and production release are independent. Production database repair remains NO-GO.** The owner authorized publication of the reviewed `staging-prep` source to the private repository and one local, unencrypted configuration-bearing ZIP. That authorization does not permit SQL, deployment, production records/Storage changes, main changes or future pushes.

## 2. Citizen: implemented versus incomplete

Implemented locally: upload/paste, validated PDF/DOCX/TXT extraction and provider-backed OCR paths, legal-document gate, section analysis, bounded source retrieval, simplified Risks & Clauses, original-text comparison, exact validated highlights, contract questions/What-if, selected-analysis export and existing marketplace/consented consultation UI. Upload and consultation failures retain input and distinguish safe error categories; unconfirmed writes never become success.

The completed citizen simplification in `1f96a692f2bb6f087fc6b57047d7d91481773efe` is preserved. **Do not rebuild it.** File/OCR/AI capabilities in source are not proof of real-account or hosted accuracy. Original storage, atomic final analysis persistence and real consultation are blocked by missing remote objects. Registered cross-account/privacy and end-to-end acceptance remain open.

## 3. Lawyer and admin: implemented versus incomplete

Existing lawyer requests, accepted-case workspace, messages, documents, notes, fees, calendar and drafting tools are retained. Navigation is simplified; own reviews and an explicitly unavailable subscription preview remain. The price-only server action validates JOD decimals, derives active identity, uses the authoritative existing `lawyers.consultation_price` field through session RLS and requires confirmed returned data. No new schema or service-role bypass was added.

Real fee save/relogin/public-directory readback is **unverified**. Professional actions require the existing active/approved/non-demo checks; self-edit retains existing role semantics. Demo price edits are memory-only and reset. Admin approval/user/report adapters are existing guarded operations; demo admin has no real privileges. None of this certifies hosted authorization.

## 4. Enterprise: implemented versus incomplete

The browsable synthetic portfolio derives counts from data: **3 fictional organizations, 36 contracts (14/12/10), 25 employment contracts and 100 topic markers**; 11 review and 24 clarification markers are fixture expectations. Search/filter/details/downloads use byte-checked fictional PDFs. Six hypothetical scenarios across four topics use the pure impact engine; the mapped all-portfolio employment cohort is 25 contracts. Markers are not verified legal clauses or violations.

The review queue is memory-only, without professional assignment. Real inquiry submission is disabled; explicit fictional validation sends/saves nothing. There is no production tenant repository, service intake, billing, subscription entitlement, live legislation monitoring or uploaded-amendment ingestion. Do not describe these demonstrations as running B2B services.

## 5. Real, demo and mock boundaries

Normal authorized demo AI uses actual input and the real provider; signed expiring server demo sessions do not grant real account privileges. Demo records/files/history are isolated memory and reset on reload. A separately selected static sample is labelled. The safe QA helper blanks provider/Supabase credentials, so analysis/OCR fail honestly. Its optional `--mock` transport is explicitly synthetic, never live AI or legal evidence. No hidden heuristic-success fallback is acceptable.

## 6. Architecture and folders

| Path | Responsibility |
|---|---|
| `src/app/[locale]`, `src/i18n`, `src/messages` | App Router portals, locale-aware navigation, Arabic/English messages |
| `src/components` | Existing citizen/lawyer/Enterprise/layout/UI components |
| `src/lib/auth`, `src/lib/supabase` | Verified server identity, active/role checks, session clients and server-only privileged client |
| `src/lib/data` | Scoped queries, safe failures and atomic/idempotent RPC adapters |
| `src/lib/documents` | Validation, extraction/OCR, originals, exact highlights and reports |
| `src/lib/ai`, `src/lib/legal` | Server provider, schemas, bounded analysis/chat and small curated source corpus |
| `src/lib/demo` | Signed demo sessions and isolated memory state |
| `src/lib/impact`, `src/lib/enterprise` | Pure potential-impact engine and fictional portfolio/inquiry validation |
| `supabase/migrations`, `supabase/patches`, `supabase/diagnostics` | Historical schema and **unapproved** guarded repair/diagnostic sources |
| `scripts/dev`, `qa-fixtures`, `public/enterprise-demo-contracts` | Controlled QA utilities, original fictional pack and public synthetic PDFs |

Server Actions/server-only modules own sensitive operations. Browser identity fields and UI guards never substitute for server checks/RLS. Source text, model output and retrieved material are untrusted. Never log document contents, keys, signed URLs or sessions.

## 7. Stack and startup

Next.js **16.3.8**, React **19.2.8**, TypeScript 5, Tailwind 4, next-intl, Supabase and existing OpenAI integration; Radix, Framer Motion, Recharts and dnd-kit. Use **Node 24**, npm and the committed lockfile. Read relevant installed Next documentation before unfamiliar implementation work; do not switch frameworks/providers/package managers or upgrade major dependencies casually.

In a fresh checkout **without `.env.local`**, run:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run lint
npx --no-install tsc --noEmit
npm run test:safe -- --no-db
node scripts/dev/qa-egress-tests.mjs
node scripts/dev/citizen-findings-qa-server.mjs --build
```

Open `http://127.0.0.1:3015/ar` or `/en`, use role demos and `/enterprise/demo`, then stop the owned helper with Ctrl+C. It supplies a fictional process-only signing value and denies external server egress. Do not kill unrelated listeners. Normal `npm run dev` automatically loads local credentials and is **not** this isolated startup. See [onboarding](docs/TEAM_ONBOARDING.md) for optional browser setup and mock mode.

## 8. Environment and confidential ZIP

GitHub supplies `.env.example`, never actual environment keys. Existing names are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`, optional `OPENAI_EMBEDDING_MODEL` and server-only `DEMO_SESSION_SECRET`. Values must be configured privately only for an explicitly authorized target; localhost does not imply isolation. Provider/service/signing keys must remain server-only.

The separately delivered **local unencrypted** `HAQ_FULL_WITH_KEYS_2026-10-20.zip` intentionally contains the owner's actual `.env.local` and existing project deployment-link configuration. Treat it as confidential: do not upload, commit, email, auto-sync or run its configured integrations by default. Keep it outside cloud-sync directories. It is a configuration/source handoff, **not** a database or Storage backup. No new credentials were generated or retrieved from external services for this archive. Git authentication/system/browser credentials are excluded.

## 9. Confirmed Supabase state

Owner-run production checks, not new agent SQL: eight core tables (`profiles`, `lawyers`, `documents`, `document_clauses`, `analyses`, `cases`, `case_events`, `notifications`) exist, are postgres-owned and RLS-enabled. Legacy `request_case` has 15 arguments/11 defaults; its body and three case helper bodies match migration 004; its insert trigger is active. Authenticated can execute the legacy creator; anon cannot.

Confirmed absent: `documents.original_storage_path`, private `citizen-documents` bucket, `finalize_document_analysis`, `request_case_once`, `account_is_active` and `case_submission_keys`. Actual consultation reached POST RPC and returned **HTTP404/PGRST202**; the earlier pre-network hypothesis is not the current confirmed cause. Other prerequisite columns/ACLs/policies/Storage behavior must still be verified.

## 10. C1, C2 and C3: candidates, not installations

| Candidate | Scope and safeguards | Evidence / status |
|---|---|---|
| [C1](supabase/patches/case_request_wrapper.sql) | Private active-account helper, private RLS idempotency ledger and authenticated-only wrapper; active citizen/target, unchanged 004 creator, same-key payload guard, locking and duplicate prevention. Restricts direct legacy EXECUTE to close bypass; do not weaken this. | Preserved unchanged. Historical 37 disposable checks are documented, **not rerun here**. Native concurrency/hosted acceptance remain open. |
| [C2](supabase/patches/document_analysis_c2_candidate.sql) | Four clause provenance columns, unknown risk/NULL confidence, scoped active/parent guards and atomic eight-ID finalizer. Explicit SQL-NULL/type/quote validation; locked owner/document and retry semantics. | Default-aborting `OWNER_REVIEW_REQUIRED` catalog pin; source/static review only, no SQL parsing/runtime or installation approval. |
| [C3](supabase/patches/private_originals_c3_candidate.sql) | Three original metadata columns; private create-only 10 MiB/six-MIME bucket; safe read gates and restrictive policies against OR bypass. Active owner/consented approved non-demo assignee only; no public originals/upsert/UPDATE access. Keeps C1 helper private. | Depends on reviewed C1+C2; per-stage catalog pin and all guards retained. Source/static review only; hosted Storage API/restore not verified. |

Do not replay 004 or blindly execute 007–009. Whole migrations have broader state/security/Storage effects, can overwrite stronger C1, conflict with private-helper ACLs or omit safeguards. Never mark a whole migration installed for a subset. Preserve every pending candidate and the complete ledger.

## 11. Why production remains NO-GO

Missing catalog/definition/policy/ACL/anomaly evidence, complete encrypted DB/Auth/config backup, **separate actual Storage bytes plus manifest/hashes**, and a supported isolated restore rehearsal are unresolved. Do not assume PITR exists. Recovery needs agreed RPO/RTO, write/DDL pause/drain and post-checkpoint reconciliation. Native SQL rollback/concurrency, managed Storage API, registered-account/privacy tests and owner approval of exact execution-copy hashes remain mandatory. A successful SQL installation or button is not overall security proof.

See the [candidate gates and operator runbook](docs/PRODUCTION_COMPATIBILITY_CANDIDATES.md), [production readiness](docs/PRODUCTION_DATABASE_COMPATIBILITY_READINESS.md), [C1 repair](docs/CASE_REQUEST_WRAPPER_REPAIR.md) and [migration audit](docs/MIGRATION_READINESS_AUDIT.md). The [single-result read-only preflight](supabase/diagnostics/production_compatibility_20261019_single_result.sql) is prepared for separately approved owner execution, **not permission to run it now**.

## 12. Actual verification and limits

The clean Windows checkout at `978f610bcc127bc18f2f14ebefb384a46628d644` used Node24.19.0/npm11.17.0, no copied environment/dependencies/build, and fresh locked installation. Lint, TypeScript, build (91 pages), 23 acceptance cases and QA egress probe passed. `test:safe -- --no-db` passed **24/29 suites with five explicit SQL skips**. Four automated Chrome contexts passed: ar360 reduced/ar390 normal/en390 reduced/en1440 normal, with no observed external requests, hydration/page errors or overflow. Representative rendered frames were inspected. These are automated synthetic/controlled-adapter checks, not owner-operated real-account acceptance.

No fresh full runtime suite is claimed for this documentation-only publication step. Exact commands, prior failures/corrections, file preservation and exclusions are in [TEAM_HANDOFF_READINESS](docs/TEAM_HANDOFF_READINESS.md). Five SQL suites, current C1 regression execution, C2/C3 SQL, live provider/OCR, hosted RLS/Storage, backup restore and real fee/intake persistence remain unverified. Existing middleware/tooling deprecations and historical tooling advisories need scoped review; no fresh vulnerability audit is claimed.

## 13. Priority order and acceptance

1. Owner/DB/operations: authorize and prove recovery, complete consolidated preflight and legacy-caller impact review.
2. After separate SQL/staging approval: rehearse guarded C1, renewed reviewed pin C2, renewed reviewed pin C3; test denial, rollback and native races, not just installation.
3. After exact-copy/target approval and separate acceptance-write authorization: registered citizen upload → original hash/private access → finalization/reload → no-document and consented-document requests → intended approved active lawyer. Test retries/changed payload/inactive actor and target/foreign access; prove one case/event/notification/key.
4. Verify real lawyer decimal save/relogin/public-directory readback and unchanged approval state using existing schema; do not assume demo persistence.
5. Legal reviewer: current source/version/applicability and hypothetical impact mappings. Product/security/counsel: genuine Enterprise intake/tenant/service model, privacy wording, hosted limits/distributed abuse controls. Deploy only after separate release approval.

Suggested owners, files, dependencies and evidence are in [TEAM_BACKLOG](docs/TEAM_BACKLOG.md). The legal corpus is eight selected Labour Law excerpts from a July2025 snapshot, not comprehensive/current-law certification. Privacy wording still needs [owner/counsel review](docs/PRIVACY_REVIEW_DRAFT.md).

## 14. Branch workflow and exact continuation checkpoint

Repository: `https://github.com/OmarKerdase/HAQ`, PRIVATE confirmed through authenticated metadata during this handoff. Continue from **the published `staging-prep` HEAD**, not `main`. Starting source handoff was `56054163ee2274d741b61d49610830dc94b904ed`; runtime-tested implementation checkpoint is `978f610bcc127bc18f2f14ebefb384a46628d644`. The new documentation-only commit introduces this file. Resolve its exact immutable checkpoint with:

```bash
git branch --show-current
git rev-parse HEAD
git log -1 --format=%H -- START_HERE_TEAM.md
git status --short
```

The owner's final delivery report supplies the final commit SHA and ZIP hash. A commit cannot contain its own SHA. If publication is blocked, use the local `staging-prep` commit reported by the owner; do not assume it exists remotely.

Create `feature/*`, `fix/*` or `db/*` from the current integration branch, use focused commits and PRs into `staging-prep`. No direct/force push to `main`, no merge/deploy without owner approval. Read [TEAM_WORKFLOW](docs/TEAM_WORKFLOW.md) and the PR template. Available GitHub hooks/deployments/environments were empty and the local Actions workflow contains checks only; external Vercel settings were not accessible. A local Vercel link alone does not establish a Git deployment trigger. Recheck connected deploy settings before future publication/release.

Next developer/AI: inspect Git and preserve dirty work; trace existing callers; PLAN → IMPLEMENT → TEST → INSPECT → CHALLENGE → FIX → RETEST → DOCUMENT. Maintain meaningful contracts/comments, handoff and append-only evidence. Do not replace completed citizen UI, fabricate success, weaken authorization/idempotency, erase uncertain data, expose secrets or silently execute diagnostic/repair SQL. Existing reports' earlier no-publication instructions describe their historical task boundary; this owner's one-branch publication authorization supersedes that boundary only for this handoff. Production remains frozen.
