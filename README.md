# قانوني — QANUNI

**Understand your rights before you sign.** · **افهم حقك قبل ما توقّع.**

A bilingual (Arabic/English) Jordanian LegalTech platform that connects citizens to AI-powered document understanding and licensed lawyers, and gives lawyers an AI-assisted case management workspace.

> This is a hackathon build. It runs **fully in demo mode** out of the box — no Supabase project or OpenAI key required — while including the real architecture (Supabase schema, RLS policies, server-side AI service layer) needed to become a production product.

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
- **Zustand** (persisted to `localStorage`) as the demo data layer — seeded from `src/lib/mock-data`
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) client/server wrappers — used automatically when env vars are present
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
    providers/              RoleGuard, StoreHydration
  lib/
    ai/
      engine.ts             Local heuristic "AI" — clause risk scoring, Q&A, scenario
                             simulation, matching, extraction, drafting. No API key needed.
      provider.ts            Server-only OpenAI wrapper (chat completions, JSON mode)
      actions.ts             'use server' entry points — try OpenAI if configured,
                             else fall back to engine.ts. This is the single AI service
                             layer the UI talks to.
      glossary.ts             Legal Language Simplifier terms
    mock-data/               Seeded demo dataset (contract, clauses, lawyers, cases, ...)
    store/app-store.ts        Zustand store — the "database" for demo mode
    supabase/                 Browser/server Supabase clients (no-op without env vars)
  i18n/                      next-intl routing/request/navigation config
  messages/{ar,en}/          Translation namespaces
  types/                     Shared TypeScript types (mirrors the DB schema)
supabase/schema.sql          Full Postgres schema + Row Level Security policies
```

### AI service layer

Every AI-powered feature (`analyzeDocumentAction`, `askTheLawAction`, `simulateScenarioAction`,
`extractCaseDataAction`, `generateDraftAction`, `processVoiceCommandAction`) is a server action in
`lib/ai/actions.ts`. Each one checks `hasOpenAI()`; if an `OPENAI_API_KEY` is set it calls OpenAI
server-side (key never reaches the client), otherwise it falls back to the deterministic, keyword-grounded
logic in `lib/ai/engine.ts`. The UI never knows or cares which path served the response — swapping providers
means editing `provider.ts`, not the app.

### Demo data layer

Without Supabase credentials, `lib/store/app-store.ts` (Zustand + `localStorage` persistence) acts as the
database: documents, analyses, cases, appointments, drafts, notifications, messages. It's seeded from
`lib/mock-data` on first load, so the "Try Demo" flow works immediately and stays consistent across a
session/browser. The Supabase schema (`supabase/schema.sql`) mirrors this exact shape, so wiring a real
project mainly means swapping the store's read/write calls for Supabase queries.

## Database schema (Supabase)

See [`supabase/schema.sql`](supabase/schema.sql) for the full DDL: `profiles`, `lawyers`, `legal_sources`,
`documents`, `document_clauses`, `analyses`, `cases`, `case_documents`, `appointments`, `messages`, `drafts`,
`notifications`, `reviews` — with foreign keys and Row Level Security policies scoping every table to its
owner (citizen) or participant (lawyer + client on a case).

## Environment variables

Copy `.env.example` to `.env.local`. **Everything is optional** — the app runs fully in demo mode with none of these set.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

## Installation & running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/ar` by default.

## Demo accounts

No sign-up needed. On the landing page or `/login`, use:

- **جرّب كمواطن / Try Citizen Demo** — lands in the citizen dashboard with a pre-analyzed rental contract
- **جرّب كمحامٍ / Try Lawyer Demo** — lands in the lawyer dashboard with a seeded case pipeline
- **جرّب كمدير / Try Admin Demo** — lands in the admin analytics dashboard

Each button signs you in instantly (`useAppStore.loginDemo(role)`) — no password, no backend call.

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
- Lawyer verification, WhatsApp notifications, and payments are simulated/demo-labeled, per the "mock vs.
  real" distinction the product intentionally makes.
- The demo data layer (Zustand + `localStorage`) is per-browser; it is not a shared multi-user backend
  until Supabase is wired in.
- `legal_sources` is a clearly labeled demo dataset, not verified Jordanian legislation.

## Future improvements

- Wire `lib/supabase/{client,server}.ts` into `lib/store/app-store.ts` behind `isSupabaseConfigured()`
- Real OCR (e.g. an LLM vision call) for uploaded PDFs/images
- pgvector-backed RAG over a verified Jordanian legal source corpus
- Real WhatsApp Business API integration for notifications
- Real Bar Association verification workflow for lawyers
- Payments for paid consultations / SaaS subscription tiers
