# قانوني — QANUNI

**Understand your rights before you sign.** · **افهم حقك قبل ما توقّع.**

A bilingual (Arabic/English) Jordanian LegalTech platform that connects citizens to AI-powered document understanding and licensed lawyers, and gives lawyers an AI-assisted case management workspace.

> The platform runs on a real backend: Supabase Auth, Postgres with Row Level Security, private file storage, and server-side authorization for every sensitive action. The "try as citizen / lawyer / admin" demo is a **separate, isolated, in-browser sample** that never touches real accounts or data (see [Demo mode](#demo-mode-vs-real-mode)).

---

## Core product loop

**Understand → Identify → Ask → Connect → Act**

A citizen uploads a contract → AI explains it and flags risky clauses → the citizen asks follow-up questions and simulates scenarios → they send a **real case request** to a verified lawyer → the lawyer accepts or declines it → the two work the case together (status lifecycle, messages, documents, timeline).

## Demo mode vs real mode

| | Real | Demo (“جرّب كمواطن / كمحامٍ / كمدير”) |
|---|---|---|
| Accounts | Supabase Auth, citizen/lawyer signup only | none — no login, no session |
| Data | Postgres, protected by RLS | in-memory sample data, always marked “(تجريبي)” |
| Database access | yes, as the signed-in user | **none** — the Supabase browser client is disabled while demo is active |
| Admin power | only accounts promoted with `scripts/admin/make-admin.mjs` | demo admin is a UI over fake data |
| AI | OpenAI (server-side) | heuristic engine only, no OpenAI calls |

Demo state is a client-side flag (`qanuni_demo` cookie) plus an in-memory store (`src/lib/demo/`). Tampering with the flag can only change which *fake* data the UI shows; it cannot grant a server session, read real rows, or create real cases/relationships. A persistent banner shows “You're in the demo” with an exit button.

## Features

### Citizen
- AI contract analyzer — paste text or upload a `.txt` file (PDF/image text extraction is not implemented yet and the UI says so)
- Clause map with AI risk indicators — never presented as legal conclusions; Legal Risk Overview; obligations/deadlines summary; legal-language simplifier
- **Ask the Law** and **Scenario Simulator**, with per-account saved history
- **Case requests**: title, category, description, urgency, related contract, supporting documents, message → creates a real case with status `REQUESTED`
- My cases: status lines 🟡 awaiting reply / 🟢 accepted / 🔴 declined / 🔵 in progress, timeline, case-bound messages, private documents, review after resolution
- Lawyer directory (only verified lawyers), saved lawyers, notifications, appointments, profile, **account deletion**

### Lawyer
- Sign up → verification info → `PENDING` → admin approves / rejects / asks for more info (a pending lawyer sees a verification page and is not listed as verified)
- **New requests** inbox with a safe client preview; accept, or decline with a required reason (out of scope / no capacity / conflict of interest / other) + optional note; the citizen is notified
- Case board with lifecycle columns (accepted → active → waiting for client / lawyer → resolved → closed), case workspace (timeline, messages, documents, private notes, fees tracker, drafts)
- AI Legal Drafter, AI data entry (paste text → create a manual case), calendar, clients, profile, availability / “accepting new cases” switch

### Admin (real accounts only)
- Platform stats, activity charts, **system health** (AI provider status + recent errors from `system_events`)
- Lawyer verification queue (approve / reject / request more info, each with a note), lawyers list
- Users (search, suspend/activate), reports & disputes triage
- Case oversight: **metadata only** — admins cannot read case messages, documents, or private notes

## Case lifecycle

`REQUESTED → ACCEPTED → ACTIVE ⇄ WAITING_FOR_CLIENT ⇄ WAITING_FOR_LAWYER → RESOLVED → CLOSED` (plus `REJECTED`).
Transitions are enforced in Postgres (`_allowed_transition`, `transition_case`, `respond_case`), timestamps are set by the server, and every step writes an immutable `case_events` timeline row plus notifications to the other party.

## Security model

- **Identity is never trusted from the browser.** `client_id`, `lawyer_id`, sender, uploader, accepted-by are derived from the authenticated session inside Postgres (`request_case`, message/document triggers).
- Signup only ever creates `citizen` or `lawyer`; the `handle_new_user` trigger ignores any other role claim. `role`, `verification_status`, `account_status`, ratings, and case status columns are not writable by clients (column-level grants + RPCs).
- Row Level Security on every table; admins get separate RPCs/views that return metadata only.
- Case files live in a **private** Storage bucket, reachable only through short-lived signed URLs for case participants.
- AI server actions refuse unauthenticated callers, and demo callers only ever get the local heuristic engine.
- `SUPABASE_SERVICE_ROLE_KEY` exists only server-side (`src/lib/supabase/admin.ts`, marked `server-only`).

### Tests
```bash
node scripts/dev/authz-tests.mjs                  # 97 database-level authorization/workflow tests (local Postgres via PGlite)
node scripts/dev/qa-fixtures.mjs create           # temporary QA accounts on the real project (service role)
node scripts/dev/live-authz.mjs                   # 25 end-to-end checks against the REAL Supabase (Auth + RLS + Storage)
node scripts/dev/qa-fixtures.mjs remove           # delete the QA accounts again
```

## Legal safety

- The AI never claims a clause "is illegal" — only that it "may present a risk" or "may require legal review."
- Every AI explanation carries a not-legal-advice disclaimer; AI-generated drafts carry a "lawyer review required" notice.
- Legal source references are labeled **verified** or **Demo / Placeholder — requires verification**; no statute text is fabricated.
- Lawyers are shown as “verified” only when an admin approved them (`verification_status = 'approved'`).

## Tech stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript**, **Tailwind CSS v4**
- **next-intl** (Arabic default, full RTL, English toggle) — `src/messages/{ar,en}/*.json`
- **Supabase** — Auth (email/password, PKCE email links), Postgres + RLS, private Storage
- **Radix UI**, **Framer Motion**, **Recharts**, **@dnd-kit**
- **OpenAI** server-side calls (`lib/ai/provider.ts`); if no `OPENAI_API_KEY` is configured, a local heuristic engine is used and clearly labeled. If a key *is* configured and the provider fails, the user sees an error — it is never silently replaced by fake output.

## Architecture

```
src/
  app/[locale]/            Routes (public, citizen, lawyer, admin — each locale-prefixed)
  middleware.ts            Server-side route protection (session, role, pending-lawyer, demo flag)
  components/
    ui/                    Design-system primitives
    layout/                Navbar, footer, dashboard shell (with demo / verification banners)
    shared/                Cross-role components (lawyer card, profile card, notifications list, ...)
    cases/                 Case lifecycle UI: request dialog, status badge/actions, timeline,
                           messages, documents, reject + report dialogs
    citizen/  lawyer/      Feature components specific to each portal
    providers/             SessionProvider, RoleGuard
  lib/
    auth/                  Server actions (signup/login/logout/delete account), session + lawyer hooks,
                           `access.ts` (server-side auth level for AI actions), safe `next` redirects
    data/                  hooks.ts (RLS-scoped reads), actions.ts (all writes; RPCs for privileged ones)
    cases/lifecycle.ts     UI mirror of the DB transition rules
    demo/                  Isolated demo: mode flag, sample dataset, in-memory store
    ai/                    engine.ts (heuristic), provider.ts (OpenAI), actions.ts (server actions)
    supabase/              client/server/admin clients, row mappers
supabase/
  schema.sql               Baseline schema (tables, RLS, base triggers)
  migrations/              002 review trigger, 003 notification triggers, 004 lifecycle + security hardening, 005 saved lawyers / AI history / account deletion
scripts/
  admin/                   make-admin.mjs, cleanup-demo-data.mjs
  dev/                     PGlite harness + tests, live E2E checks, QA fixtures
```

## Database setup

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Run each file in `supabase/migrations/` **in order** (002 → 005). They are idempotent, so re-running is safe.
3. In Supabase → Authentication → URL Configuration, set the Site URL to your domain and add
   `https://<your-domain>/**` and `http://localhost:3000/**` to the redirect allow-list (required for email confirmation and password-reset links).
4. Sign up normally on the site, then promote yourself to admin **once**, from a trusted machine:
   ```bash
   node scripts/admin/make-admin.mjs you@example.com
   ```

## Environment variables

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only; never expose to the browser or commit it
OPENAI_API_KEY=                 # optional
OPENAI_MODEL=gpt-4o-mini
```

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/ar` by default.

## Known limitations

- Text can only be read from `.txt` uploads or pasted text; PDF/image OCR is not implemented (the UI says so instead of analysing a placeholder).
- Lawyer verification is a real admin workflow but has no external Bar Association integration.
- Payments and WhatsApp/SMS notifications are not implemented (the fee tracker is a lawyer-side record; payment reminders are in-app notifications).
- `legal_sources` is a clearly labeled demo dataset, not verified Jordanian legislation.
- Privacy Policy and Terms of Use are drafted from how the platform actually behaves; have counsel review them before launch.
