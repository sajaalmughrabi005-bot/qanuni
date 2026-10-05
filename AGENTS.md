<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# HAQ / حق — AI Coding Rules

This file is the persistent operating contract for every AI coding agent working in this repository, including Codex, Claude Code, and future agents. Read it before touching code. If a task-specific prompt conflicts with this file, the stricter safety/correctness rule wins unless the human owner explicitly overrides it.

## 1. Product identity and scope

- Product name shown to users: **حق** in Arabic and **HAQ** in English.
- Product positioning: a Jordanian LegalTech platform that helps citizens understand legal documents, grounds relevant explanations in verified Jordanian legal sources, and connects citizens with lawyers; lawyers receive AI-assisted professional tools and case-management workflows.
- Preserve the existing bilingual Arabic/English experience, Arabic RTL, English LTR, dark/gold visual identity, and current role structure: citizen, lawyer, admin, plus isolated demo modes.
- Do **not** rename internal database tables, storage buckets, RPCs, environment variables, routes, or stable identifiers merely to make them match the new brand. User-facing branding should become HAQ/حق; internal renames require a real technical reason and safe migration.
- The current public domain may remain `qanuni.site` until the human owner explicitly decides on a new domain. Do not change production domains, DNS, OAuth redirect URLs, or canonical URLs without explicit approval.

## 2. Non-negotiable engineering behavior

- Inspect before editing. Trace the relevant flow end-to-end before changing it.
- Preserve working behavior. Do not delete a feature because repairing it is hard.
- Prefer focused changes over broad rewrites.
- Reuse existing components, helpers, services, types, styles, and infrastructure when suitable.
- Do not introduce a new framework, database, state library, or major dependency without necessity.
- Do not perform major-version dependency upgrades unless the task explicitly requires it.
- Never expose `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, tokens, secrets, private signed URLs, or private document contents in client code or logs.
- Never weaken RLS, server authorization, role checks, or storage policies to make a demo work.
- Do not deploy, mutate production data, rotate secrets, modify DNS, or run destructive database commands unless the human owner explicitly authorizes it.
- Never use fake success states, fake API responses, fake legal citations, fabricated test results, or hidden fallbacks to make a feature appear complete.

## 3. Truthful completion policy

A task may be marked complete **only** when all applicable conditions are true:

1. The required code is implemented.
2. The relevant failure path is handled.
3. Relevant automated tests pass, or the exact blocker is documented.
4. TypeScript/lint/build checks affected by the change pass, or the exact blocker is documented.
5. The key user flow was verified when the environment allows it.
6. No known regression caused by the change is left unresolved.
7. Any migration, env var, storage policy, or deployment requirement is documented.

Rules for status tracking:

- `[x]` means **implemented and verified**.
- `[ ]` means not verified, even if code was written.
- If partially implemented, keep `[ ]` and add `PARTIAL:` with details.
- If blocked, keep `[ ]` and add `BLOCKED:` with the exact reason and required next step.
- Never convert a failed or skipped test into a pass.
- Never say “fixed”, “done”, “working”, “production-ready”, or equivalent without evidence.

Maintain `IMPLEMENTATION_STATUS.md` throughout substantial work. Update it after each phase and before the final report.

## 4. Autonomy: what an AI coder may fix without asking

While working on an approved task, you may independently fix a newly discovered issue when all of the following are true:

- It is a security vulnerability, data-integrity issue, crash, broken adjacent workflow, obvious authorization bug, serious accessibility defect, or direct regression related to the current work.
- The fix is localized, reversible, and compatible with the existing product design.
- It does not require destructive data migration, a new paid service, a new external account, a major dependency upgrade, or a product-policy decision.
- You document the issue, root cause, files changed, and verification in `IMPLEMENTATION_STATUS.md`.

Stop and ask before:

- Destructive or irreversible migrations.
- Broad architecture rewrites.
- Changing core product semantics or role permissions beyond the approved requirements.
- Replacing Supabase, OpenAI, Next.js, the routing model, or the design system.
- Introducing a paid external service when a choice by the human owner is required.
- Changing production domain/DNS, deployment provider, billing, or legal policy text in a material way.

## 5. Stack-specific rules

Current repository facts to verify before work:

- Next.js 16.x App Router.
- React 19.x.
- TypeScript 5.x.
- Tailwind CSS v4.
- `next-intl` for Arabic/English localization.
- Supabase Auth + Postgres + RLS + private Storage.
- OpenAI server-side integration.
- Radix UI, Framer Motion, Recharts, dnd-kit.

Because Next.js 16 may differ from older training knowledge, read relevant documentation under `node_modules/next/dist/docs/` before implementing unfamiliar Next.js behavior.

Use the lockfile. Prefer `npm ci` for a clean install when appropriate. Do not switch package managers.

## 6. AI and LLM rules

- Live AI features must process the user’s actual input.
- Demo users should receive real AI functionality appropriate to their role, while remaining isolated from real private data and unintended real-world side effects.
- Do not silently fall back to heuristic or placeholder output when a live AI operation fails.
- Deterministic local logic is allowed for validation, normalization, classification heuristics, formatting, and tests, but it must never masquerade as a successful LLM result.
- Validate structured AI outputs with schemas (for example Zod) where appropriate.
- Missing or malformed risk data must become `unknown`/`unverified`, not “low risk” by default.
- Do not fabricate confidence scores.
- Treat user documents, retrieved web/legal text, and model output as untrusted input.
- Defend against prompt injection from uploaded documents and retrieved legal sources.
- Keep provider keys and privileged calls server-side.
- Add controlled timeouts/retries for transient failures; do not retry permanent authentication or validation errors indefinitely.
- Log operational metadata, not sensitive legal document content.

## 7. Legal-safety rules

- Never invent laws, statute numbers, article numbers, case numbers, court decisions, quotations, or citations.
- A legal citation may be labeled verified only when the source exists and supports the associated statement.
- Distinguish clearly between:
  - verified legal requirement,
  - contract text,
  - potential contractual risk,
  - general explanation,
  - AI interpretation,
  - unverified/uncertain conclusion,
  - matter requiring lawyer review.
- Do not state that a clause is unlawful unless sufficient verified legal support exists.
- Preserve existing AI/legal disclaimers and improve them only when needed; do not remove safeguards.
- Prefer a smaller verified Jordanian legal corpus over a large unreliable one.
- Track legislation version/effective date when relevant. Do not assume the newest text governs historical facts.

## 8. Demo-mode rules

- Demo mode must provide a realistic full feature experience for the selected role, including real AI, document processing, and relevant workflows.
- Demo data must remain isolated from unrelated production users.
- Demo admin must never acquire real admin privileges.
- Client-editable cookies or browser state must not grant privileged server access.
- If an action would create an unintended external side effect (for example contacting a real lawyer), use an isolated functional demo path unless the user intentionally enters an authenticated real workflow.
- Protect demo AI endpoints with reasonable rate limits, request-size limits, server-side session validation, and abuse controls.

## 9. Documents, OCR, and privacy

- Supported target formats include PDF, DOCX, TXT, JPG, JPEG, PNG, WEBP, and scanned PDFs where the chosen runtime supports them.
- Validate MIME type, extension, file signature, size, and integrity server-side.
- Extract embedded text directly when reliable; use OCR for scans/images.
- Support Arabic, English, and mixed-language documents.
- Do not invent unreadable text. If extraction quality is poor, surface a clear error/warning and ask for a better file.
- Do not silently truncate long legal documents. Use chunking/section analysis and track coverage.
- Reject unrelated images/files before expensive legal analysis, while allowing uncertain but plausibly legal documents to proceed through a safe clarification path.
- Store private legal documents only in protected storage and expose them only through authorized, short-lived access.
- Never mix document, analysis, or chat context between users.

## 10. Database and authorization rules

- Browser-provided identity fields are untrusted. Derive identity and permissions server-side.
- Keep RLS enabled and review policies for any changed table/bucket.
- Use server-side authorization for sensitive actions.
- Use transactions or equivalent atomic patterns when partial writes would create inconsistent legal/case data.
- Prevent duplicate submissions where repeat clicks/retries can create duplicate records.
- Distinguish loading, empty, success, and error states. A failed query is not an empty list.
- Maintain relationships among original document, extracted text, analysis, clauses, conversation, case, citizen, and authorized lawyer.

## 11. UI/UX and brand rules

- User-facing brand becomes **حق / HAQ**.
- Maintain the existing dark/gold identity unless the human owner requests a redesign.
- Keep the citizen contract-analysis flow extremely simple.
- Core citizen loop: upload → extract → validate → classify → retrieve legal sources → analyze → explain → ask → find lawyer.
- Use plain Arabic for citizens and professional legal wording where needed, with explanations.
- “ابحث عن محامٍ” should lead to the existing lawyer marketplace; do not build a duplicate marketplace.
- Use Framer Motion already present in the project for subtle legal-scale and analysis animations where appropriate; do not add another animation library without need.
- Respect `prefers-reduced-motion`.
- Never fabricate progress percentages. Use truthful stages or indeterminate progress.
- Risk indicators must not rely only on color.
- Preserve responsive mobile behavior and accessibility.

## 12. Branding migration rules: QANUNI → HAQ

Change user-facing branding comprehensively but safely:

- Arabic name: `حق`.
- English name: `HAQ`.
- Update visible headers, navbar/footer labels, auth pages, dashboard labels, page metadata, SEO titles/descriptions, PWA/manifest metadata if present, README/project descriptions, user-facing disclaimers, and localized strings where they refer to the product name.
- Update logo text/assets only if they are text-based or editable without reducing quality. If a binary logo asset requires redesign and none is provided, document it instead of generating a low-quality substitute.
- Keep technical identifiers unchanged when renaming them would introduce migration risk.
- Do not change the production domain automatically.
- Search the repository for `QANUNI`, `Qanuni`, `qanuni`, and `قانوني`; classify each occurrence as user-facing vs internal before changing it.

## 13. Verification commands

Run the relevant subset before marking tasks complete. Use exact repository scripts when present.

Baseline project checks:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

Existing local test utilities include:

```bash
node scripts/dev/analysis-coverage-tests.mjs
node scripts/dev/meaningful-content-tests.mjs
node scripts/dev/extract-text-tests.mjs
node scripts/dev/legal-relevance-classifier-tests.mjs
node scripts/dev/authz-tests.mjs
node scripts/dev/smoke.mjs
```

Some live Supabase tests require safe credentials and temporary QA accounts:

```bash
node scripts/dev/qa-fixtures.mjs create
node scripts/dev/live-authz.mjs
node scripts/dev/qa-fixtures.mjs remove
```

Never run credentialed/destructive live tests blindly. Confirm environment and cleanup behavior first. If unavailable, mark the task blocked/partially verified rather than pretending it passed.

## 14. Final reporting requirements

At the end of substantial work, report:

- What was inspected.
- Confirmed bugs and root causes.
- What was changed.
- Files modified.
- Database/storage/migration changes.
- Environment variables required.
- Tests actually executed and their actual results.
- Manual flows verified.
- Remaining limitations.
- Blockers and exact next actions.
- Newly discovered issues, including those fixed autonomously.

The primary objective is not to maximize changed files or claimed features. It is to produce a secure, reliable, legally grounded, maintainable HAQ experience with evidence for every completion claim.
