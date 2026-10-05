# HAQ / حق — Codex Master Engineering Plan

## Mission

You are the principal engineer responsible for taking the existing repository from its current state to a stable, secure, legally grounded, hackathon-ready version of **حق / HAQ**.

This is an existing Jordanian LegalTech platform. Do **not** rebuild it from scratch. Repair and extend the real application.

Before touching code:

1. Read `AGENTS.md` completely.
2. Open `IMPLEMENTATION_STATUS.md` and use it as the live progress ledger.
3. Inspect the repository, package scripts, schema/migrations, env examples, routes, AI layer, auth layer, demo layer, and existing tests.
4. Record the baseline state before making changes.
5. Work incrementally in the priority order below.

The human owner explicitly gives you limited engineering autonomy: if you discover an adjacent security, data-integrity, authorization, crash, or serious reliability bug while implementing the approved work, you may fix it immediately if the change is localized and reversible. Log it in `IMPLEMENTATION_STATUS.md`. For broad/irreversible changes, stop and request approval.

---

# Completion contract — mandatory

For every task below:

- Keep the checkbox unchecked until the task is **implemented and verified**.
- Code written but not tested = incomplete.
- Build success alone does not prove runtime behavior.
- A configured API key does not prove API connectivity.
- A successful mock/test fixture does not prove production integration.
- A task blocked by credentials or external infrastructure remains unchecked and must be labeled `BLOCKED:` with the exact reason.
- A partially implemented task remains unchecked and must be labeled `PARTIAL:`.
- After each phase, update `IMPLEMENTATION_STATUS.md` with files changed, commands executed, actual results, and remaining problems.
- Never hide a failure behind hardcoded output, a heuristic fallback, a placeholder, or fake success UI.

---

# Product definition

**حق / HAQ** is a bilingual Arabic/English Jordanian LegalTech platform.

Core citizen journey:

**Upload → Read → Validate → Understand → Verify against legal sources → Ask → Find a lawyer → Act**

Core lawyer value:

**Receive relevant matters → manage cases/documents → use AI-assisted drafting/review → communicate with clients**

Existing stack should be preserved unless a change is technically necessary:

- Next.js 16.x App Router
- React 19.x
- TypeScript
- Tailwind CSS v4
- next-intl
- Supabase Auth/Postgres/RLS/Storage
- OpenAI server-side integration
- Radix UI
- Framer Motion
- Recharts
- dnd-kit

Do not replace these systems casually.

---

# PHASE 0 — Baseline audit and plan [P0]

## AUD-01 — Repository and architecture audit

- [ ] Read `AGENTS.md`, `README.md`, `.env.example`, `package.json`, Next.js configuration, Supabase schema and migrations, AI files, auth files, demo files, and relevant routes.
- [ ] Inspect current git state and protect unrelated uncommitted work.
- [ ] Confirm actual architecture rather than relying only on this prompt.
- [ ] Map citizen, lawyer, admin, demo, AI, document, marketplace, case, and storage flows.
- [ ] Identify current user-facing `QANUNI/Qanuni/qanuni/قانوني` occurrences and classify them as branding vs internal identifiers.
- [ ] Identify current AI fallback/placeholder paths.
- [ ] Identify document extraction capabilities and limitations.
- [ ] Identify current Supabase RLS/storage policies affecting documents/cases/messages/AI history.
- [ ] Identify current local vs credentialed test suites.

### Verification

- [ ] Baseline results are written to `IMPLEMENTATION_STATUS.md`.
- [ ] Confirmed defects are separated from suspected/deployment-only issues.

---

# PHASE 1 — Rebrand QANUNI to HAQ / حق [P0]

## BR-01 — Safe comprehensive user-facing rebrand

Goal: the platform presented to users is **حق** in Arabic and **HAQ** in English.

- [ ] Replace user-facing brand text across Arabic/English localization files.
- [ ] Update navbar, footer, login/signup, dashboard headings where the old product name appears.
- [ ] Update page metadata, titles, descriptions, Open Graph/PWA/manifest metadata if present.
- [ ] Update README/project description and user-facing product references.
- [ ] Update AI disclaimers/legal notices only where they contain the old brand name; preserve their safety meaning.
- [ ] Update text-based logo/wordmark presentation when technically safe.
- [ ] Search again for old brand occurrences and classify any remaining occurrence as intentionally internal or missed.
- [ ] Do **not** rename DB tables, RPCs, buckets, routes, env vars, stable code identifiers, or migrations just for branding.
- [ ] Do **not** change `qanuni.site`, DNS, OAuth redirects, or production canonical domain without explicit owner approval.

### Verification

- [ ] Arabic UI visibly shows `حق` where appropriate.
- [ ] English UI visibly shows `HAQ` where appropriate.
- [ ] No broken imports/routes/config caused by branding changes.
- [ ] Lint/typecheck/build relevant checks pass.

---

# PHASE 2 — Real AI system repair and centralization [P0]

## AI-01 — Audit and repair the live provider

Investigate at minimum:

- `src/lib/ai/provider.ts`
- `src/lib/ai/actions.ts`
- `src/lib/ai/engine.ts`
- all AI consumers

Checklist:

- [ ] Confirm how `OPENAI_API_KEY` and `OPENAI_MODEL` are loaded server-side.
- [ ] Confirm model availability/configuration and request format.
- [ ] Distinguish missing key, invalid key, quota/rate limit, timeout, network, invalid request, unsupported model, and malformed output.
- [ ] Add safe operational diagnostics without logging private document content or secrets.
- [ ] Implement reasonable timeouts and controlled retries for transient failures only.
- [ ] Use structured/schema-validated output where suitable.
- [ ] Add/repair a real server-side provider health check that does not equate “key exists” with “service works”.
- [ ] Keep provider/model configurable rather than scattering model names through the codebase.

### Verification

- [ ] A real AI request succeeds in an environment with valid credentials OR task is clearly blocked with evidence.
- [ ] A deliberately failed provider request surfaces a truthful error rather than fake output.

## AI-02 — Remove misleading AI fallbacks and placeholders

Known areas to verify include `aiLive()`, local heuristic engine behavior, legal drafting placeholders, and demo-only static results.

- [ ] Demo/live AI flows no longer return static contract analyses as if they were real.
- [ ] Legal drafting no longer returns placeholder text such as `[محتوى يتم توليده ...]` as a successful result.
- [ ] Provider failure does not silently become heuristic output presented as AI.
- [ ] Deterministic helper logic remains clearly separated from LLM success paths.
- [ ] Invalid/missing risk classification becomes `unknown/unverified`, not automatically low risk.
- [ ] Remove arbitrary confidence defaults; only show confidence when it has a defensible meaning.
- [ ] Repair lawyer drafting, regeneration, summarization, formal rewriting, translation, and other AI tools.
- [ ] Repair citizen contract analysis, consultations, legal assistant, and follow-up questions.

### Verification

- [ ] Two materially different documents produce content-specific analyses.
- [ ] Two materially different drafting instructions produce appropriately different drafts.
- [ ] Provider failure test shows explicit failure/retry UI.
- [ ] No production path falsely claims an AI result when the LLM did not return one.

## AI-03 — Conversation context and prompt safety

- [ ] Verify `askTheLawTurn()` / `askTheLawAction()` and equivalent flows carry relevant authorized history.
- [ ] Add context-window management so conversations remain coherent without unbounded token growth.
- [ ] Keep user facts, contract text, retrieved legal sources, and model instructions clearly separated.
- [ ] Treat instructions embedded in uploaded documents/retrieved content as untrusted data.
- [ ] Prevent prompt-injection content from overriding system/security rules.

### Verification

- [ ] Follow-up question can correctly refer to a previous turn.
- [ ] Cross-user/cross-document context leakage test fails safely.

---

# PHASE 3 — Demo mode becomes fully functional but isolated [P0]

## DM-01 — Real functionality for demo citizen/lawyer/admin

Owner requirement: demo users should experience the same core functionality as the corresponding real role, including real AI, without gaining unauthorized access to production data.

- [ ] Remove demo redirection to canned contract analysis.
- [ ] Demo citizen can upload and analyze an actual legal document with live AI.
- [ ] Demo citizen can use legal assistant/follow-up questions.
- [ ] Demo citizen can browse the existing lawyer marketplace.
- [ ] Demo lawyer can generate real legal drafts and use relevant AI tools.
- [ ] Demo admin can explore admin workflows only on isolated demo data.
- [ ] Demo role selection cannot create a real privileged server session.
- [ ] Replace trust in editable client state/cookies with a server-validated demo-session mechanism for privileged/paid operations.
- [ ] Add reasonable public/demo AI rate limits and request-size limits.
- [ ] Prevent unintended external side effects from demo workflows (e.g. accidental request to a real lawyer) while keeping the workflow demonstrable.

### Verification

- [ ] Demo citizen full critical path works end-to-end with actual input.
- [ ] Demo lawyer drafting works with actual instructions.
- [ ] Demo admin cannot read/change real production data.
- [ ] Tampering with demo cookies/state does not grant real permissions.

---

# PHASE 4 — Unified document pipeline, OCR, and legal validation [P0]

## DOC-01 — Unified secure document ingestion

Create/reuse one coherent server-side document pipeline for citizen and lawyer tools.

Target formats:

- PDF
- DOCX
- TXT
- JPG/JPEG
- PNG
- WEBP
- scanned PDFs

Checklist:

- [ ] Validate extension + MIME + file signature + file size server-side.
- [ ] Reject corrupted/unsupported inputs safely.
- [ ] Extract embedded PDF/DOCX/TXT text directly when reliable.
- [ ] Preserve original file metadata and extracted text relationships.
- [ ] Avoid duplicate extraction logic across citizen/lawyer features where one shared service is appropriate.
- [ ] Protect against oversized/decompression-abuse inputs.

## OCR-01 — Arabic/English OCR

- [ ] Add OCR for scanned PDFs and image uploads.
- [ ] Support Arabic, English, and mixed text.
- [ ] Preserve page/order/paragraph structure as reasonably as possible.
- [ ] Use OCR only when needed; do not route every text PDF through expensive vision processing.
- [ ] Detect insufficient extraction quality and ask for a clearer upload rather than inventing text.
- [ ] Ensure chosen OCR approach is compatible with the actual deployment runtime.

### Verification

- [ ] Arabic image contract extracts readable text.
- [ ] English image contract extracts readable text.
- [ ] Scanned PDF works.
- [ ] Text PDF uses direct extraction path.
- [ ] Blurry/unreadable input produces an honest failure/warning.

## VAL-01 — Reject non-legal content before full analysis

- [ ] After extraction, classify whether content is plausibly legal/relevant.
- [ ] Accept common contracts, legal notices, court-related documents, and unfamiliar but plausibly legal documents.
- [ ] Reject random unrelated photos/files before expensive legal analysis.
- [ ] Use an `uncertain` path instead of aggressively rejecting ambiguous legitimate documents.
- [ ] Do not rely on filename alone or one keyword.
- [ ] Keep free-text legal consultation available even when no formal document exists.
- [ ] Reuse/cache intermediate extraction/classification results safely to reduce repeated API cost.

### Verification

- [ ] Legal contract accepted.
- [ ] Legal notice accepted.
- [ ] Unfamiliar plausible legal document handled safely.
- [ ] Random photo rejected.
- [ ] Empty/unreadable document handled explicitly.

---

# PHASE 5 — Long-document correctness and persistence [P0]

## LNG-01 — No silent truncation

Known issue to inspect: any `slice`/limit around ~20,000 characters in the contract-analysis flow.

- [ ] Preserve complete extracted text.
- [ ] Replace silent truncation with section/clause-aware chunking or another context-safe method.
- [ ] Preserve clause relationships and document order.
- [ ] Track which sections were analyzed.
- [ ] Consolidate chunk results without duplicating/contradicting findings silently.
- [ ] Explicitly label partial analysis if full coverage fails.

### Verification

- [ ] Long multi-page contract shows measurable full/partial coverage truthfully.
- [ ] Important content near the end is not silently ignored.

## DB-01 — Reliable document/analysis storage

- [ ] Verify original uploaded document storage strategy.
- [ ] Store private files securely when persistence is required.
- [ ] Maintain relationship among original file, extracted text, analysis, clauses, chat, case, citizen, authorized lawyer.
- [ ] Review analysis creation + clause insertion + status update for partial-write risk.
- [ ] Use transaction/atomic strategy where needed.
- [ ] Fix database hooks that convert real failures into empty arrays.
- [ ] Prevent duplicate submissions from double-click/retry.
- [ ] Preserve user input where safe after recoverable failure.

### Verification

- [ ] Simulated DB failure does not leave misleading “complete” analysis state.
- [ ] Private source document is inaccessible to unauthorized user.
- [ ] Repeated submit does not create unintended duplicates.

---

# PHASE 6 — Verified Jordanian legal knowledge / RAG [P1]

## RAG-01 — Build a trustworthy legal source layer

Primary sources to investigate and use where permitted/available:

- Jordanian Legislation and Opinion Bureau — `https://lob.gov.jo/`
- Jordanian Prime Ministry / Official Gazette — `https://www.pm.gov.jo/`
- Jordanian Ministry of Justice — `https://www.moj.gov.jo/`
- Jordanian Constitutional Court — `https://www.cco.gov.jo/`

Do not bypass access restrictions or assume an API exists.

Checklist:

- [ ] Replace/demo-label the current placeholder `legal_sources` behavior with a verified-source architecture.
- [ ] Define/store structured metadata: title, source, law number/year, article number/text, URL, publication date, effective date, amendment/repeal status, version, retrieval/verification timestamp.
- [ ] Distinguish legislation, judicial decisions, official interpretations, and commentary by authority/type.
- [ ] Evaluate existing Supabase/Postgres + pgvector before adding new infrastructure.
- [ ] Implement hybrid retrieval (semantic + lexical/metadata where useful).
- [ ] Retrieve only relevant source passages for the current task.
- [ ] Validate citations before presenting them as verified.
- [ ] Never fabricate law/article/case references.
- [ ] If a reliable source cannot be found, say the legal proposition is unverified.
- [ ] Track legal version/effective date so historical matters do not automatically use the newest text.
- [ ] Build a maintainable ingestion/update workflow with verification before publication.
- [ ] For hackathon scope, prioritize a smaller verified corpus: rental, employment, civil obligations, commercial contracts, and areas already demonstrated by the app.

### Verification

- [ ] Each displayed verified citation resolves to a stored source and supports the associated claim.
- [ ] Invalid article number test is rejected/not presented as verified.
- [ ] Missing-source case surfaces uncertainty.
- [ ] Conflicting/outdated legal source case is handled explicitly.

---

# PHASE 7 — Citizen contract-analysis UX [P1]

## CIT-01 — Simplify the citizen experience

Primary Arabic concept: **افهم عقدك قبل ما توقّع**.

- [ ] Keep the upload page simple and understandable to a non-lawyer.
- [ ] Support drag/drop, file select, image upload, mobile camera where supported, and pasted text where appropriate.
- [ ] Do not ask unnecessary questions before upload.
- [ ] Auto-detect document type when reliable.
- [ ] Ask role/context questions only when they materially affect the analysis.
- [ ] Show truthful processing stages: upload → extract → validate → classify → retrieve sources → analyze → results.
- [ ] Present plain-language summary, rights, obligations, deadlines, financial obligations, potential risks, verified references, uncertainty, and next steps.
- [ ] For each flagged clause, show the actual clause text plus explanation and source support where available.
- [ ] Never equate “unusual” with “illegal”.
- [ ] Provide clear actions: ask follow-up, review original, save, export, find lawyer, request consultation.

### Verification

- [ ] A non-technical tester can complete the flow without hidden developer knowledge.
- [ ] Arabic mobile layout works.

---

# PHASE 8 — Highlight findings inside the contract [P1]

## HLT-01 — Contextual clause highlighting

- [ ] Highlight relevant analyzed clauses in the extracted contract text.
- [ ] Support high/medium/low/unknown indicators without relying on color alone.
- [ ] Clicking/selecting a finding opens contextual detail: original clause, concern, explanation, verified sources, uncertainty, next step.
- [ ] Map findings to actual text using stable offsets/IDs or another defensible method.
- [ ] For OCR documents, only map to rendered-page coordinates if those coordinates are reliable; otherwise highlight extracted text.
- [ ] If mapping is uncertain, present the finding separately rather than fabricating a location.
- [ ] Keep the viewer responsive on mobile and desktop.

### Verification

- [ ] Highlighted text exactly corresponds to the source clause.
- [ ] Missing/ambiguous offset case does not create a false highlight.

---

# PHASE 9 — Contract-aware legal chat [P1]

## CHAT-01 — Ask questions about the analyzed contract

Build on the existing assistant rather than creating a disconnected chatbot.

- [ ] User can ask about a clause, obligation, deadline, termination, payment, risk, or plain-language meaning.
- [ ] The contract is the primary document context.
- [ ] Retrieve relevant contract sections rather than always sending the entire document.
- [ ] Retrieve verified legal sources when the answer depends on law.
- [ ] Distinguish “the contract says” from “the law may require”.
- [ ] Maintain relevant conversation history.
- [ ] Never invent missing contract terms.
- [ ] Surface uncertainty and recommend lawyer review for fact-specific judgment.
- [ ] Enforce user/document authorization and context isolation.

### Verification

- [ ] Follow-up question references prior answer correctly.
- [ ] Answer cites relevant contract section where applicable.
- [ ] Cross-user context isolation test passes.

---

# PHASE 10 — Lawyer marketplace integration [P1]

## MKT-01 — “ابحث عن محامٍ” everywhere it matters

Reuse the existing marketplace. Do not create another one.

- [ ] Verify/add “ابحث عن محامٍ” on public landing page.
- [ ] Verify it on citizen dashboard.
- [ ] Add/verify it in citizen sidebar.
- [ ] Add it to relevant analysis result and consultation flows.
- [ ] Preserve locale when navigating.
- [ ] Support demo browsing.
- [ ] Avoid duplicate UI if a working button already exists.

## MKT-02 — Analysis → lawyer consultation handoff

- [ ] Citizen can intentionally share relevant analysis with a lawyer through the existing case/consultation workflow.
- [ ] Share only authorized information: case description, contract type, selected analysis summary, relevant findings, verified references, source document only when consented.
- [ ] Unrelated lawyers cannot access private material.
- [ ] Demo mode does not accidentally contact real lawyers unless intentionally transitioned to a real authenticated workflow.

### Verification

- [ ] End-to-end real/safe test: analyze → find lawyer → request → lawyer sees authorized data.
- [ ] Unauthorized lawyer access fails.

---

# PHASE 11 — Export analysis report [P2]

## PDF-01 — Professional Arabic/English PDF report

- [ ] Export the selected real analysis, not a sample.
- [ ] Include HAQ branding, generation date, document title/type, summary, rights/obligations, risks, clause excerpts, verified legal references, suggested next steps, and limitations where available.
- [ ] Only verified citations appear as authoritative.
- [ ] Support Arabic RTL, English, mixed content, long reports, and sensible page breaks.
- [ ] Keep private internal IDs/secrets out of the report.
- [ ] Handle export failure explicitly.

### Verification

- [ ] Arabic PDF renders correctly.
- [ ] Long report renders without broken text/page overflow.
- [ ] Export matches the currently selected analysis.

---

# PHASE 12 — Legal identity animations [P2]

## ANIM-01 — Scales and analysis animations

Framer Motion already exists in the project; prefer it instead of adding another animation dependency.

- [ ] Add a subtle scales-of-justice motion where it improves identity/page transitions.
- [ ] Add a professional contract-analysis animation (document scan line / subtle scales / gold accent).
- [ ] Use truthful stage labels rather than fake percentage progress.
- [ ] Do not delay a completed navigation/analysis just to show animation.
- [ ] Respect `prefers-reduced-motion`.
- [ ] Avoid excessive motion/CPU/layout shift.
- [ ] Preserve dark/gold visual language and mobile responsiveness.

### Verification

- [ ] Reduced-motion mode is respected.
- [ ] Animation does not block interaction or materially degrade mobile performance.

---

# PHASE 13 — Security and authorization hardening [P0/P1]

## SEC-01 — Auth, RLS, storage, secrets, prompt injection

- [ ] Verify server-side authorization for all affected sensitive actions.
- [ ] Review relevant Supabase RLS policies after schema/workflow changes.
- [ ] Review private Storage policies/signed URL use.
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` remains server-only.
- [ ] Ensure demo role/cookie tampering cannot elevate privilege.
- [ ] Verify admins cannot read case-private content beyond intended metadata permissions.
- [ ] Sanitize/render AI output safely.
- [ ] Protect AI prompts/tools from document/retrieval prompt injection.
- [ ] Add rate/request limits where public/demo AI can be abused.
- [ ] Avoid logging sensitive legal content unless strictly necessary and intentionally redacted.

### Verification

- [ ] Existing/local authorization tests pass.
- [ ] Live RLS/storage tests run when safe credentials exist OR are clearly marked not run.
- [ ] No secret appears in client bundle/repository/log output.

---

# PHASE 14 — System reliability and error handling [P0/P1]

## REL-01 — Honest async states and recovery

- [ ] Every critical async flow distinguishes loading/success/empty/error.
- [ ] Network/AI/DB/upload/OCR/auth errors have clear Arabic+English messages.
- [ ] No infinite spinner after thrown errors.
- [ ] Retry exists only where safe.
- [ ] User input is preserved for safe retries.
- [ ] Failed DB query is not displayed as an empty list.
- [ ] Analysis status cannot claim completion when persistence failed.
- [ ] Notifications/status changes accurately reflect real operations.

### Verification

- [ ] Inject/test representative failures for AI, upload, OCR, and database layers where practical.

---

# PHASE 15 — Final QA and acceptance [P0]

## QA-01 — Execute available automated checks

Run and record actual results for the relevant available commands:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run build
node scripts/dev/analysis-coverage-tests.mjs
node scripts/dev/meaningful-content-tests.mjs
node scripts/dev/extract-text-tests.mjs
node scripts/dev/legal-relevance-classifier-tests.mjs
node scripts/dev/authz-tests.mjs
node scripts/dev/smoke.mjs
```

Use live Supabase QA only when the environment is correct and cleanup is understood:

```bash
node scripts/dev/qa-fixtures.mjs create
node scripts/dev/live-authz.mjs
node scripts/dev/qa-fixtures.mjs remove
```

- [ ] Never run destructive/live credentialed scripts blindly.
- [ ] Never report skipped/blocked tests as passed.

## QA-02 — Required manual scenarios

### Demo citizen

- [ ] Enters demo without registration.
- [ ] Uploads a real Arabic legal document.
- [ ] Image/scanned document OCR works.
- [ ] Random unrelated image is rejected.
- [ ] Real AI analyzes actual content.
- [ ] Legal source references shown as verified only when validated.
- [ ] Findings map accurately to clauses.
- [ ] User asks a follow-up question about the contract.
- [ ] User opens lawyer marketplace.
- [ ] Demo workflow stays isolated from private production data.

### Demo lawyer

- [ ] Enters demo without registration.
- [ ] Generates a real draft from custom instructions.
- [ ] Regeneration changes according to instruction.
- [ ] Summarization/formal rewrite/translation use actual input.
- [ ] Failure path is honest when AI is unavailable.

### Registered users

- [ ] Registered citizen critical flow works.
- [ ] Registered lawyer critical flow works.
- [ ] Authorized citizen-to-lawyer handoff works.
- [ ] Unauthorized access fails.

### UI

- [ ] Arabic RTL works.
- [ ] English LTR works.
- [ ] Mobile critical flows work.
- [ ] Desktop critical flows work.
- [ ] Loading/error/empty states are understandable.
- [ ] Reduced-motion preference works.

---

# Final acceptance gate

Do **not** describe HAQ as hackathon-ready until all P0 tasks are either checked `[x]` or explicitly documented as blockers accepted by the human owner.

Minimum acceptance criteria:

- [ ] User-facing rebrand to حق / HAQ is complete without unsafe internal renames.
- [ ] Demo citizen can analyze an actual uploaded legal document with real AI.
- [ ] Demo lawyer can generate an actual relevant legal draft with real AI.
- [ ] Supported images/scanned documents work through OCR.
- [ ] Non-legal random images are rejected before full legal analysis.
- [ ] Long documents are not silently truncated.
- [ ] AI failure never appears as successful fake analysis/draft.
- [ ] Missing risk data never defaults deceptively to low risk.
- [ ] Verified legal citations are traceable and real.
- [ ] Citizen can understand findings and locate them in the contract when mapping is reliable.
- [ ] Citizen can ask contract-aware follow-up questions.
- [ ] Citizen can reach the existing lawyer marketplace and initiate the correct consultation flow.
- [ ] Demo/admin boundaries and real-user privacy remain intact.
- [ ] Relevant RLS/storage/security checks pass or untested items are explicitly reported.
- [ ] Lint/typecheck/build pass after the final changes.
- [ ] Relevant local tests pass.
- [ ] All unresolved blockers/limitations are documented truthfully.

---

# Final report format

At the end, produce a concise engineering report with these exact sections:

## 1. Architecture understood
Summarize the actual architecture you found.

## 2. Confirmed root causes
List confirmed bugs only; separate hypotheses.

## 3. Changes implemented
Map changes to task IDs.

## 4. Files changed
List files and the reason for each meaningful change.

## 5. Database/storage/config changes
List migrations, policies, buckets, env vars, and external setup.

## 6. Verification evidence
List commands actually run and their actual results.

## 7. Manual scenarios verified
State exactly what was exercised.

## 8. Discovered issues
Include extra issues found during work and whether you fixed them under the autonomy rules.

## 9. Blocked/unverified items
No euphemisms. State exactly what is not proven and why.

## 10. Deployment checklist
Provide safe steps; do not deploy automatically unless explicitly instructed.

## 11. Final readiness statement
Only say “ready” if the acceptance gate above is truly satisfied. Otherwise say what remains.

---

# Start now

1. Read `AGENTS.md`.
2. Initialize/update `IMPLEMENTATION_STATUS.md` with the baseline.
3. Audit the repository and run safe baseline checks.
4. Report the confirmed baseline findings and implementation order.
5. Begin P0 work incrementally.
6. Update the status ledger after every substantial change.
7. Never mark a checkbox complete without verification evidence.
