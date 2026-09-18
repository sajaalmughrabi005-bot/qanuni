# قانوني — QANUNI

**Understand your rights before you sign.** · **افهم حقك قبل ما توقّع.**

A bilingual (Arabic/English) Jordanian LegalTech platform that connects citizens to AI-powered document understanding and licensed lawyers, and gives lawyers an AI-assisted case management workspace.

> This is a hackathon build with a real backend: Supabase Auth, Postgres with Row Level Security, and real accounts/data — not a localStorage demo. AI features fall back to a local heuristic engine if no `OPENAI_API_KEY` is set, so the app still runs without external AI credentials, but the database and auth are real.

---

## Core product loop

**Understand → Identify → Ask → Connect → Act**

A citizen uploads a contract → AI explains it and flags risky clauses → the citizen asks follow-up questions and simulates scenarios → they're matched to a lawyer → the lawyer manages the case with AI tools (summary, drafting, extraction).

## Features

### Citizen
- AI contract analyzer (upload, paste text, or use the seeded demo rental contract)
- Clause map with AI risk indicators (low / medium / high) — never presented as legal conclusions
- Legal Risk Overview (contractual / financial / deadline / termination / liability)
- "What this means for you" — obligations, deadlines, payments, cancellation terms, concerns
- Legal Language Simplifier (glossary with plain explanations + examples)
- **Ask the Law** — a grounded Q&A chat that answers from the document's own clauses
- **Scenario Simulator** — "what if I leave early / don't pay / damage occurs" style what-ifs
- **Create Case** — turns an analysis into a structured case with AI lawyer matching
- Lawyer marketplace (search/filter) + profiles + consultation requests
- Dashboards for documents, analyses, cases, saved lawyers, appointments, notifications

### Lawyer
- Dashboard with stats and one-click quick actions (all simulated/demo-labeled where relevant)
- Kanban case board (drag-and-drop via `@dnd-kit`) + list view
- Case detail with a **3-layer AI summary**: Client Story / Evidence / Legal Context, plus an AI situation summary
- **AI Legal Drafter** — instructions → draft, with regenerate / shorten / formalize / translate actions and a mandatory AI-disclosure notice
- **AI Data Entry** — extract client, opposing party, case number, court, dates, and amounts from pasted/uploaded text, reviewed before saving
- Smart calendar (month grid, day agenda, create/delete events)
- Clients, documents, messages, notifications, profile, settings
- **Voice-to-Action** — a simulated mic → transcript → confirm-and-create-reminder flow (clearly labeled as simulated; no real speech API)

### Admin
- Platform stats (citizens, lawyers, cases, documents, consultations, AI analyses)
- Charts (activity over time, cases by status, cases by category, top lawyers) via Recharts
- Users / lawyers / cases lists, verification requests

## Legal safety

- The AI never claims a clause "is illegal" — only that it "may present a risk" or "may require legal review."
- Every AI explanation carries a not-legal-advice disclaimer.
- Legal source references are clearly labeled **verified** or **Demo / Placeholder — requires verification**. No Jordanian statute text or citation is fabricated and presented as real; the seeded `legal_sources` are explicitly marked as a demo dataset.
- AI-generated legal drafts carry a visible "lawyer review required" notice.

## Tech stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript**
- **Tailwind CSS v4** with a custom navy/beige/gold design system
- **next-intl** for i18n (Arabic default, full RTL, English toggle) — see `src/messages/{ar,en}/*.json`
- **Radix UI** primitives + a small shadcn-style component library (`src/components/ui`)
- **Framer Motion** for premium, restrained animation
- **Recharts** for admin analytics
- **@dnd-kit** for the Kanban board
- **Supabase** — real Auth (email/password, PKCE email links), Postgres, and Row Level Security. `@supabase/supabase-js` / `@supabase/ssr` client/server wrappers; every documents/cases/appointments/drafts/notifications/messages read and write goes through `lib/data/hooks.ts` and `lib/data/actions.ts`
- **Zustand** (persisted to `localStorage`) — only the per-browser "saved lawyers" bookmark list now; everything else lives in Postgres
- **OpenAI**-compatible server-side AI calls, with a **local heuristic AI engine** fallback so every AI feature works with zero external credentials

## Architecture

```
src/
  app/[locale]/            Routes (public, citizen, lawyer, admin — each locale-prefixed)
  components/
    ui/                    Design-system primitives (button, card, dialog, tabs, ...)
    layout/                Navbar, footer, dashboard shell (sidebar + topbar)
    shared/                Cross-role components (lawyer card, risk badge, empty state, ...)
    citizen/  lawyer/       Feature components specific to each portal
    providers/              RoleGuard, SessionProvider, StoreHydration
  lib/
    ai/
      engine.ts             Local heuristic "AI" — clause risk scoring, Q&A, scenario
                             simulation, matching, extraction, drafting. No API key needed.
      provider.ts            Server-only OpenAI wrapper (chat completions, JSON mode)
      actions.ts             'use server' entry points — try OpenAI if configured,
                             else fall back to engine.ts. This is the single AI service
                             layer the UI talks to.
      glossary.ts             Legal Language Simplifier terms
    auth/
      actions.ts             'use server' Supabase Auth (signup/login/logout/password reset)
      use-session.ts         Client hook backed by SessionProvider
      use-lawyer.ts           Fetches a lawyer's own row by id or by profile_id
    data/
      hooks.ts                RLS-scoped "fetch what's visible to me" reads (cases,
                              documents, appointments, drafts, notifications, messages)
      actions.ts               Client-side Supabase writes (create/update case, appointment,
                              draft, message, notification)
      server-actions.ts        'use server' — the one write that needs to cross RLS
                              (a lawyer's payment reminder to their client)
    mock-data/               Only the "try demo" static rental contract + legal_sources seed
    store/app-store.ts        Zustand — just the per-browser saved-lawyers bookmark list
    supabase/
      client.ts / server.ts    Browser/server Supabase clients (no-op without env vars)
      admin.ts                 Service-role client — server-only, bypasses RLS
      mappers.ts                snake_case DB rows <-> camelCase app types
  i18n/                      next-intl routing/request/navigation config
  messages/{ar,en}/          Translation namespaces
  types/                     Shared TypeScript types (mirrors the DB schema)
supabase/schema.sql          Full Postgres schema + Row Level Security policies + triggers
scripts/                     One-off setup: seed-supabase.mjs, migration-*.sql follow-ups
```

### AI service layer

Every AI-powered feature (`analyzeDocumentAction`, `askTheLawAction`, `simulateScenarioAction`,
`extractCaseDataAction`, `generateDraftAction`, `processVoiceCommandAction`) is a server action in
`lib/ai/actions.ts`. Each one checks `hasOpenAI()`; if an `OPENAI_API_KEY` is set it calls OpenAI
server-side (key never reaches the client), otherwise it falls back to the deterministic, keyword-grounded
logic in `lib/ai/engine.ts`. The UI never knows or cares which path served the response — swapping providers
means editing `provider.ts`, not the app.

### Data layer

All business data (profiles, lawyers, documents, clauses, analyses, cases, appointments, drafts,
notifications, messages, reviews) lives in Postgres, read through `lib/data/hooks.ts` and written through
`lib/data/actions.ts`. Every table has Row Level Security, so a single unfiltered `select` from any role
already returns only what that user is allowed to see — a citizen's own rows, a lawyer's assigned
cases/clients, or everything for an admin. Three Postgres triggers (`supabase/schema.sql`) create
notifications server-side for actions that cross between two different users' rows (a new case, an
appointment, a message), since RLS otherwise blocks a client-side insert into someone else's `notifications`.

## Database schema (Supabase)

See [`supabase/schema.sql`](supabase/schema.sql) for the full DDL: `profiles`, `lawyers`, `legal_sources`,
`documents`, `document_clauses`, `analyses`, `cases`, `appointments`, `messages`, `drafts`,
`notifications`, `reviews` — with foreign keys, Row Level Security policies scoping every table to its
owner (citizen), participant (lawyer + client on a case), or admin, plus triggers for auto-creating a
profile (and lawyer row) on signup, keeping a lawyer's rating in sync with their reviews, and the
cross-user notifications above. `scripts/seed-supabase.mjs` seeds demo accounts and lawyer/review data
via the Supabase Admin API (bypasses email confirmation) — see that file for the demo account list.

## Environment variables

Copy `.env.example` to `.env.local` and fill in a Supabase project's values. The Supabase variables are
required — real auth, database, and RLS depend on them (see `supabase/schema.sql`). `OPENAI_API_KEY` is
optional; without it, AI features run through the local heuristic engine instead.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Setting up a fresh Supabase project: run `supabase/schema.sql` in the SQL Editor, then
`node scripts/seed-supabase.mjs` (reads `.env.local`) to create demo accounts and lawyer/review data.

## Installation & running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/ar` by default.

## Demo accounts

No sign-up needed. On the landing page or `/login`, use:

- **جرّب كمواطن / Try Citizen Demo** — lands in the citizen dashboard; `/citizen/analyze/new` also has a
  one-click "use the demo rental contract" shortcut with a pre-written analysis
- **جرّب كمحامٍ / Try Lawyer Demo** — lands in the lawyer dashboard, seeded with real case/lawyer data
- **جرّب كمدير / Try Admin Demo** — lands in the admin analytics dashboard, showing real aggregate stats

Each button is a real Supabase Auth sign-in (`loginAction` with a fixed seeded password), not a mock
session — see `lib/auth/demo-accounts.ts` and `scripts/seed-supabase.mjs` for the account list/password.

## AI configuration

- **No key set (default):** every AI feature (analysis, Ask the Law, scenario simulation, drafting,
  extraction, matching) runs through the local heuristic engine. Responses are grounded in the actual
  document/clause text via keyword relevance scoring — not random placeholder text.
- **`OPENAI_API_KEY` set:** the same server actions call OpenAI (`gpt-4o-mini` by default,
  configurable via `OPENAI_MODEL`) for richer natural-language responses, with the heuristic engine as a
  structural safety net. The API key is only ever read server-side (`lib/ai/provider.ts` is marked
  `server-only`).

## Known limitations

- No OCR: uploaded PDFs/images are accepted and stored as metadata, but the actual clause/risk analysis
  needs either pasted text or the seeded demo contract. This is flagged in the UI and is an explicit,
  labeled limitation rather than a silent gap.
- Voice-to-Action is a simulated mic (no real speech-to-text) — clearly labeled as such in the UI.
- WhatsApp notifications and payments are simulated/demo-labeled; lawyer verification is a real
  pending/approve workflow (admin dashboard) but has no external Bar Association integration.
- `legal_sources` is a clearly labeled demo dataset, not verified Jordanian legislation.
- The lawyer "settings" page (notification/availability toggles) is a UI stub not yet wired to the
  database — availability is edited for real from the lawyer's own profile page instead.

## Future improvements

- Real OCR (e.g. an LLM vision call) for uploaded PDFs/images
- pgvector-backed RAG over a verified Jordanian legal source corpus
- Real WhatsApp Business API integration for notifications
- Real Bar Association verification workflow for lawyers
- Payments for paid consultations / SaaS subscription tiers
