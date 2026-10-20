# Team workflow

Maintained 2026-10-20. Read AGENTS.md and HAQ_V2_DEVELOPER_HANDOFF.md before sensitive changes; IMPLEMENTATION_STATUS.md is evidence history. Preserve dirty work and completed citizen/lawyer/Enterprise behavior.

## Branches and review

| Branch | Purpose | Policy |
|---|---|---|
| main | Stable baseline | Protected, reviewed changes only; no direct/force push. |
| staging-prep | Current integration/handoff | Team PRs; production compatibility remains NO-GO. |
| feature/* | Scoped features | Branch from current staging-prep. |
| fix/* | Confirmed bug fixes | Include reproduction and relevant regression evidence. |
| db/* | Candidate/diagnostic work | Reference-only SQL until separate execution approval. |

After owner publishes the private handoff, fetch and create a focused branch:

```bash
git status --short
git fetch origin
git switch staging-prep
git pull --ff-only origin staging-prep
git switch -c fix/short-description
```

If dirty, divergent, detached or unexpected, stop and preserve work first. Never reset/clean/stash or force-push to make this recipe pass. Stage explicit files/hunks; inspect git diff --cached, run git diff --cached --check and commit focused changes. No blanket staging. PR into staging-prep using the template. Stable-main promotion and deployment require explicit owner approval after integration acceptance.

## Review checklist

- Existing flow traced; focused change and useful contracts/comments; no unrelated rewrite.
- Server/session authorization, RLS and owner/document/case boundaries preserved; no private output or keys.
- Errors retain input, release busy state and distinguish unavailable/empty/success; no fake success or AI fallback.
- Arabic RTL/English LTR/mobile/reduced motion and isolated demos preserved where affected.
- Lint, TypeScript, --no-db and relevant browser results recorded; skipped gates explicit.
- Handoff/status/backlog updated; database/environment/hosting/provider requirements explicit.
- C1 unchanged outside a separately approved repair scope; C2/C3 guards/OWNER_REVIEW_REQUIRED retained. Mocks are not hosted/security proof.

## Safe CI and owner administration

.github/workflows/safe-checks.yml uses read-only contents permissions, immutable action SHAs, Node24, ignored lifecycle scripts, empty integration credentials, lint, TypeScript, --no-db tests and an in-memory/loopback/external-denial boundary probe. It never deploys, executes SQL/migrations or consumes repository secrets. It uses pull_request rather than pull_request_target, disables checkout credential persistence and uploads no artifacts. Hosted CI remains unverified until the owner publishes/enables it. Branch protection/required-check configuration are owner-admin tasks, not configured here.

Before first push, owner must confirm PRIVATE destination and least-privilege collaborators, enable secret scanning/push protection where available, and inspect/disable automatic Vercel/other development-branch deployment integrations. A remote URL does not prove privacy. Previously committed credentials block publication until rotation and separately approved history remediation. Do not rewrite history here or add production CI secrets to make checks pass.

## Independent approvals and freeze

No production SQL/connection, DB/Storage mutation, seeding, credential/domain change, paid AI call, deployment, push or merge is authorized by this handoff. Even read-only/disposable SQL needs a separately approved task. C1/C2/C3 approval must name exact execution-copy hashes/target after recovery/staging evidence. Never blanket-push migrations or replay 007-009. Real-account test writes and production release approval are separate from SQL installation approval. Private source handoff does not imply production approval.

Never commit .env.local, real documents, auth/session artifacts, dump/backup bytes, local logs/screenshots or secret-containing machine paths. Keep evidence outside Git and scan staged files/history before publication. Fictional fixtures are test inputs, never production seeds or official law.
