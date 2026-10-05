# Changed files — 2026-10-04

**2026-10-05 update:** Git is initialized correctly on staging-prep. Historical cumulative manifests below describe the already committed baseline. The exact new scoped manifest is in [PRE_STAGING_REPORT.md](PRE_STAGING_REPORT.md#15-exact-files-changed), relative to db5bfb50785cf3d06f4256aceaa968b5d8755fa5; no previous work was reset.

Current SHA-256 comparison against the immutable Phase 0 snapshot: **165 authored files (102 modified, 63 added), 0 baseline files missing**. Git is unavailable and HAQ has no project-local checkout. Secret environments/dependencies/build output/generated next-env.d.ts and pre-existing .claude settings are excluded. .env.local, AGENTS.md and CODEX_MASTER_PLAN.md are preserved.

Previous 130-file report (82 modified/48 added) is historical evidence, retained in the status/engineering report and prior temp hashes; it is not the current count. Latest recovery snapshot had 276 non-secret files, with 20 interrupted-session files recovered. **57 files changed/added after that snapshot; 69 files in the exact continuation union** (overlaps are counted once).

## Exact continuation files

Recovered = changed before the latest attachment, after the old report; Current = changed after the recovery snapshot. Both means work in both intervals.

| File | Interval | Purpose |
|---|---|---|
| [.gitignore](../.gitignore) | Current | Ignore private run-owned QA credentials/session artifacts |
| [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md) | Recovered + Current | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [README.md](../README.md) | Current | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [docs/CHANGED_FILES.md](../docs/CHANGED_FILES.md) | Current | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [docs/CONTINUATION_REPORT.md](../docs/CONTINUATION_REPORT.md) | Current | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [docs/ENGINEERING_REPORT.md](../docs/ENGINEERING_REPORT.md) | Current | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [docs/PRIVACY_REVIEW_DRAFT.md](../docs/PRIVACY_REVIEW_DRAFT.md) | Current | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [docs/STAGING_RUNBOOK.md](../docs/STAGING_RUNBOOK.md) | Current | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [next.config.ts](../next.config.ts) | Current | Align proxy buffering and Server Actions multipart/file limits |
| [scripts/dev/alias-loader.mjs](../scripts/dev/alias-loader.mjs) | Recovered | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/ingestion-tests.mjs](../scripts/dev/ingestion-tests.mjs) | Current | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/lawyer-browser-live-tests.mjs](../scripts/dev/lawyer-browser-live-tests.mjs) | Current | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/lawyer-workspace-browser-tests.mjs](../scripts/dev/lawyer-workspace-browser-tests.mjs) | Recovered + Current | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/live-authz.mjs](../scripts/dev/live-authz.mjs) | Current | Explicit target/manifest gates without implicit secret environment overrides |
| [scripts/dev/marketplace-browser-tests.mjs](../scripts/dev/marketplace-browser-tests.mjs) | Recovered | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/qa-fixtures.mjs](../scripts/dev/qa-fixtures.mjs) | Current | Explicit staging gates and exact run-owned account creation/cleanup |
| [scripts/dev/qa-session.mjs](../scripts/dev/qa-session.mjs) | Current | Private run-owned bearer-cookie files outside public routes |
| [scripts/dev/qa-target-tests.mjs](../scripts/dev/qa-target-tests.mjs) | Current | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/qa-target.mjs](../scripts/dev/qa-target.mjs) | Current | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/query-session-tests.mjs](../scripts/dev/query-session-tests.mjs) | Current | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/reminder-tests.mjs](../scripts/dev/reminder-tests.mjs) | Current | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/run-safe-tests.mjs](../scripts/dev/run-safe-tests.mjs) | Recovered + Current | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/runtime-browser-tests.mjs](../scripts/dev/runtime-browser-tests.mjs) | Current | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/source-test-loader.mjs](../scripts/dev/source-test-loader.mjs) | Current | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/upload-recovery-tests.mjs](../scripts/dev/upload-recovery-tests.mjs) | Current | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/workflow-adapter-tests.mjs](../scripts/dev/workflow-adapter-tests.mjs) | Recovered + Current | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/workflow-ui-tests.mjs](../scripts/dev/workflow-ui-tests.mjs) | Current | Focused safe adverse-action/React/runtime/browser verification |
| [src/app/[locale]/(public)/lawyers/[id]/page.tsx](../src/app/%5Blocale%5D/(public)/lawyers/%5Bid%5D/page.tsx) | Recovered + Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/admin/cases/page.tsx](../src/app/%5Blocale%5D/admin/cases/page.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/citizen/analyze/[id]/page.tsx](../src/app/%5Blocale%5D/citizen/analyze/%5Bid%5D/page.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/citizen/analyze/new/page.tsx](../src/app/%5Blocale%5D/citizen/analyze/new/page.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/citizen/cases/[id]/page.tsx](../src/app/%5Blocale%5D/citizen/cases/%5Bid%5D/page.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/citizen/cases/page.tsx](../src/app/%5Blocale%5D/citizen/cases/page.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/citizen/lawyers/page.tsx](../src/app/%5Blocale%5D/citizen/lawyers/page.tsx) | Recovered | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/lawyer/cases/[id]/page.tsx](../src/app/%5Blocale%5D/lawyer/cases/%5Bid%5D/page.tsx) | Recovered | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/lawyer/clients/[id]/page.tsx](../src/app/%5Blocale%5D/lawyer/clients/%5Bid%5D/page.tsx) | Recovered | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/lawyer/documents/page.tsx](../src/app/%5Blocale%5D/lawyer/documents/page.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/lawyer/drafts/new/page.tsx](../src/app/%5Blocale%5D/lawyer/drafts/new/page.tsx) | Recovered + Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/cases/case-documents-panel.tsx](../src/components/cases/case-documents-panel.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/cases/case-messages.tsx](../src/components/cases/case-messages.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/cases/case-request-dialog.tsx](../src/components/cases/case-request-dialog.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/cases/report-dialog.tsx](../src/components/cases/report-dialog.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/cases/status-actions.tsx](../src/components/cases/status-actions.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/citizen/ask-the-law-panel.tsx](../src/components/citizen/ask-the-law-panel.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/citizen/citizen-calendar-view.tsx](../src/components/citizen/citizen-calendar-view.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/citizen/scenario-simulator-panel.tsx](../src/components/citizen/scenario-simulator-panel.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/citizen/write-review-form.tsx](../src/components/citizen/write-review-form.tsx) | Current | Checked real/demo review submit, eligibility/errors and loading recovery |
| [src/components/lawyer/calendar-view.tsx](../src/components/lawyer/calendar-view.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/lawyer/case-financial-tracker.tsx](../src/components/lawyer/case-financial-tracker.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/layout/dashboard-shell.tsx](../src/components/layout/dashboard-shell.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/providers/role-guard.tsx](../src/components/providers/role-guard.tsx) | Current | Present session-read failure without misleading login redirect |
| [src/components/providers/session-provider.tsx](../src/components/providers/session-provider.tsx) | Current | Checked auth/profile lifecycle, synchronous callback and stale identity denial |
| [src/components/shared/lawyer-card.tsx](../src/components/shared/lawyer-card.tsx) | Recovered | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/shared/notifications-list.tsx](../src/components/shared/notifications-list.tsx) | Current | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/lib/auth/use-lawyer.ts](../src/lib/auth/use-lawyer.ts) | Current | Scoped public directory/profile loading and failure states |
| [src/lib/data/actions.ts](../src/lib/data/actions.ts) | Recovered + Current | Checked read markers, reviewed workflow mutations and real/demo result honesty |
| [src/lib/data/hooks.ts](../src/lib/data/hooks.ts) | Recovered + Current | Scoped identity/filter queries, checked reads and history results |
| [src/lib/data/server-actions.ts](../src/lib/data/server-actions.ts) | Current | Approved assigned-lawyer reminder from persisted balance/title |
| [src/lib/data/use-scoped-query.ts](../src/lib/data/use-scoped-query.ts) | Current | Generation-scoped loading/error/refetch/poll lifecycle |
| [src/lib/demo/store.ts](../src/lib/demo/store.ts) | Current | Stored demo reviews/reminders and reset isolation |
| [src/lib/documents/ingestion.ts](../src/lib/documents/ingestion.ts) | Current | Warn on embedded Arabic PDF extraction accuracy limitation |
| [src/lib/documents/storage-actions.ts](../src/lib/documents/storage-actions.ts) | Current | Stable byte-verified citizen retry paths and safe uncertain metadata recovery |
| [src/messages/ar/citizen.json](../src/messages/ar/citizen.json) | Recovered | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/ar/lawyer.json](../src/messages/ar/lawyer.json) | Recovered | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/ar/marketplace.json](../src/messages/ar/marketplace.json) | Recovered | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/en/citizen.json](../src/messages/en/citizen.json) | Recovered | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/en/lawyer.json](../src/messages/en/lawyer.json) | Recovered | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/en/marketplace.json](../src/messages/en/marketplace.json) | Recovered | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/middleware.ts](../src/middleware.ts) | Current | Reject known oversized action requests before multipart parsing |

## All authored changes against Phase 0

| File | Change | Purpose |
|---|---|---|
| [.env.example](../.env.example) | Modified | Focused configuration, branding or verification support |
| [.gitignore](../.gitignore) | Modified | Ignore private run-owned QA credentials/session artifacts |
| [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md) | Modified | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [README.md](../README.md) | Modified | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [docs/CHANGED_FILES.md](../docs/CHANGED_FILES.md) | Added | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [docs/CONTINUATION_REPORT.md](../docs/CONTINUATION_REPORT.md) | Added | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [docs/ENGINEERING_REPORT.md](../docs/ENGINEERING_REPORT.md) | Added | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [docs/LEGAL_SOURCE_CURATION.md](../docs/LEGAL_SOURCE_CURATION.md) | Added | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [docs/PRIVACY_REVIEW_DRAFT.md](../docs/PRIVACY_REVIEW_DRAFT.md) | Added | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [docs/STAGING_RUNBOOK.md](../docs/STAGING_RUNBOOK.md) | Added | Current evidence, exact file manifest, staging/legal limitations and runbooks |
| [eslint.config.mjs](../eslint.config.mjs) | Modified | Focused configuration, branding or verification support |
| [next.config.ts](../next.config.ts) | Modified | Align proxy buffering and Server Actions multipart/file limits |
| [package-lock.json](../package-lock.json) | Modified | Compatible Next/eslint security patch, safe tests and description |
| [package.json](../package.json) | Modified | Compatible Next/eslint security patch, safe tests and description |
| [scripts/dev/alias-loader.mjs](../scripts/dev/alias-loader.mjs) | Modified | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/analysis-service-tests.mjs](../scripts/dev/analysis-service-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/authz-tests.mjs](../scripts/dev/authz-tests.mjs) | Modified | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/browser-failure-tests.mjs](../scripts/dev/browser-failure-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/browser-live-tests.mjs](../scripts/dev/browser-live-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/context-and-citations-tests.mjs](../scripts/dev/context-and-citations-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/demo-workflow-tests.mjs](../scripts/dev/demo-workflow-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/extract-text-tests.mjs](../scripts/dev/extract-text-tests.mjs) | Modified | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/fixtures/ocr/ar.png](../scripts/dev/fixtures/ocr/ar.png) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/fixtures/ocr/blank.png](../scripts/dev/fixtures/ocr/blank.png) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/fixtures/ocr/en.png](../scripts/dev/fixtures/ocr/en.png) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/fixtures/ocr/scanned.pdf](../scripts/dev/fixtures/ocr/scanned.pdf) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/ingestion-tests.mjs](../scripts/dev/ingestion-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/lawyer-browser-live-tests.mjs](../scripts/dev/lawyer-browser-live-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/lawyer-workspace-browser-tests.mjs](../scripts/dev/lawyer-workspace-browser-tests.mjs) | Added | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/live-authz.mjs](../scripts/dev/live-authz.mjs) | Modified | Explicit target/manifest gates without implicit secret environment overrides |
| [scripts/dev/long-analysis-live-tests.mjs](../scripts/dev/long-analysis-live-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/marketplace-browser-tests.mjs](../scripts/dev/marketplace-browser-tests.mjs) | Added | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/ocr-live-tests.mjs](../scripts/dev/ocr-live-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/pdf-browser-tests.mjs](../scripts/dev/pdf-browser-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/pg-harness.mjs](../scripts/dev/pg-harness.mjs) | Modified | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/provider-tests.mjs](../scripts/dev/provider-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/qa-fixtures.mjs](../scripts/dev/qa-fixtures.mjs) | Modified | Explicit staging gates and exact run-owned account creation/cleanup |
| [scripts/dev/qa-session.mjs](../scripts/dev/qa-session.mjs) | Modified | Private run-owned bearer-cookie files outside public routes |
| [scripts/dev/qa-target-tests.mjs](../scripts/dev/qa-target-tests.mjs) | Added | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/qa-target.mjs](../scripts/dev/qa-target.mjs) | Added | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/query-session-tests.mjs](../scripts/dev/query-session-tests.mjs) | Added | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/rag-live-tests.mjs](../scripts/dev/rag-live-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/reminder-tests.mjs](../scripts/dev/reminder-tests.mjs) | Added | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/report-tests.mjs](../scripts/dev/report-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/run-safe-tests.mjs](../scripts/dev/run-safe-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/runtime-browser-tests.mjs](../scripts/dev/runtime-browser-tests.mjs) | Added | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/security-regression-tests.mjs](../scripts/dev/security-regression-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/session-security-tests.mjs](../scripts/dev/session-security-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/source-storage-tests.mjs](../scripts/dev/source-storage-tests.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/source-test-loader.mjs](../scripts/dev/source-test-loader.mjs) | Added | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/upload-recovery-tests.mjs](../scripts/dev/upload-recovery-tests.mjs) | Added | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/verify-legal-source.mjs](../scripts/dev/verify-legal-source.mjs) | Added | Regression suites, safe tooling or synthetic test fixtures |
| [scripts/dev/workflow-adapter-tests.mjs](../scripts/dev/workflow-adapter-tests.mjs) | Added | Focused safe adverse-action/React/runtime/browser verification |
| [scripts/dev/workflow-ui-tests.mjs](../scripts/dev/workflow-ui-tests.mjs) | Added | Focused safe adverse-action/React/runtime/browser verification |
| [src/app/[locale]/(public)/lawyers/[id]/page.tsx](../src/app/%5Blocale%5D/(public)/lawyers/%5Bid%5D/page.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/(public)/lawyers/page.tsx](../src/app/%5Blocale%5D/(public)/lawyers/page.tsx) | Modified | Focused configuration, branding or verification support |
| [src/app/[locale]/(public)/page.tsx](../src/app/%5Blocale%5D/(public)/page.tsx) | Modified | Focused configuration, branding or verification support |
| [src/app/[locale]/admin/cases/page.tsx](../src/app/%5Blocale%5D/admin/cases/page.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/admin/dashboard/page.tsx](../src/app/%5Blocale%5D/admin/dashboard/page.tsx) | Modified | Data failure states and metadata oversight |
| [src/app/[locale]/admin/lawyers/page.tsx](../src/app/%5Blocale%5D/admin/lawyers/page.tsx) | Modified | Data failure states and metadata oversight |
| [src/app/[locale]/admin/reports/page.tsx](../src/app/%5Blocale%5D/admin/reports/page.tsx) | Modified | Data failure states and metadata oversight |
| [src/app/[locale]/admin/users/page.tsx](../src/app/%5Blocale%5D/admin/users/page.tsx) | Modified | Data failure states and metadata oversight |
| [src/app/[locale]/admin/verification/page.tsx](../src/app/%5Blocale%5D/admin/verification/page.tsx) | Modified | Data failure states and metadata oversight |
| [src/app/[locale]/auth/callback/route.ts](../src/app/%5Blocale%5D/auth/callback/route.ts) | Modified | Session/approval/role and redirect safety |
| [src/app/[locale]/citizen/analyses/page.tsx](../src/app/%5Blocale%5D/citizen/analyses/page.tsx) | Modified | Actual input/results, simple upload, marketplace and query recovery |
| [src/app/[locale]/citizen/analyze/[id]/page.tsx](../src/app/%5Blocale%5D/citizen/analyze/%5Bid%5D/page.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/citizen/analyze/new/page.tsx](../src/app/%5Blocale%5D/citizen/analyze/new/page.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/citizen/cases/[id]/page.tsx](../src/app/%5Blocale%5D/citizen/cases/%5Bid%5D/page.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/citizen/cases/page.tsx](../src/app/%5Blocale%5D/citizen/cases/page.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/citizen/dashboard/page.tsx](../src/app/%5Blocale%5D/citizen/dashboard/page.tsx) | Modified | Actual input/results, simple upload, marketplace and query recovery |
| [src/app/[locale]/citizen/documents/page.tsx](../src/app/%5Blocale%5D/citizen/documents/page.tsx) | Modified | Actual input/results, simple upload, marketplace and query recovery |
| [src/app/[locale]/citizen/lawyers/page.tsx](../src/app/%5Blocale%5D/citizen/lawyers/page.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/citizen/layout.tsx](../src/app/%5Blocale%5D/citizen/layout.tsx) | Modified | Actual input/results, simple upload, marketplace and query recovery |
| [src/app/[locale]/lawyer/cases/[id]/page.tsx](../src/app/%5Blocale%5D/lawyer/cases/%5Bid%5D/page.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/lawyer/cases/page.tsx](../src/app/%5Blocale%5D/lawyer/cases/page.tsx) | Modified | Professional tools and workflow error recovery |
| [src/app/[locale]/lawyer/clients/[id]/page.tsx](../src/app/%5Blocale%5D/lawyer/clients/%5Bid%5D/page.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/lawyer/clients/page.tsx](../src/app/%5Blocale%5D/lawyer/clients/page.tsx) | Modified | Professional tools and workflow error recovery |
| [src/app/[locale]/lawyer/dashboard/page.tsx](../src/app/%5Blocale%5D/lawyer/dashboard/page.tsx) | Modified | Professional tools and workflow error recovery |
| [src/app/[locale]/lawyer/documents/page.tsx](../src/app/%5Blocale%5D/lawyer/documents/page.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/lawyer/drafts/new/page.tsx](../src/app/%5Blocale%5D/lawyer/drafts/new/page.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/app/[locale]/lawyer/drafts/page.tsx](../src/app/%5Blocale%5D/lawyer/drafts/page.tsx) | Modified | Professional tools and workflow error recovery |
| [src/app/[locale]/lawyer/messages/page.tsx](../src/app/%5Blocale%5D/lawyer/messages/page.tsx) | Modified | Bilingual HAQ branding, formats and truthful risk/progress |
| [src/app/[locale]/lawyer/requests/page.tsx](../src/app/%5Blocale%5D/lawyer/requests/page.tsx) | Modified | Professional tools and workflow error recovery |
| [src/app/[locale]/layout.tsx](../src/app/%5Blocale%5D/layout.tsx) | Modified | Focused configuration, branding or verification support |
| [src/app/globals.css](../src/app/globals.css) | Modified | Focused configuration, branding or verification support |
| [src/app/not-found.tsx](../src/app/not-found.tsx) | Modified | Focused configuration, branding or verification support |
| [src/components/cases/case-documents-panel.tsx](../src/components/cases/case-documents-panel.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/cases/case-messages.tsx](../src/components/cases/case-messages.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/cases/case-request-dialog.tsx](../src/components/cases/case-request-dialog.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/cases/linked-analysis-documents.tsx](../src/components/cases/linked-analysis-documents.tsx) | Added | Consented handoff, shared originals, file actions and error recovery |
| [src/components/cases/report-dialog.tsx](../src/components/cases/report-dialog.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/cases/status-actions.tsx](../src/components/cases/status-actions.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/citizen/analysis-export.tsx](../src/components/citizen/analysis-export.tsx) | Added | Exact source highlights, context chat, uncertainty and PDF export |
| [src/components/citizen/ask-the-law-panel.tsx](../src/components/citizen/ask-the-law-panel.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/citizen/citizen-calendar-view.tsx](../src/components/citizen/citizen-calendar-view.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/citizen/clause-detail-dialog.tsx](../src/components/citizen/clause-detail-dialog.tsx) | Modified | Exact source highlights, context chat, uncertainty and PDF export |
| [src/components/citizen/clause-map.tsx](../src/components/citizen/clause-map.tsx) | Modified | Exact source highlights, context chat, uncertainty and PDF export |
| [src/components/citizen/legal-evidence.tsx](../src/components/citizen/legal-evidence.tsx) | Added | Exact source highlights, context chat, uncertainty and PDF export |
| [src/components/citizen/risk-overview.tsx](../src/components/citizen/risk-overview.tsx) | Modified | Exact source highlights, context chat, uncertainty and PDF export |
| [src/components/citizen/scenario-simulator-panel.tsx](../src/components/citizen/scenario-simulator-panel.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/citizen/source-document.tsx](../src/components/citizen/source-document.tsx) | Added | Exact source highlights, context chat, uncertainty and PDF export |
| [src/components/citizen/write-review-form.tsx](../src/components/citizen/write-review-form.tsx) | Modified | Checked real/demo review submit, eligibility/errors and loading recovery |
| [src/components/lawyer/calendar-view.tsx](../src/components/lawyer/calendar-view.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/lawyer/case-financial-tracker.tsx](../src/components/lawyer/case-financial-tracker.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/layout/dashboard-shell.tsx](../src/components/layout/dashboard-shell.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/providers/role-guard.tsx](../src/components/providers/role-guard.tsx) | Modified | Present session-read failure without misleading login redirect |
| [src/components/providers/session-provider.tsx](../src/components/providers/session-provider.tsx) | Modified | Checked auth/profile lifecycle, synchronous callback and stale identity denial |
| [src/components/shared/ai-assistant-widget.tsx](../src/components/shared/ai-assistant-widget.tsx) | Modified | Truthful status, branding, accessibility, motion and session UI |
| [src/components/shared/ai-status-indicator.tsx](../src/components/shared/ai-status-indicator.tsx) | Modified | Truthful status, branding, accessibility, motion and session UI |
| [src/components/shared/data-load-error.tsx](../src/components/shared/data-load-error.tsx) | Added | Truthful status, branding, accessibility, motion and session UI |
| [src/components/shared/demo-entry-buttons.tsx](../src/components/shared/demo-entry-buttons.tsx) | Modified | Truthful status, branding, accessibility, motion and session UI |
| [src/components/shared/lawyer-card.tsx](../src/components/shared/lawyer-card.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/shared/legal-motion.tsx](../src/components/shared/legal-motion.tsx) | Added | Truthful status, branding, accessibility, motion and session UI |
| [src/components/shared/notifications-list.tsx](../src/components/shared/notifications-list.tsx) | Modified | Scoped record/identity reads, truthful loading/error and checked workflow recovery |
| [src/components/shared/reveal.tsx](../src/components/shared/reveal.tsx) | Modified | Truthful status, branding, accessibility, motion and session UI |
| [src/components/shared/risk-badge.tsx](../src/components/shared/risk-badge.tsx) | Modified | Truthful status, branding, accessibility, motion and session UI |
| [src/components/ui/badge.tsx](../src/components/ui/badge.tsx) | Modified | Focused configuration, branding or verification support |
| [src/lib/ai/actions.ts](../src/lib/ai/actions.ts) | Modified | Real provider operations, validated results, full sections, context and truthful errors |
| [src/lib/ai/analysis-service.ts](../src/lib/ai/analysis-service.ts) | Added | Real provider operations, validated results, full sections, context and truthful errors |
| [src/lib/ai/coverage.ts](../src/lib/ai/coverage.ts) | Modified | Real provider operations, validated results, full sections, context and truthful errors |
| [src/lib/ai/limits.ts](../src/lib/ai/limits.ts) | Added | Real provider operations, validated results, full sections, context and truthful errors |
| [src/lib/ai/provider.ts](../src/lib/ai/provider.ts) | Modified | Real provider operations, validated results, full sections, context and truthful errors |
| [src/lib/ai/relevance.ts](../src/lib/ai/relevance.ts) | Modified | Real provider operations, validated results, full sections, context and truthful errors |
| [src/lib/auth/access.ts](../src/lib/auth/access.ts) | Modified | Session/approval/role and redirect safety |
| [src/lib/auth/actions.ts](../src/lib/auth/actions.ts) | Modified | Session/approval/role and redirect safety |
| [src/lib/auth/use-lawyer.ts](../src/lib/auth/use-lawyer.ts) | Modified | Scoped public directory/profile loading and failure states |
| [src/lib/data/actions.ts](../src/lib/data/actions.ts) | Modified | Checked read markers, reviewed workflow mutations and real/demo result honesty |
| [src/lib/data/hooks.ts](../src/lib/data/hooks.ts) | Modified | Scoped identity/filter queries, checked reads and history results |
| [src/lib/data/server-actions.ts](../src/lib/data/server-actions.ts) | Modified | Approved assigned-lawyer reminder from persisted balance/title |
| [src/lib/data/use-scoped-query.ts](../src/lib/data/use-scoped-query.ts) | Added | Generation-scoped loading/error/refetch/poll lifecycle |
| [src/lib/demo/actions.ts](../src/lib/demo/actions.ts) | Added | Signed isolated sessions, actual results and byte/history retention |
| [src/lib/demo/lawyers.ts](../src/lib/demo/lawyers.ts) | Modified | Signed isolated sessions, actual results and byte/history retention |
| [src/lib/demo/mode.ts](../src/lib/demo/mode.ts) | Modified | Signed isolated sessions, actual results and byte/history retention |
| [src/lib/demo/session.ts](../src/lib/demo/session.ts) | Added | Signed isolated sessions, actual results and byte/history retention |
| [src/lib/demo/store.ts](../src/lib/demo/store.ts) | Modified | Stored demo reviews/reminders and reset isolation |
| [src/lib/documents/context.ts](../src/lib/documents/context.ts) | Added | Secure extraction/OCR, server ownership, original files, mapping and reports |
| [src/lib/documents/direct-extraction.ts](../src/lib/documents/direct-extraction.ts) | Added | Secure extraction/OCR, server ownership, original files, mapping and reports |
| [src/lib/documents/extract-text.ts](../src/lib/documents/extract-text.ts) | Modified | Secure extraction/OCR, server ownership, original files, mapping and reports |
| [src/lib/documents/highlights.ts](../src/lib/documents/highlights.ts) | Added | Secure extraction/OCR, server ownership, original files, mapping and reports |
| [src/lib/documents/ingestion.ts](../src/lib/documents/ingestion.ts) | Added | Warn on embedded Arabic PDF extraction accuracy limitation |
| [src/lib/documents/ocr.ts](../src/lib/documents/ocr.ts) | Added | Secure extraction/OCR, server ownership, original files, mapping and reports |
| [src/lib/documents/report.ts](../src/lib/documents/report.ts) | Added | Secure extraction/OCR, server ownership, original files, mapping and reports |
| [src/lib/documents/storage-actions.ts](../src/lib/documents/storage-actions.ts) | Added | Stable byte-verified citizen retry paths and safe uncertain metadata recovery |
| [src/lib/documents/validation.ts](../src/lib/documents/validation.ts) | Added | Secure extraction/OCR, server ownership, original files, mapping and reports |
| [src/lib/legal-content.ts](../src/lib/legal-content.ts) | Modified | Brand references only; legal-policy meaning preserved |
| [src/lib/legal/corpus.ts](../src/lib/legal/corpus.ts) | Added | Checked seed corpus, metadata, embeddings and citations |
| [src/lib/legal/retrieval.ts](../src/lib/legal/retrieval.ts) | Added | Checked seed corpus, metadata, embeddings and citations |
| [src/lib/mock-data/contract.ts](../src/lib/mock-data/contract.ts) | Modified | Checked reads/writes, atomic/idempotent RPC adapters and demo workflows |
| [src/lib/mock-data/legal-sources.ts](../src/lib/mock-data/legal-sources.ts) | Modified | Checked reads/writes, atomic/idempotent RPC adapters and demo workflows |
| [src/lib/supabase/mappers.ts](../src/lib/supabase/mappers.ts) | Modified | Unknown risk, exact quotes, source metadata and nullable confidence |
| [src/lib/use-reduced-motion.ts](../src/lib/use-reduced-motion.ts) | Added | Focused configuration, branding or verification support |
| [src/messages/ar/citizen.json](../src/messages/ar/citizen.json) | Modified | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/ar/common.json](../src/messages/ar/common.json) | Modified | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/ar/landing.json](../src/messages/ar/landing.json) | Modified | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/ar/lawyer.json](../src/messages/ar/lawyer.json) | Modified | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/ar/marketplace.json](../src/messages/ar/marketplace.json) | Modified | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/en/citizen.json](../src/messages/en/citizen.json) | Modified | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/en/common.json](../src/messages/en/common.json) | Modified | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/en/landing.json](../src/messages/en/landing.json) | Modified | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/en/lawyer.json](../src/messages/en/lawyer.json) | Modified | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/messages/en/marketplace.json](../src/messages/en/marketplace.json) | Modified | Bilingual loading/error/retry/contact strings preserving Arabic and English |
| [src/middleware.ts](../src/middleware.ts) | Modified | Reject known oversized action requests before multipart parsing |
| [src/types/index.ts](../src/types/index.ts) | Modified | Unknown risk, exact quotes, source metadata and nullable confidence |
| [supabase/migrations/007_security_and_atomic_analysis.sql](../supabase/migrations/007_security_and_atomic_analysis.sql) | Added | Active/approved accounts, privacy, atomic analysis, request idempotency and full manual-case text |
| [supabase/migrations/008_private_source_documents.sql](../supabase/migrations/008_private_source_documents.sql) | Added | Private retained originals and owner/assigned-lawyer access |
