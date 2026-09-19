-- QANUNI — migration 004: real case lifecycle, server-side authorization,
-- lawyer verification, case timeline / documents / messaging, admin least
-- privilege, reports and system events.
--
-- Run ONCE in the Supabase SQL editor, on top of supabase/schema.sql (which
-- already contains migrations 2 and 3). Safe to re-run: every statement is
-- idempotent (drop-if-exists / create-or-replace / if-not-exists).
--
-- Security model after this migration:
--   * Clients can never write privileged columns directly. Role, account
--     status, lawyer verification, case status/ownership, notifications and
--     the case timeline are only changed by SECURITY DEFINER functions or
--     triggers that derive identity from auth.uid(), never from the request.
--   * The admin role has no blanket read access to private content
--     (documents, analyses, messages, case stories). It gets aggregate
--     statistics and a metadata-only cases view instead.

begin;

-- =====================================================================
-- 0. HELPERS
-- =====================================================================
create or replace function current_approved_lawyer_id() returns uuid as $$
  select id from public.lawyers
  where profile_id = auth.uid() and verification_status = 'approved'
  limit 1;
$$ language sql security definer stable set search_path = public;

create or replace function is_case_participant(p_case uuid) returns boolean as $$
  select exists (
    select 1 from public.cases c
    where c.id = p_case
      and (c.client_id = auth.uid() or c.lawyer_id = public.current_lawyer_id())
  );
$$ language sql security definer stable set search_path = public;

-- Internal notification writer. Not callable by clients.
create or replace function _notify(
  p_user uuid, p_type text, p_title_ar text, p_title_en text,
  p_body_ar text, p_body_en text, p_href text
) returns void as $$
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, type, title_ar, title_en, body_ar, body_en, href)
  values (p_user, p_type, p_title_ar, p_title_en, p_body_ar, p_body_en, p_href);
end;
$$ language plpgsql security definer set search_path = public;

-- Internal timeline writer. Timestamps are always server-side (now()).
create or replace function _case_event(
  p_case uuid, p_actor uuid, p_role text, p_type text, p_meta jsonb default '{}'::jsonb
) returns void as $$
begin
  insert into public.case_events (case_id, actor_id, actor_role, event_type, metadata)
  values (p_case, p_actor, p_role, p_type, coalesce(p_meta, '{}'::jsonb));
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists cases_notify_lawyer on cases;
drop trigger if exists messages_notify on messages;
drop function if exists notify_case_lawyer();
drop function if exists notify_message_recipient();

revoke all on function _notify(uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function _case_event(uuid, uuid, text, text, jsonb) from public, anon, authenticated;

-- =====================================================================
-- 1. SIGNUP: only citizen / lawyer can ever be created from user metadata.
--    (Previously raw_user_meta_data->>'role' was trusted, so anyone calling
--    the public signUp API directly could have registered as 'admin'.)
-- =====================================================================
create or replace function handle_new_user() returns trigger as $$
declare
  v_role text := case when new.raw_user_meta_data->>'role' = 'lawyer' then 'lawyer' else 'citizen' end;
  v_lang text := case when new.raw_user_meta_data->>'language' = 'en' then 'en' else 'ar' end;
  v_name text := left(coalesce(new.raw_user_meta_data->>'full_name', ''), 120);
  v_spec text := new.raw_user_meta_data->>'specialty';
begin
  insert into public.profiles (id, full_name, email, role, language)
  values (new.id, v_name, new.email, v_role, v_lang);

  if v_role = 'lawyer' then
    insert into public.lawyers (profile_id, full_name, bar_number, specialties, verification_status, verification_info)
    values (
      new.id,
      v_name,
      left(new.raw_user_meta_data->>'bar_number', 60),
      case when v_spec = any (array['rental','employment','commercial','family','criminal','real_estate','corporate','civil'])
           then array[v_spec] else '{}'::text[] end,
      'pending',
      left(new.raw_user_meta_data->>'verification_info', 2000)
    );
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- =====================================================================
-- 2. LAWYERS: verification workflow, availability, private base table,
--    safe public view.
-- =====================================================================
alter table lawyers add column if not exists is_demo boolean not null default false;
alter table lawyers add column if not exists accepting_new_cases boolean not null default true;
alter table lawyers add column if not exists preferred_categories text[] not null default '{}';
alter table lawyers add column if not exists verification_info text;
alter table lawyers add column if not exists verification_admin_note text;
alter table lawyers add column if not exists verified_at timestamptz;
alter table lawyers add column if not exists verified_by uuid references profiles(id) on delete set null;

do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.lawyers'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%verification_status%'
  loop
    execute format('alter table public.lawyers drop constraint %I', r.conname);
  end loop;
end $$;

update lawyers set verification_status = 'approved' where verification_status = 'demo_verified';
update lawyers set verification_status = 'rejected' where verification_status = 'unverified';
alter table lawyers add constraint lawyers_verification_status_check
  check (verification_status in ('pending', 'approved', 'rejected', 'more_info_requested'));

drop policy if exists "lawyers_public_read" on lawyers;
drop policy if exists "lawyers_self_update" on lawyers;
drop policy if exists "lawyers_admin_update" on lawyers;
drop policy if exists "lawyers_self_read" on lawyers;
drop policy if exists "lawyers_admin_read" on lawyers;
create policy "lawyers_self_read" on lawyers for select using (profile_id = auth.uid());
create policy "lawyers_admin_read" on lawyers for select using (is_admin());
create policy "lawyers_self_update" on lawyers for update using (profile_id = auth.uid());

-- Clients may only edit the professional-profile columns. Verification
-- status, rating, review count, completed cases, bar number and the admin
-- note can NOT be changed by the lawyer (previously a lawyer could simply
-- set their own verification_status to 'approved').
revoke insert, update, delete, truncate on lawyers from anon, authenticated;
grant update (
  avatar_url, bio, city, languages, specialties, consultation_price,
  availability_status, consultation_types, years_experience, response_time_hours,
  accepting_new_cases, preferred_categories
) on lawyers to authenticated;

-- The directory reads this view: approved, non-demo, active-account lawyers
-- only, and only public-safe columns (no bar number, no verification data).
drop view if exists lawyers_public;
create view lawyers_public as
  select
    l.id, l.profile_id, l.full_name, l.avatar_url, l.specialties, l.bio, l.city,
    l.languages, l.consultation_price, l.availability_status, l.consultation_types,
    l.years_experience, l.rating, l.review_count, l.completed_cases,
    l.response_time_hours, l.accepting_new_cases, l.preferred_categories,
    l.verification_status, l.created_at
  from lawyers l
  join profiles p on p.id = l.profile_id
  where l.verification_status = 'approved'
    and l.is_demo = false
    and p.account_status = 'active';
grant select on lawyers_public to anon, authenticated;

-- =====================================================================
-- 3. PROFILES: users can edit only their own presentation fields.
--    (Previously profiles_self_update allowed UPDATE of ANY column, so a
--    user could set role='admin' or reactivate a disabled account.)
-- =====================================================================
revoke insert, update, delete, truncate on profiles from anon, authenticated;
grant update (full_name, phone, city, avatar_url, language) on profiles to authenticated;
drop policy if exists "profiles_admin_update" on profiles;

-- =====================================================================
-- 4. CASES: lifecycle columns, no direct client writes.
-- =====================================================================
alter table cases alter column client_id drop not null;
alter table cases add column if not exists urgency text not null default 'medium';
alter table cases add column if not exists request_description text;
alter table cases add column if not exists request_message text;
alter table cases add column if not exists requested_at timestamptz not null default now();
alter table cases add column if not exists accepted_at timestamptz;
alter table cases add column if not exists accepted_by uuid references profiles(id) on delete set null;
alter table cases add column if not exists rejected_at timestamptz;
alter table cases add column if not exists rejection_reason text;
alter table cases add column if not exists rejection_note text;
alter table cases add column if not exists viewed_by_lawyer_at timestamptz;
alter table cases add column if not exists resolved_at timestamptz;
alter table cases add column if not exists closed_at timestamptz;
alter table cases add column if not exists is_manual boolean not null default false;

do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.cases'::regclass and contype = 'c'
      and (pg_get_constraintdef(oid) ilike '%status%' and pg_get_constraintdef(oid) not ilike '%legal_stage%')
  loop
    execute format('alter table public.cases drop constraint %I', r.conname);
  end loop;
end $$;

update cases set status = case status
  when 'new' then 'requested' when 'contacted' then 'accepted' when 'reviewing' then 'active'
  when 'in_progress' then 'active' when 'court' then 'active' else status end;
alter table cases add constraint cases_status_check check (status in (
  'requested','accepted','active','waiting_for_client','waiting_for_lawyer','resolved','closed','rejected'));
alter table cases alter column status set default 'requested';
alter table cases drop constraint if exists cases_urgency_check;
alter table cases add constraint cases_urgency_check check (urgency in ('low','medium','high','urgent'));
alter table cases drop constraint if exists cases_rejection_reason_check;
alter table cases add constraint cases_rejection_reason_check
  check (rejection_reason is null or rejection_reason in ('out_of_scope','no_capacity','conflict_of_interest','other'));

drop policy if exists "cases_participant_read" on cases;
drop policy if exists "cases_client_insert" on cases;
drop policy if exists "cases_lawyer_insert" on cases;
drop policy if exists "cases_participant_update" on cases;
drop policy if exists "cases_lawyer_update" on cases;
create policy "cases_participant_read" on cases for select
  using (client_id = auth.uid() or lawyer_id = current_lawyer_id());
create policy "cases_lawyer_update" on cases for update
  using (lawyer_id = current_lawyer_id() and status not in ('rejected', 'closed', 'requested'));

-- No INSERT/DELETE for clients at all: cases are created by request_case()
-- (or lawyer_create_manual_case()) which derive client/lawyer identity
-- server-side. UPDATE is limited to lawyer working-fields; STATUS, owner
-- and lawyer assignment are only changeable via the RPCs below.
revoke insert, update, delete, truncate on cases from anon, authenticated;
grant update (
  priority, summary_ar, summary_en, opposing_party, key_dates_ar, key_dates_en,
  questions_ar, questions_en, next_action_ar, next_action_en, deadline,
  legal_stage, total_fees, payments_received
) on cases to authenticated;

-- =====================================================================
-- 5. TIMELINE, PRIVATE NOTES, DOCUMENTS, REPORTS, SYSTEM EVENTS
-- =====================================================================
create table if not exists case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  actor_role text not null default 'system' check (actor_role in ('client','lawyer','admin','system')),
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists case_events_case_idx on case_events (case_id, created_at);
alter table case_events enable row level security;
drop policy if exists "case_events_participant_read" on case_events;
drop policy if exists "case_events_admin_read" on case_events;
create policy "case_events_participant_read" on case_events for select using (is_case_participant(case_id));
create policy "case_events_admin_read" on case_events for select using (is_admin());
revoke insert, update, delete, truncate on case_events from anon, authenticated;
grant select on case_events to authenticated;

create table if not exists case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  lawyer_id uuid not null references lawyers(id) on delete cascade,
  note text not null check (char_length(note) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists case_notes_case_idx on case_notes (case_id, created_at);
alter table case_notes enable row level security;
drop policy if exists "case_notes_lawyer_select" on case_notes;
drop policy if exists "case_notes_lawyer_insert" on case_notes;
drop policy if exists "case_notes_lawyer_delete" on case_notes;
create policy "case_notes_lawyer_select" on case_notes for select using (lawyer_id = current_lawyer_id());
create policy "case_notes_lawyer_insert" on case_notes for insert
  with check (
    lawyer_id = current_lawyer_id()
    and exists (select 1 from cases c where c.id = case_id and c.lawyer_id = current_lawyer_id())
  );
create policy "case_notes_lawyer_delete" on case_notes for delete using (lawyer_id = current_lawyer_id());
revoke update, truncate on case_notes from anon, authenticated;
revoke all on case_notes from anon;

create table if not exists case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  uploaded_by uuid not null references profiles(id) on delete cascade,
  uploaded_by_role text not null check (uploaded_by_role in ('client','lawyer')),
  file_name text not null check (char_length(file_name) between 1 and 255),
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 10485760),
  created_at timestamptz not null default now()
);
create index if not exists case_documents_case_idx on case_documents (case_id, created_at);
alter table case_documents enable row level security;
drop policy if exists "case_documents_participant_read" on case_documents;
drop policy if exists "case_documents_insert" on case_documents;
drop policy if exists "case_documents_uploader_delete" on case_documents;
create policy "case_documents_participant_read" on case_documents for select using (is_case_participant(case_id));
create policy "case_documents_insert" on case_documents for insert
  with check (uploaded_by = auth.uid() and is_case_participant(case_id));
create policy "case_documents_uploader_delete" on case_documents for delete using (uploaded_by = auth.uid());
revoke update, truncate on case_documents from anon, authenticated;
revoke all on case_documents from anon;

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('lawyer', 'case', 'user')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 200),
  details text check (details is null or char_length(details) <= 3000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_note text,
  resolved_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table reports enable row level security;
drop policy if exists "reports_reporter_insert" on reports;
drop policy if exists "reports_reporter_read" on reports;
drop policy if exists "reports_admin_read" on reports;
create policy "reports_reporter_insert" on reports for insert with check (reporter_id = auth.uid());
create policy "reports_reporter_read" on reports for select using (reporter_id = auth.uid());
create policy "reports_admin_read" on reports for select using (is_admin());
revoke update, delete, truncate on reports from anon, authenticated;
revoke all on reports from anon;

create table if not exists system_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  severity text not null default 'error' check (severity in ('info', 'warning', 'error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table system_events enable row level security;
drop policy if exists "system_events_admin_read" on system_events;
create policy "system_events_admin_read" on system_events for select using (is_admin());
revoke insert, update, delete, truncate on system_events from anon, authenticated;
revoke all on system_events from anon;

-- =====================================================================
-- 6. STORAGE: private bucket, participants only, signed URLs only.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'case-documents', 'case-documents', false, 10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "case_docs_read" on storage.objects;
drop policy if exists "case_docs_insert" on storage.objects;
drop policy if exists "case_docs_delete" on storage.objects;
create policy "case_docs_read" on storage.objects for select to authenticated
  using (bucket_id = 'case-documents' and is_case_participant(((storage.foldername(name))[1])::uuid));
create policy "case_docs_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'case-documents' and is_case_participant(((storage.foldername(name))[1])::uuid));
create policy "case_docs_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'case-documents' and owner = auth.uid());

-- =====================================================================
-- 7. MESSAGES: receiver/read status, server-derived identity, case-bound.
-- =====================================================================
alter table messages add column if not exists receiver_id uuid references profiles(id) on delete set null;
alter table messages add column if not exists read_at timestamptz;
alter table messages add column if not exists kind text not null default 'text';
alter table messages drop constraint if exists messages_kind_check;
alter table messages add constraint messages_kind_check check (kind in ('text', 'document_request', 'clarification_request'));
alter table messages drop constraint if exists messages_length_check;
alter table messages add constraint messages_length_check check (char_length(message) between 1 and 5000);

drop policy if exists "messages_case_participant_read" on messages;
drop policy if exists "messages_case_participant_insert" on messages;
create policy "messages_case_participant_read" on messages for select using (is_case_participant(case_id));
create policy "messages_case_participant_insert" on messages for insert
  with check (sender_id = auth.uid() and is_case_participant(case_id));
revoke update, delete, truncate on messages from anon, authenticated;
revoke all on messages from anon;

create or replace function messages_before_insert() returns trigger as $$
declare
  c public.cases%rowtype;
  v_lawyer_profile uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  select * into c from public.cases where id = new.case_id;
  if not found then raise exception 'case_not_found'; end if;
  select profile_id into v_lawyer_profile from public.lawyers where id = c.lawyer_id;

  if c.client_id is not null and c.client_id = auth.uid() then
    new.sender_role := 'citizen';
    new.receiver_id := v_lawyer_profile;
  elsif c.lawyer_id is not null and c.lawyer_id = public.current_lawyer_id() then
    new.sender_role := 'lawyer';
    new.receiver_id := c.client_id;
  else
    raise exception 'forbidden';
  end if;
  if new.receiver_id is null then raise exception 'no_recipient'; end if;
  if c.status not in ('accepted','active','waiting_for_client','waiting_for_lawyer','resolved') then
    raise exception 'case_not_open_for_messages';
  end if;
  if new.kind <> 'text' and new.sender_role <> 'lawyer' then
    raise exception 'forbidden';
  end if;

  new.sender_id := auth.uid();
  select full_name into new.sender_name from public.profiles where id = auth.uid();
  new.read_at := null;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists messages_before_insert on messages;
create trigger messages_before_insert before insert on messages
  for each row execute function messages_before_insert();

create or replace function messages_after_insert() returns trigger as $$
declare
  c public.cases%rowtype;
  v_preview text := left(new.message, 80);
begin
  select * into c from public.cases where id = new.case_id;

  if new.kind = 'document_request' then
    perform public._case_event(new.case_id, new.sender_id, 'lawyer', 'document_requested', jsonb_build_object('text', v_preview));
    perform public._notify(new.receiver_id, 'document', 'طلب مستند من المحامي', 'Your lawyer requested a document',
      new.sender_name || ': ' || v_preview, new.sender_name || ': ' || v_preview, '/citizen/cases/' || new.case_id);
  elsif new.kind = 'clarification_request' then
    perform public._case_event(new.case_id, new.sender_id, 'lawyer', 'clarification_requested', jsonb_build_object('text', v_preview));
    perform public._notify(new.receiver_id, 'message', 'طلب توضيح من المحامي', 'Your lawyer asked for clarification',
      new.sender_name || ': ' || v_preview, new.sender_name || ': ' || v_preview, '/citizen/cases/' || new.case_id);
  elsif new.sender_role = 'lawyer' then
    perform public._notify(new.receiver_id, 'message', 'رسالة جديدة من المحامي', 'New message from your lawyer',
      new.sender_name || ': ' || v_preview, new.sender_name || ': ' || v_preview, '/citizen/cases/' || new.case_id);
  else
    perform public._notify(new.receiver_id, 'message', 'رد جديد من العميل', 'New reply from your client',
      new.sender_name || ': ' || v_preview, new.sender_name || ': ' || v_preview, '/lawyer/cases/' || new.case_id);
  end if;

  -- Automatic hand-offs so "who has to act next" is always accurate.
  if new.kind <> 'text' and c.status in ('active', 'waiting_for_lawyer') then
    update public.cases set status = 'waiting_for_client' where id = c.id;
  elsif new.sender_role = 'citizen' and c.status = 'waiting_for_client' then
    update public.cases set status = 'waiting_for_lawyer' where id = c.id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists messages_notify on messages;
drop trigger if exists messages_after_insert on messages;
create trigger messages_after_insert after insert on messages
  for each row execute function messages_after_insert();

create or replace function mark_messages_read(p_case_id uuid) returns void as $$
begin
  if not is_case_participant(p_case_id) then raise exception 'forbidden'; end if;
  update public.messages set read_at = now()
  where case_id = p_case_id and receiver_id = auth.uid() and read_at is null;
end;
$$ language plpgsql security definer set search_path = public;

-- =====================================================================
-- 8. CASE DOCUMENTS: server-derived uploader, hand-offs, notifications.
-- =====================================================================
create or replace function case_documents_before_insert() returns trigger as $$
declare
  c public.cases%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into c from public.cases where id = new.case_id;
  if not found then raise exception 'case_not_found'; end if;

  if c.client_id is not null and c.client_id = auth.uid() then
    new.uploaded_by_role := 'client';
    if c.status not in ('requested','accepted','active','waiting_for_client','waiting_for_lawyer') then
      raise exception 'case_not_open_for_documents';
    end if;
  elsif c.lawyer_id is not null and c.lawyer_id = public.current_lawyer_id() then
    new.uploaded_by_role := 'lawyer';
    if c.status not in ('accepted','active','waiting_for_client','waiting_for_lawyer') then
      raise exception 'case_not_open_for_documents';
    end if;
  else
    raise exception 'forbidden';
  end if;
  if position(new.case_id::text || '/' in new.storage_path) <> 1 then
    raise exception 'invalid_storage_path';
  end if;
  new.uploaded_by := auth.uid();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists case_documents_before_insert on case_documents;
create trigger case_documents_before_insert before insert on case_documents
  for each row execute function case_documents_before_insert();

create or replace function case_documents_after_insert() returns trigger as $$
declare
  c public.cases%rowtype;
  v_lawyer_profile uuid;
begin
  select * into c from public.cases where id = new.case_id;
  select profile_id into v_lawyer_profile from public.lawyers where id = c.lawyer_id;
  perform public._case_event(new.case_id, new.uploaded_by, new.uploaded_by_role, 'document_uploaded',
    jsonb_build_object('file_name', new.file_name));
  if new.uploaded_by_role = 'client' then
    perform public._notify(v_lawyer_profile, 'document', 'رفع العميل مستندًا جديدًا', 'Your client uploaded a document',
      new.file_name, new.file_name, '/lawyer/cases/' || new.case_id);
    if c.status = 'waiting_for_client' then
      update public.cases set status = 'waiting_for_lawyer' where id = c.id;
    end if;
  else
    perform public._notify(c.client_id, 'document', 'رفع المحامي مستندًا جديدًا', 'Your lawyer uploaded a document',
      new.file_name, new.file_name, '/citizen/cases/' || new.case_id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists case_documents_after_insert on case_documents;
create trigger case_documents_after_insert after insert on case_documents
  for each row execute function case_documents_after_insert();

-- =====================================================================
-- 9. CASE LIFECYCLE
-- =====================================================================
create or replace function _allowed_transition(p_role text, p_from text, p_to text) returns boolean as $$
  select case
    when p_role = 'lawyer' then (p_from, p_to) in (
      ('accepted','active'),
      ('active','waiting_for_client'), ('active','resolved'),
      ('waiting_for_client','active'), ('waiting_for_client','resolved'),
      ('waiting_for_lawyer','active'), ('waiting_for_lawyer','waiting_for_client'), ('waiting_for_lawyer','resolved'),
      ('resolved','active'), ('resolved','closed'))
    when p_role = 'client' then (p_from, p_to) in (
      ('waiting_for_client','waiting_for_lawyer'), ('resolved','closed'))
    else false
  end;
$$ language sql immutable;

-- Citizen -> lawyer request. Identity comes from auth.uid(); the lawyer must
-- be approved, non-demo and accepting new cases.
create or replace function request_case(
  p_lawyer_id uuid,
  p_title text,
  p_category text,
  p_description text,
  p_urgency text default 'medium',
  p_document_ids uuid[] default '{}',
  p_relevant_clause_ids uuid[] default '{}',
  p_message text default null,
  p_summary_ar text default '',
  p_summary_en text default '',
  p_key_dates_ar text[] default '{}',
  p_key_dates_en text[] default '{}',
  p_questions_ar text[] default '{}',
  p_questions_en text[] default '{}',
  p_match_score int default null
) returns uuid as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_lawyer public.lawyers%rowtype;
  v_docs uuid[];
  v_clauses uuid[];
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.role <> 'citizen' or v_profile.account_status <> 'active' then
    raise exception 'not_allowed';
  end if;

  select * into v_lawyer from public.lawyers where id = p_lawyer_id;
  if not found or v_lawyer.verification_status <> 'approved' or v_lawyer.is_demo then
    raise exception 'lawyer_unavailable';
  end if;
  if not v_lawyer.accepting_new_cases then raise exception 'lawyer_not_accepting'; end if;

  if p_title is null or char_length(btrim(p_title)) not between 3 and 200 then raise exception 'invalid_title'; end if;
  if p_description is null or char_length(btrim(p_description)) not between 10 and 5000 then raise exception 'invalid_description'; end if;
  if p_urgency not in ('low','medium','high','urgent') then raise exception 'invalid_urgency'; end if;
  if p_category is null or p_category <> all (array['rental','employment','commercial','family','criminal','real_estate','corporate','civil']) then
    -- (<> ALL over an array is true when the value matches none of them)
    raise exception 'invalid_category';
  end if;
  if p_message is not null and char_length(p_message) > 3000 then raise exception 'invalid_message'; end if;

  select coalesce(array_agg(id), '{}') into v_docs from public.documents
    where id = any (p_document_ids) and user_id = v_uid;
  select coalesce(array_agg(c.id), '{}') into v_clauses
    from public.document_clauses c join public.documents d on d.id = c.document_id
    where c.id = any (p_relevant_clause_ids) and d.user_id = v_uid;

  insert into public.cases (
    client_id, client_name, lawyer_id, title, category, status, priority, urgency,
    request_description, request_message, client_story_ar, client_story_en,
    summary_ar, summary_en, relevant_clause_ids, document_ids,
    key_dates_ar, key_dates_en, questions_ar, questions_en,
    suggested_specialty, match_score
  ) values (
    v_uid, v_profile.full_name, p_lawyer_id, btrim(p_title), p_category, 'requested',
    case p_urgency when 'urgent' then 'urgent' when 'high' then 'high' when 'low' then 'low' else 'medium' end,
    p_urgency, btrim(p_description), nullif(btrim(coalesce(p_message, '')), ''),
    btrim(p_description), btrim(p_description),
    left(coalesce(p_summary_ar, ''), 4000), left(coalesce(p_summary_en, ''), 4000),
    v_clauses, v_docs,
    coalesce(p_key_dates_ar, '{}'), coalesce(p_key_dates_en, '{}'),
    coalesce(p_questions_ar, '{}'), coalesce(p_questions_en, '{}'),
    p_category, p_match_score
  ) returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function cases_after_insert() returns trigger as $$
declare
  v_lawyer_profile uuid;
begin
  select profile_id into v_lawyer_profile from public.lawyers where id = new.lawyer_id;
  if new.is_manual then
    perform public._case_event(new.id, v_lawyer_profile, 'lawyer', 'manual_created', '{}'::jsonb);
    return new;
  end if;
  perform public._case_event(new.id, new.client_id, 'client', 'request_submitted',
    jsonb_build_object('urgency', new.urgency, 'category', new.category));
  perform public._notify(v_lawyer_profile, 'case_request', 'طلب قضية جديد', 'New case request',
    'طلب جديد من ' || new.client_name || ': ' || new.title,
    'New request from ' || new.client_name || ': ' || new.title,
    '/lawyer/cases/' || new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists cases_notify_lawyer on cases;
drop trigger if exists cases_after_insert on cases;
create trigger cases_after_insert after insert on cases
  for each row execute function cases_after_insert();

create or replace function cases_before_update() returns trigger as $$
begin
  if new.status = 'resolved' and old.status <> 'resolved' then new.resolved_at := now(); end if;
  if new.status = 'closed' and old.status <> 'closed' then new.closed_at := now(); end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cases_before_update on cases;
create trigger cases_before_update before update on cases
  for each row execute function cases_before_update();

create or replace function cases_after_status_change() returns trigger as $$
declare
  v_actor uuid := auth.uid();
  v_lawyer_profile uuid;
  v_role text;
  v_label_ar text;
  v_label_en text;
begin
  select profile_id into v_lawyer_profile from public.lawyers where id = new.lawyer_id;
  v_role := case
    when v_actor is null then 'system'
    when new.client_id is not null and v_actor = new.client_id then 'client'
    when v_actor = v_lawyer_profile then 'lawyer'
    else 'system' end;

  if new.status = 'accepted' then
    perform public._case_event(new.id, v_actor, v_role, 'accepted', jsonb_build_object('from', old.status));
    perform public._notify(new.client_id, 'case_accepted', 'تم قبول طلبك', 'Your request was accepted',
      'تم قبول طلبك من قبل المحامي.', 'Your request was accepted by the lawyer.', '/citizen/cases/' || new.id);
  elsif new.status = 'rejected' then
    perform public._case_event(new.id, v_actor, v_role, 'rejected',
      jsonb_build_object('reason_code', new.rejection_reason, 'note', new.rejection_note));
    perform public._notify(new.client_id, 'case_rejected', 'تم رفض طلبك', 'Your request was declined',
      'للأسف تم رفض طلبك من قبل المحامي.', 'Unfortunately your request was declined by the lawyer.', '/citizen/cases/' || new.id);
  else
    perform public._case_event(new.id, v_actor, v_role, 'status_changed',
      jsonb_build_object('from', old.status, 'to', new.status));
    v_label_ar := case new.status
      when 'active' then 'قيد المتابعة' when 'waiting_for_client' then 'بانتظار ردّك'
      when 'waiting_for_lawyer' then 'بانتظار المحامي' when 'resolved' then 'تم الحل' when 'closed' then 'مغلقة'
      else new.status end;
    v_label_en := case new.status
      when 'active' then 'In progress' when 'waiting_for_client' then 'Waiting for you'
      when 'waiting_for_lawyer' then 'Waiting for the lawyer' when 'resolved' then 'Resolved' when 'closed' then 'Closed'
      else new.status end;
    if v_role = 'client' then
      perform public._notify(v_lawyer_profile, 'case_status', 'تغيّرت حالة القضية', 'Case status changed',
        new.title || ' — ' || v_label_ar, new.title || ' — ' || v_label_en, '/lawyer/cases/' || new.id);
    else
      perform public._notify(new.client_id, 'case_status', 'تغيّرت حالة قضيتك', 'Your case status changed',
        new.title || ' — ' || v_label_ar, new.title || ' — ' || v_label_en, '/citizen/cases/' || new.id);
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists cases_after_status_change on cases;
create trigger cases_after_status_change after update of status on cases
  for each row when (old.status is distinct from new.status)
  execute function cases_after_status_change();

create or replace function respond_case(
  p_case_id uuid, p_accept boolean, p_reason_code text default null, p_reason_note text default null
) returns void as $$
declare
  c public.cases%rowtype;
  v_lawyer uuid := public.current_approved_lawyer_id();
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if v_lawyer is null then raise exception 'forbidden'; end if;
  select * into c from public.cases where id = p_case_id for update;
  if not found or c.lawyer_id is distinct from v_lawyer then raise exception 'forbidden'; end if;
  if c.status <> 'requested' then raise exception 'invalid_transition'; end if;

  if p_accept then
    update public.cases
      set status = 'accepted', accepted_at = now(), accepted_by = auth.uid()
      where id = p_case_id;
  else
    if p_reason_code is null or p_reason_code not in ('out_of_scope','no_capacity','conflict_of_interest','other') then
      raise exception 'rejection_reason_required';
    end if;
    update public.cases
      set status = 'rejected', rejected_at = now(), rejection_reason = p_reason_code,
          rejection_note = nullif(left(btrim(coalesce(p_reason_note, '')), 1000), '')
      where id = p_case_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function transition_case(p_case_id uuid, p_to text) returns void as $$
declare
  c public.cases%rowtype;
  v_role text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into c from public.cases where id = p_case_id for update;
  if not found then raise exception 'case_not_found'; end if;
  v_role := case
    when c.lawyer_id is not null and c.lawyer_id = public.current_lawyer_id() then 'lawyer'
    when c.client_id is not null and c.client_id = auth.uid() then 'client'
    else null end;
  if v_role is null then raise exception 'forbidden'; end if;
  if not public._allowed_transition(v_role, c.status, p_to) then raise exception 'invalid_transition'; end if;
  update public.cases set status = p_to where id = p_case_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function mark_case_viewed(p_case_id uuid) returns void as $$
declare
  c public.cases%rowtype;
begin
  select * into c from public.cases where id = p_case_id for update;
  if not found or c.lawyer_id is distinct from public.current_lawyer_id() then return; end if;
  if c.viewed_by_lawyer_at is null then
    update public.cases set viewed_by_lawyer_at = now() where id = p_case_id;
    perform public._case_event(p_case_id, auth.uid(), 'lawyer', 'viewed', '{}'::jsonb);
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- A lawyer adding a case they took outside the platform (AI data-entry tool).
create or replace function lawyer_create_manual_case(
  p_title text, p_client_name text, p_category text, p_summary_ar text, p_summary_en text,
  p_story text, p_opposing_party text, p_key_dates text[], p_deadline date
) returns uuid as $$
declare
  v_lawyer uuid := public.current_approved_lawyer_id();
  v_id uuid;
begin
  if v_lawyer is null then raise exception 'forbidden'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 3 and 200 then raise exception 'invalid_title'; end if;
  insert into public.cases (
    client_id, client_name, lawyer_id, title, category, status, is_manual,
    summary_ar, summary_en, client_story_ar, client_story_en, opposing_party,
    key_dates_ar, key_dates_en, suggested_specialty, deadline, accepted_at, accepted_by
  ) values (
    null, left(coalesce(nullif(btrim(p_client_name), ''), '—'), 200), v_lawyer, btrim(p_title),
    case when p_category = any (array['rental','employment','commercial','family','criminal','real_estate','corporate','civil']) then p_category else 'civil' end,
    'active', true,
    left(coalesce(p_summary_ar, ''), 4000), left(coalesce(p_summary_en, ''), 4000),
    left(coalesce(p_story, ''), 5000), left(coalesce(p_story, ''), 5000),
    nullif(left(coalesce(p_opposing_party, ''), 200), ''),
    coalesce(p_key_dates, '{}'), coalesce(p_key_dates, '{}'),
    'civil', p_deadline, now(), auth.uid()
  ) returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

-- =====================================================================
-- 10. APPOINTMENTS, REVIEWS, NOTIFICATIONS
-- =====================================================================
drop policy if exists "appointments_participant_read" on appointments;
drop policy if exists "appointments_participant_write" on appointments;
drop policy if exists "appointments_read" on appointments;
drop policy if exists "appointments_insert" on appointments;
drop policy if exists "appointments_update" on appointments;
drop policy if exists "appointments_delete" on appointments;
create policy "appointments_read" on appointments for select
  using (client_id = auth.uid() or lawyer_id = current_lawyer_id());
create policy "appointments_insert" on appointments for insert with check (
  (lawyer_id = current_lawyer_id())
  or (
    client_id = auth.uid() and status = 'pending'
    and (case_id is null or is_case_participant(case_id))
    -- lawyers_public already limits to approved, non-demo, active lawyers and
    -- (unlike the private lawyers table) is readable by the acting citizen.
    and exists (
      select 1 from lawyers_public lp
      where lp.id = lawyer_id and lp.accepting_new_cases
    )
  )
);
create policy "appointments_update" on appointments for update
  using (lawyer_id = current_lawyer_id() or client_id = auth.uid())
  with check (lawyer_id = current_lawyer_id() or (client_id = auth.uid() and status in ('pending', 'cancelled')));
create policy "appointments_delete" on appointments for delete
  using (lawyer_id = current_lawyer_id() or (client_id = auth.uid() and status = 'pending'));
revoke truncate on appointments from anon, authenticated;
revoke all on appointments from anon;

create or replace function notify_appointment_participants() returns trigger as $$
declare
  v_lawyer_profile uuid;
begin
  select profile_id into v_lawyer_profile from public.lawyers where id = new.lawyer_id;
  if auth.uid() = new.client_id and v_lawyer_profile is not null and v_lawyer_profile <> new.client_id then
    perform public._notify(v_lawyer_profile, 'appointment', 'موعد جديد', 'New appointment request',
      new.client_name || ' طلب موعداً: ' || new.title, new.client_name || ' requested an appointment: ' || new.title, '/lawyer/calendar');
  elsif auth.uid() = v_lawyer_profile and new.client_id <> v_lawyer_profile then
    perform public._notify(new.client_id, 'appointment', 'تم تحديد موعدك', 'Your appointment is scheduled',
      'تم تحديد موعد: ' || new.title, 'An appointment was scheduled: ' || new.title, '/citizen/appointments');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists appointments_notify on appointments;
create trigger appointments_notify after insert on appointments
  for each row execute function notify_appointment_participants();

-- Reviews: only a client whose case with that lawyer is resolved/closed, once.
drop policy if exists "reviews_self_insert" on reviews;
create policy "reviews_self_insert" on reviews for insert with check (
  client_id = auth.uid()
  and is_demo = false
  and exists (
    select 1 from cases c
    where c.client_id = auth.uid() and c.lawyer_id = reviews.lawyer_id and c.status in ('resolved', 'closed')
  )
);
create unique index if not exists reviews_one_per_client_lawyer on reviews (lawyer_id, client_id) where client_id is not null;
revoke update, delete, truncate on reviews from anon, authenticated;
revoke insert on reviews from anon;

-- Notifications: created only server-side; the owner can read, mark read, delete.
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.notifications'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%analysis_ready%'
  loop
    execute format('alter table public.notifications drop constraint %I', r.conname);
  end loop;
end $$;
alter table notifications add constraint notifications_type_check check (type in (
  'analysis_ready','case_update','lawyer_response','appointment','message','review_reminder','system',
  'case_request','case_accepted','case_rejected','case_status','document','verification'));

drop policy if exists "notifications_owner_all" on notifications;
drop policy if exists "notifications_select" on notifications;
drop policy if exists "notifications_update" on notifications;
drop policy if exists "notifications_delete" on notifications;
create policy "notifications_select" on notifications for select using (user_id = auth.uid());
create policy "notifications_update" on notifications for update using (user_id = auth.uid());
create policy "notifications_delete" on notifications for delete using (user_id = auth.uid());
revoke insert, update, delete, truncate on notifications from anon, authenticated;
revoke all on notifications from anon;
grant update (read) on notifications to authenticated;
grant delete on notifications to authenticated;

create or replace function analyses_after_insert() returns trigger as $$
declare
  v_name text;
begin
  select file_name into v_name from public.documents where id = new.document_id;
  perform public._notify(new.user_id, 'analysis_ready', 'تحليل العقد جاهز', 'Contract analysis ready',
    'انتهينا من تحليل "' || coalesce(v_name, '') || '"', 'We finished analyzing "' || coalesce(v_name, '') || '"',
    '/citizen/analyze/' || new.document_id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists analyses_after_insert on analyses;
create trigger analyses_after_insert after insert on analyses
  for each row execute function analyses_after_insert();

-- =====================================================================
-- 11. PRIVATE CONTENT: lawyers see a client's data only for their own
--     accepted cases; admins get no blanket read on private content.
-- =====================================================================
drop policy if exists "documents_admin_read" on documents;
drop policy if exists "documents_case_lawyer_read" on documents;
create policy "documents_case_lawyer_read" on documents for select using (
  exists (
    select 1 from cases c
    where c.lawyer_id = current_lawyer_id() and c.status <> 'rejected'
      and documents.id = any (c.document_ids)
  )
);

drop policy if exists "clauses_owner_or_case_lawyer_read" on document_clauses;
create policy "clauses_owner_or_case_lawyer_read" on document_clauses for select using (
  exists (select 1 from documents d where d.id = document_id and d.user_id = auth.uid())
  or exists (
    select 1 from cases c
    where c.lawyer_id = current_lawyer_id() and c.status <> 'rejected'
      and document_clauses.document_id = any (c.document_ids)
  )
);

drop policy if exists "analyses_case_lawyer_read" on analyses;
drop policy if exists "analyses_admin_read" on analyses;
create policy "analyses_case_lawyer_read" on analyses for select using (
  exists (
    select 1 from cases c
    where c.lawyer_id = current_lawyer_id() and c.status <> 'rejected'
      and analyses.document_id = any (c.document_ids)
  )
);

drop policy if exists "profiles_case_lawyer_read" on profiles;
create policy "profiles_case_lawyer_read" on profiles for select using (
  exists (
    select 1 from cases c
    where c.lawyer_id = current_lawyer_id() and c.client_id = profiles.id
      and c.status not in ('requested', 'rejected')
  )
);

-- =====================================================================
-- 12. ADMIN: metadata-only oversight + audited RPCs
-- =====================================================================
drop view if exists admin_cases_overview;
create view admin_cases_overview as
  select
    c.id, c.title, c.category, c.status, c.priority, c.urgency, c.client_name,
    l.full_name as lawyer_name, c.is_manual, c.created_at, c.updated_at
  from cases c
  left join lawyers l on l.id = c.lawyer_id
  where is_admin();
grant select on admin_cases_overview to authenticated;

create or replace function admin_review_lawyer(p_lawyer_id uuid, p_decision text, p_note text default null)
returns void as $$
declare
  l public.lawyers%rowtype;
  v_status text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_decision not in ('approve', 'reject', 'request_info') then raise exception 'invalid_decision'; end if;
  select * into l from public.lawyers where id = p_lawyer_id;
  if not found then raise exception 'not_found'; end if;
  v_status := case p_decision when 'approve' then 'approved' when 'reject' then 'rejected' else 'more_info_requested' end;

  update public.lawyers set
    verification_status = v_status,
    verification_admin_note = nullif(left(btrim(coalesce(p_note, '')), 2000), ''),
    verified_at = case when v_status = 'approved' then now() else null end,
    verified_by = case when v_status = 'approved' then auth.uid() else null end
  where id = p_lawyer_id;

  perform public._notify(l.profile_id, 'verification',
    case v_status when 'approved' then 'تمت الموافقة على حسابك' when 'rejected' then 'تم رفض طلب التوثيق' else 'مطلوب معلومات إضافية' end,
    case v_status when 'approved' then 'Your lawyer account was approved' when 'rejected' then 'Your verification request was rejected' else 'More information requested' end,
    coalesce(nullif(btrim(coalesce(p_note, '')), ''), case v_status when 'approved' then 'يمكنك الآن استقبال طلبات القضايا.' else 'راجع صفحة التوثيق لمزيد من التفاصيل.' end),
    coalesce(nullif(btrim(coalesce(p_note, '')), ''), case v_status when 'approved' then 'You can now receive case requests.' else 'See the verification page for details.' end),
    '/lawyer/verification');
end;
$$ language plpgsql security definer set search_path = public;

create or replace function lawyer_update_verification_info(p_info text) returns void as $$
declare
  l public.lawyers%rowtype;
begin
  select * into l from public.lawyers where profile_id = auth.uid();
  if not found or l.verification_status = 'approved' then raise exception 'forbidden'; end if;
  update public.lawyers set
    verification_info = left(coalesce(p_info, ''), 2000),
    verification_status = case when l.verification_status in ('rejected', 'more_info_requested') then 'pending' else l.verification_status end
  where id = l.id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function admin_set_account_status(p_user uuid, p_status text) returns void as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('active', 'disabled') then raise exception 'invalid_status'; end if;
  if p_user = auth.uid() then raise exception 'cannot_change_self'; end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then raise exception 'cannot_change_admin'; end if;
  update public.profiles set account_status = p_status where id = p_user;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function admin_resolve_report(p_id uuid, p_status text, p_note text default null) returns void as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('reviewing', 'resolved', 'dismissed') then raise exception 'invalid_status'; end if;
  update public.reports set
    status = p_status,
    admin_note = nullif(left(btrim(coalesce(p_note, '')), 2000), ''),
    resolved_by = case when p_status in ('resolved', 'dismissed') then auth.uid() else null end,
    resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end
  where id = p_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function admin_platform_stats() returns jsonb as $$
declare
  v jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'citizens', (select count(*) from public.profiles where role = 'citizen'),
    'lawyers_approved', (select count(*) from public.lawyers where verification_status = 'approved' and not is_demo),
    'lawyers_pending', (select count(*) from public.lawyers where verification_status in ('pending', 'more_info_requested')),
    'documents', (select count(*) from public.documents),
    'analyses', (select count(*) from public.analyses),
    'appointments', (select count(*) from public.appointments),
    'open_reports', (select count(*) from public.reports where status in ('open', 'reviewing')),
    'cases_by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.cases group by status) s), '{}'::jsonb),
    'cases_by_category', coalesce((select jsonb_object_agg(category, n) from (select category, count(*) n from public.cases group by category) s), '{}'::jsonb),
    'weekly', coalesce((
      select jsonb_agg(jsonb_build_object(
        'week', to_char(w, 'MM-DD'),
        'analyses', (select count(*) from public.analyses a where a.created_at >= w and a.created_at < w + interval '7 days'),
        'requests', (select count(*) from public.cases c where c.requested_at >= w and c.requested_at < w + interval '7 days')
      ) order by w)
      from generate_series(date_trunc('week', now()) - interval '5 weeks', date_trunc('week', now()), interval '1 week') w
    ), '[]'::jsonb)
  ) into v;
  return v;
end;
$$ language plpgsql security definer stable set search_path = public;

-- =====================================================================
-- 13. EXECUTE PERMISSIONS: RPCs are for signed-in users only.
-- =====================================================================
do $$
declare
  f text;
begin
  foreach f in array array[
    'request_case(uuid,text,text,text,text,uuid[],uuid[],text,text,text,text[],text[],text[],text[],int)',
    'respond_case(uuid,boolean,text,text)',
    'transition_case(uuid,text)',
    'mark_case_viewed(uuid)',
    'mark_messages_read(uuid)',
    'lawyer_create_manual_case(text,text,text,text,text,text,text,text[],date)',
    'lawyer_update_verification_info(text)',
    'admin_review_lawyer(uuid,text,text)',
    'admin_set_account_status(uuid,text)',
    'admin_resolve_report(uuid,text,text)',
    'admin_platform_stats()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

commit;
