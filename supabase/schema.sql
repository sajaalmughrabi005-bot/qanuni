-- QANUNI — قانوني : Supabase schema (v2)
-- Run this in the Supabase SQL editor on a fresh project, top to bottom.
-- Matches the app's real TypeScript types (src/types/index.ts) field-for-field.

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ========================================================================
-- PROFILES — one row per auth.users row, created automatically on signup
-- (see handle_new_user() trigger near the bottom).
-- ========================================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('citizen','lawyer','admin')) default 'citizen',
  language text not null check (language in ('ar','en')) default 'ar',
  city text,
  avatar_url text,
  account_status text not null check (account_status in ('active','disabled')) default 'active',
  created_at timestamptz not null default now()
);

-- ========================================================================
-- LAWYERS — one row per lawyer, linked to a profile 1:1.
-- ========================================================================
create table if not exists lawyers (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  bar_number text,
  specialties text[] not null default '{}',
  bio text default '',
  city text default '',
  languages text[] not null default '{}',
  consultation_price numeric(10,2) not null default 0,
  availability_status text not null check (availability_status in ('available_today','available_this_week','busy')) default 'busy',
  consultation_types text[] not null default '{}',
  verification_status text not null check (verification_status in ('demo_verified','pending','unverified')) default 'pending',
  years_experience int not null default 0,
  rating numeric(2,1) not null default 0,
  review_count int not null default 0,
  completed_cases int not null default 0,
  response_time_hours int not null default 24,
  created_at timestamptz not null default now()
);

-- ========================================================================
-- LEGAL SOURCES — curated reference data (seeded once, admin-maintained).
-- embedding column reserved for a future real RAG/vector-search pass.
-- ========================================================================
create table if not exists legal_sources (
  id uuid primary key default uuid_generate_v4(),
  title_ar text not null,
  title_en text not null,
  article text,
  excerpt_ar text,
  excerpt_en text,
  source_url text,
  source_type text not null default 'demo_dataset',
  verified boolean not null default false,
  is_demo_placeholder boolean not null default true,
  last_verified_at timestamptz,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

-- ========================================================================
-- DOCUMENTS — uploaded/pasted contract text a citizen submitted.
-- ========================================================================
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  file_name text not null,
  file_url text,
  document_type text not null check (document_type in ('rental','employment','service','sale','general')) default 'general',
  language text not null check (language in ('ar','en')) default 'ar',
  status text not null check (status in ('uploaded','processing','analyzed','failed')) default 'uploaded',
  parties jsonb,
  effective_date date,
  duration_months int,
  key_amounts jsonb,
  citizen_description text,
  created_at timestamptz not null default now()
);

-- ========================================================================
-- DOCUMENT CLAUSES — one row per flagged clause in a document.
-- ========================================================================
create table if not exists document_clauses (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references documents(id) on delete cascade,
  clause_number text not null,
  clause_text_ar text not null default '',
  clause_text_en text not null default '',
  risk_level text not null check (risk_level in ('low','medium','high')),
  category text not null check (category in ('contractual','financial','deadline','termination','liability')),
  explanation_ar text not null default '',
  explanation_en text not null default '',
  concern_ar text,
  concern_en text,
  confidence int not null default 60,
  legal_source_id uuid references legal_sources(id),
  created_at timestamptz not null default now()
);

-- ========================================================================
-- ANALYSES — one per document. The bilingual array fields (obligations,
-- deadlines, payment/cancellation terms, concerns, questions, risk
-- categories) are always read/written as a whole unit by the app, so they
-- live in `payload` jsonb rather than ~16 separate array columns.
-- ========================================================================
create table if not exists analyses (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  overall_risk text not null check (overall_risk in ('low','medium','high')),
  summary_ar text not null default '',
  summary_en text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ========================================================================
-- CASES
-- ========================================================================
create table if not exists cases (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references profiles(id) on delete cascade,
  client_name text not null,
  lawyer_id uuid references lawyers(id) on delete set null,
  title text not null,
  category text not null,
  status text not null check (status in ('new','contacted','reviewing','in_progress','court','closed')) default 'new',
  priority text not null check (priority in ('low','medium','high','urgent')) default 'medium',
  summary_ar text default '',
  summary_en text default '',
  client_story_ar text default '',
  client_story_en text default '',
  opposing_party text,
  relevant_clause_ids uuid[] not null default '{}',
  document_ids uuid[] not null default '{}',
  key_dates_ar text[] not null default '{}',
  key_dates_en text[] not null default '{}',
  questions_ar text[] not null default '{}',
  questions_en text[] not null default '{}',
  suggested_specialty text,
  match_score int,
  next_action_ar text,
  next_action_en text,
  deadline date,
  legal_stage text check (legal_stage in ('initial_review','negotiation','legal_notice','in_court','closed')) default 'initial_review',
  total_fees numeric(10,2) default 0,
  payments_received numeric(10,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========================================================================
-- APPOINTMENTS
-- ========================================================================
create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references profiles(id) on delete cascade,
  client_name text not null,
  lawyer_id uuid not null references lawyers(id) on delete cascade,
  case_id uuid references cases(id) on delete set null,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  type text not null check (type in ('in_person','video','phone','court','deadline','follow_up')) default 'video',
  status text not null check (status in ('pending','confirmed','completed','cancelled')) default 'pending',
  location text,
  notes text
);

-- ========================================================================
-- MESSAGES — per-case chat between a citizen and their lawyer.
-- ========================================================================
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid not null references cases(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  sender_name text not null,
  sender_role text not null check (sender_role in ('citizen','lawyer','admin')),
  message text not null,
  created_at timestamptz not null default now()
);

-- ========================================================================
-- DRAFTS — lawyer-authored AI-assisted legal documents.
-- ========================================================================
create table if not exists drafts (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references cases(id) on delete set null,
  lawyer_id uuid not null references lawyers(id) on delete cascade,
  title text not null default '',
  instructions text default '',
  content text default '',
  status text not null check (status in ('draft','final','sent')) default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========================================================================
-- NOTIFICATIONS
-- ========================================================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('analysis_ready','case_update','lawyer_response','appointment','message','review_reminder','system')),
  title_ar text not null,
  title_en text not null,
  body_ar text not null,
  body_en text not null,
  read boolean not null default false,
  is_demo boolean not null default false,
  href text,
  created_at timestamptz not null default now()
);

-- ========================================================================
-- REVIEWS
-- ========================================================================
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  lawyer_id uuid not null references lawyers(id) on delete cascade,
  client_id uuid references profiles(id) on delete set null,
  client_name text not null,
  rating int not null check (rating between 1 and 5),
  review text default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- ========================================================================
-- HELPER FUNCTIONS (security definer so they can read `profiles`/`lawyers`
-- without recursive RLS checks — the standard Supabase pattern).
-- ========================================================================
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

create or replace function current_lawyer_id() returns uuid as $$
  select id from lawyers where profile_id = auth.uid() limit 1;
$$ language sql security definer stable;

-- Auto-create a profile row (and a lawyers row, if signing up as a lawyer)
-- whenever a new auth.users row is created. Expects the client to pass
-- full_name / role / language / bar_number / specialty as signUp() options.data.
create or replace function handle_new_user() returns trigger as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'citizen');
begin
  insert into public.profiles (id, full_name, email, role, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    v_role,
    coalesce(new.raw_user_meta_data->>'language', 'ar')
  );

  if v_role = 'lawyer' then
    insert into public.lawyers (profile_id, full_name, bar_number, specialties, verification_status)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      new.raw_user_meta_data->>'bar_number',
      case
        when new.raw_user_meta_data->>'specialty' is not null
          then array[new.raw_user_meta_data->>'specialty']
        else '{}'::text[]
      end,
      'pending'
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keep updated_at fresh on cases/drafts without every write site remembering to set it.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists cases_set_updated_at on cases;
create trigger cases_set_updated_at before update on cases
  for each row execute function set_updated_at();

drop trigger if exists drafts_set_updated_at on drafts;
create trigger drafts_set_updated_at before update on drafts
  for each row execute function set_updated_at();

-- ========================================================================
-- ROW LEVEL SECURITY
-- ========================================================================
alter table profiles enable row level security;
alter table lawyers enable row level security;
alter table legal_sources enable row level security;
alter table documents enable row level security;
alter table document_clauses enable row level security;
alter table analyses enable row level security;
alter table cases enable row level security;
alter table appointments enable row level security;
alter table messages enable row level security;
alter table drafts enable row level security;
alter table notifications enable row level security;
alter table reviews enable row level security;

-- profiles: self read/update; admins read/update all.
create policy "profiles_self_or_admin_select" on profiles for select
  using (auth.uid() = id or is_admin());
create policy "profiles_self_update" on profiles for update
  using (auth.uid() = id);
create policy "profiles_admin_update" on profiles for update
  using (is_admin());

-- legal_sources: public read only (reference data, admin-maintained via dashboard).
create policy "legal_sources_public_read" on legal_sources for select using (true);

-- lawyers: public read (marketplace); lawyer manages own row; admin manages all.
create policy "lawyers_public_read" on lawyers for select using (true);
create policy "lawyers_self_update" on lawyers for update using (profile_id = auth.uid());
create policy "lawyers_admin_update" on lawyers for update using (is_admin());

-- documents: owner-only, admin can read all.
create policy "documents_owner_all" on documents for all using (user_id = auth.uid());
create policy "documents_admin_read" on documents for select using (is_admin());

-- document_clauses: readable if the parent document belongs to the caller,
-- or the caller is the lawyer on a case that references this document.
create policy "clauses_owner_or_case_lawyer_read" on document_clauses for select using (
  exists (select 1 from documents d where d.id = document_id and d.user_id = auth.uid())
  or exists (
    select 1 from cases c
    where c.lawyer_id = current_lawyer_id()
      and document_id = any(c.document_ids)
  )
  or is_admin()
);
create policy "clauses_owner_write" on document_clauses for insert with check (
  exists (select 1 from documents d where d.id = document_id and d.user_id = auth.uid())
);

-- analyses: owner-only, readable by the assigned case lawyer too.
create policy "analyses_owner_all" on analyses for all using (user_id = auth.uid());
create policy "analyses_case_lawyer_read" on analyses for select using (
  exists (
    select 1 from cases c
    where c.lawyer_id = current_lawyer_id()
      and document_id = any(c.document_ids)
  )
);
create policy "analyses_admin_read" on analyses for select using (is_admin());

-- cases: visible/writable by the client and the assigned lawyer; admin all.
create policy "cases_participant_read" on cases for select using (
  client_id = auth.uid() or lawyer_id = current_lawyer_id() or is_admin()
);
create policy "cases_client_insert" on cases for insert with check (client_id = auth.uid());
create policy "cases_lawyer_insert" on cases for insert with check (lawyer_id = current_lawyer_id());
create policy "cases_participant_update" on cases for update using (
  client_id = auth.uid() or lawyer_id = current_lawyer_id() or is_admin()
);

-- appointments: visible/writable by the client and the lawyer involved.
create policy "appointments_participant_read" on appointments for select using (
  client_id = auth.uid() or lawyer_id = current_lawyer_id() or is_admin()
);
create policy "appointments_participant_write" on appointments for all using (
  client_id = auth.uid() or lawyer_id = current_lawyer_id()
);

-- messages: visible/writable by participants of the parent case.
create policy "messages_case_participant_read" on messages for select using (
  exists (
    select 1 from cases c where c.id = case_id
    and (c.client_id = auth.uid() or c.lawyer_id = current_lawyer_id())
  ) or is_admin()
);
create policy "messages_case_participant_insert" on messages for insert with check (
  sender_id = auth.uid() and exists (
    select 1 from cases c where c.id = case_id
    and (c.client_id = auth.uid() or c.lawyer_id = current_lawyer_id())
  )
);

-- drafts: the owning lawyer only.
create policy "drafts_lawyer_all" on drafts for all using (lawyer_id = current_lawyer_id());

-- notifications: owner-only.
create policy "notifications_owner_all" on notifications for all using (user_id = auth.uid());

-- reviews: public read; any authenticated citizen can post their own.
create policy "reviews_public_read" on reviews for select using (true);
create policy "reviews_self_insert" on reviews for insert with check (client_id = auth.uid());
