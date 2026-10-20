# Team onboarding

Maintained 2026-10-20 (Asia/Amman). Start with README, AGENTS.md, CODEX_MASTER_PLAN.md, IMPLEMENTATION_STATUS.md, HAQ_V2_DEVELOPER_HANDOFF.md and TEAM_HANDOFF_READINESS.md. Historical tests are not current production evidence.

## Clone after owner-approved private publication

Proposed destination: https://github.com/OmarKerdase/HAQ.git, the existing origin. Existence/privacy/access are unverified: unauthenticated metadata returned 404, which does not prove privacy. Owner must confirm the intended private repository, collaborators and connected deploy integrations before pushing. No push is authorized by this preparation. Once the reviewed branch is published:

```bash
git clone --branch staging-prep --single-branch https://github.com/OmarKerdase/HAQ.git
cd HAQ
git branch --show-current
node --version
npm --version
npm ci --ignore-scripts --no-audit --no-fund
```

Use Node 24 (local environment v24.19.0), npm and package-lock.json. Registry access is needed for installation. Ignore-scripts skips dependency lifecycle scripts; no npm install/update/audit-fix is part of onboarding. Exact clean-checkout results and skips are in TEAM_HANDOFF_READINESS.md. No .env.local, dump, login cookie or production secret is supplied or needed.

## Safe demo without production or provider credentials

```bash
node scripts/dev/citizen-findings-qa-server.mjs --build
```

This builds and serves http://127.0.0.1:3015. Open /ar and /en, use homepage role-demo buttons, and browse /enterprise/demo. The helper blanks integration credentials, supplies a fictional process-only signing value and loads its child-only external-network guard. It does not create accounts, execute SQL or import a real Auth session. Ctrl+C stops the owned helper. If the port is busy, stop and review; never kill an unrelated process. Normal npm run dev can load .env.local and is not the safe-demo command.

Citizen: view the separately labelled sample and existing original/report/highlight screens; TXT extraction is local. Without a provider, analysis/chat/drafting/OCR fail truthfully. No live AI/OCR result is promised. Lawyer/admin: isolated memory records, no real privileges. Enterprise: 36 fictional PDFs across three organizations, hypothetical impact and memory review queue; inquiry validation sends/saves nothing. Demo price edits reset on reload. Real price persistence is unverified.

Optional labelled MOCK transport: stop the helper, then run it with --mock instead of --build after a successful build. It uses :3016 and synthetic fixture responses only. Never present mock output as live AI/legal acceptance or use the QA helper as deployment configuration.

## Reproduce safe checks

```bash
npm run lint
npx --no-install tsc --noEmit
npm run test:safe -- --no-db
node scripts/dev/qa-egress-tests.mjs
node scripts/dev/v2-acceptance-tests.mjs
npm run build
```

The runner currently lists 29 suites: --no-db runs 24 and explicitly skips authz-tests, smoke, security-regression-tests, source-storage-tests and curated-source-tests. These five execute SQL even though their database is disposable. Do not run them, case-request-wrapper-patch-tests, live-authz, qa-fixtures, qa-session, inspect-db or live-provider/network suites under the current freeze. Dependency doubles do not prove hosted DB/security behavior.

For optional browser automation, use Playwright outside this repository; set HAQ_PLAYWRIGHT_MODULE to its module entry (file URL on Windows), HAQ_CHROME_PATH to a compatible browser, HAQ_V2_QA_URL to http://127.0.0.1:3015 and HAQ_V2_EVIDENCE to a private directory outside Git. With the empty-provider helper running:

```bash
node scripts/dev/v2-acceptance-browser-tests.mjs
```

This blocks browser egress and covers ar360/ar390/en390/en1440, reduced motion, portfolio PDFs/scenarios, inquiry no-submit, demo fee reload and upload failure. Automated Chrome input is distinct from owner-operated/physical-device acceptance. Do not save real cookies, credentials or storageState. Optional React probes need a compatible external renderer; neither tool is needed to start the app.

## Future approved integrations

.env.example is empty/safe. After owner approval, privately configure a specifically designated isolated Supabase project and authorized provider account in ignored .env.local. Never copy production configuration; localhost does not establish project isolation. Keep provider/service-role/signing keys server-only. Review Auth redirects, signing requirements and provider costs. Cloning/configuring an environment does not authorize SQL.

Read PRODUCTION_COMPATIBILITY_CANDIDATES.md and TEAM_BACKLOG.md before real persistence work. Preserve C1 exactly and C2/C3 guards/placeholders. Original Storage, finalizer, wrapper, recovery and staging gates remain open. TEAM_WORKFLOW.md defines review and approval boundaries.

The instructions inside the original fictional fixture pack describe historical test scenarios; they do not authorize seeding, SQL execution or repeating completed feature work.
