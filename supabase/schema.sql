-- QANUNI — قانوني : Supabase schema
-- Run in the Supabase SQL editor on a fresh project.
-- Enables pgvector for future legal-source embeddings (RAG).

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ========== profiles ==========
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('citizen','lawyer','admin')) default 'citizen',
  language text not null check (language in ('ar','en')) default 'ar',
  city text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ========== lawyers ==========
create table if not exists lawyers (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  specialty text[] not null default '{}',
  bio text,
  city text,
  languages text[] not null default '{}',
  consultation_price numeric(10,2) default 0,
  availability_status text default 'available_this_week',
  verification_status text default 'pending' check (verification_status in ('demo_verified','pending','unverified')),
  years_experience int default 0,
  rating numeric(2,1) default 0,
  response_time_hours int default 24,
  created_at timestamptz not null default now()
);

-- ========== legal_sources ==========
create table if not exists legal_sources (
  id uuid primary key default uuid_generate_v4(),
  title_ar text not null,
  title_en text not null,
  article text,
  excerpt_ar text,
  excerpt_en text,
  source_url text,
  source_type text default 'demo_dataset',
  verified boolean not null default false,
  last_verified_at timestamptz,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

-- ========== documents ==========
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  file_url text,
  file_name text,
  document_type text default 'general',
  language text default 'ar',
  status text default 'uploaded' check (status in ('uploaded','processing','analyzed','failed')),
  created_at timestamptz not null default now()
);

-- ========== document_clauses ==========
create table if not exists document_clauses (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references documents(id) on delete cascade,
  clause_number text,
  clause_text_ar text,
  clause_text_en text,
  risk_level text check (risk_level in ('low','medium','high')),
  category text,
  explanation_ar text,
  explanation_en text,
  concern_ar text,
  concern_en text,
  confidence int,
  legal_source_id uuid references legal_sources(id),
  created_at timestamptz not null default now()
);

-- ========== analyses ==========
create table if not exists analyses (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  overall_risk text check (overall_risk in ('low','medium','high')),
  summary_ar text,
  summary_en text,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ========== cases ==========
create table if not exists cases (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references profiles(id) on delete cascade,
  lawyer_id uuid references lawyers(id),
  title text not null,
  category text,
  status text default 'new' check (status in ('new','contacted','reviewing','in_progress','court','closed')),
  priority text default 'medium' check (priority in ('low','medium','high','urgent')),
  summary_ar text,
  summary_en text,
  client_story_ar text,
  client_story_en text,
  opposing_party text,
  match_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== case_documents ==========
create table if not exists case_documents (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid not null references cases(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade
);

-- ========== appointments ==========
create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references profiles(id) on delete cascade,
  lawyer_id uuid not null references lawyers(id) on delete cascade,
  case_id uuid references cases(id),
  title text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  type text default 'video',
  status text default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  location text,
  notes text
);

-- ========== messages ==========
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid not null references cases(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  message text not null,
  created_at timestamptz not null default now()
);

-- ========== drafts ==========
create table if not exists drafts (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references cases(id),
  lawyer_id uuid not null references lawyers(id) on delete cascade,
  title text,
  instructions text,
  content text,
  status text default 'draft' check (status in ('draft','final','sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== notifications ==========
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text,
  title_ar text,
  title_en text,
  body_ar text,
  body_en text,
  read boolean not null default false,
  is_demo boolean default false,
  href text,
  created_at timestamptz not null default now()
);

-- ========== reviews ==========
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  lawyer_id uuid not null references lawyers(id) on delete cascade,
  client_id uuid references profiles(id),
  rating int check (rating between 1 and 5),
  review text,
  is_demo boolean default false,
  created_at timestamptz not null default now()
);

-- ========== Row Level Security ==========
alter table profiles enable row level security;
alter table lawyers enable row level security;
alter table documents enable row level security;
alter table document_clauses enable row level security;
alter table analyses enable row level security;
alter table cases enable row level security;
alter table case_documents enable row level security;
alter table appointments enable row level security;
alter table messages enable row level security;
alter table drafts enable row level security;
alter table notifications enable row level security;
alter table reviews enable row level security;
alter table legal_sources enable row level security;

-- profiles: users manage their own profile; admins read all
create policy "profiles_self_select" on profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on profiles for update using (auth.uid() = id);
create policy "profiles_self_insert" on profiles for insert with check (auth.uid() = id);

-- legal_sources: public read (reference data)
create policy "legal_sources_public_read" on legal_sources for select using (true);

-- lawyers: public read; lawyer manages own row
create policy "lawyers_public_read" on lawyers for select using (true);
create policy "lawyers_self_write" on lawyers for update using (
  profile_id = auth.uid()
);

-- documents: owner-only
create policy "documents_owner_all" on documents for all using (user_id = auth.uid());

-- document_clauses: readable if the parent document belongs to the user or the case lawyer
create policy "clauses_owner_read" on document_clauses for select using (
  exists (select 1 from documents d where d.id = document_id and d.user_id = auth.uid())
);

-- analyses: owner-only
create policy "analyses_owner_all" on analyses for all using (user_id = auth.uid());

-- cases: visible to the client and the assigned lawyer
create policy "cases_participant_read" on cases for select using (
  client_id = auth.uid() or lawyer_id in (select id from lawyers where profile_id = auth.uid())
);
create policy "cases_client_insert" on cases for insert with check (client_id = auth.uid());
create policy "cases_participant_update" on cases for update using (
  client_id = auth.uid() or lawyer_id in (select id from lawyers where profile_id = auth.uid())
);

-- appointments: visible to client and lawyer
create policy "appointments_participant_read" on appointments for select using (
  client_id = auth.uid() or lawyer_id in (select id from lawyers where profile_id = auth.uid())
);
create policy "appointments_participant_write" on appointments for all using (
  client_id = auth.uid() or lawyer_id in (select id from lawyers where profile_id = auth.uid())
);

-- messages: visible to case participants
create policy "messages_case_participant" on messages for select using (
  exists (
    select 1 from cases c where c.id = case_id
    and (c.client_id = auth.uid() or c.lawyer_id in (select id from lawyers where profile_id = auth.uid()))
  )
);
create policy "messages_case_insert" on messages for insert with check (sender_id = auth.uid());

-- drafts: lawyer-only
create policy "drafts_lawyer_all" on drafts for all using (
  lawyer_id in (select id from lawyers where profile_id = auth.uid())
);

-- notifications: owner-only
create policy "notifications_owner_all" on notifications for all using (user_id = auth.uid());

-- reviews: public read, client can insert own
create policy "reviews_public_read" on reviews for select using (true);
create policy "reviews_client_insert" on reviews for insert with check (client_id = auth.uid());
