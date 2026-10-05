-- ============================================================================
-- Migration 005 — per-user saved lawyers + AI conversation history.
--
-- Both used to live only in the browser (localStorage / component state), so
-- they were tied to the device instead of the signed-in account. They now
-- belong to a real user id and are protected by row-level security: a user can
-- only ever read/write their own rows.
--
-- Apply after 004. Safe to re-run.
-- ============================================================================
begin;

-- ---------------------------------------------------------------- saved lawyers
create table if not exists saved_lawyers (
  user_id uuid not null references profiles(id) on delete cascade,
  lawyer_id uuid not null references lawyers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, lawyer_id)
);
alter table saved_lawyers enable row level security;

revoke all on saved_lawyers from anon;
revoke update, truncate on saved_lawyers from authenticated;

drop policy if exists saved_lawyers_select on saved_lawyers;
drop policy if exists saved_lawyers_insert on saved_lawyers;
drop policy if exists saved_lawyers_delete on saved_lawyers;
create policy saved_lawyers_select on saved_lawyers for select using (user_id = auth.uid());
-- Only publicly visible (approved, active) lawyers can be bookmarked.
create policy saved_lawyers_insert on saved_lawyers for insert
  with check (user_id = auth.uid() and exists (select 1 from lawyers_public lp where lp.id = lawyer_id));
create policy saved_lawyers_delete on saved_lawyers for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------- AI history
create table if not exists ai_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('ask', 'scenario')),
  document_id uuid references documents(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 4000),
  answer jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_history_user_idx on ai_history (user_id, created_at desc);
alter table ai_history enable row level security;

revoke all on ai_history from anon;
revoke update, truncate on ai_history from authenticated;

drop policy if exists ai_history_select on ai_history;
drop policy if exists ai_history_insert on ai_history;
drop policy if exists ai_history_delete on ai_history;
create policy ai_history_select on ai_history for select using (user_id = auth.uid());
-- The referenced document (if any) must belong to the same user.
create policy ai_history_insert on ai_history for insert
  with check (
    user_id = auth.uid()
    and (document_id is null or exists (select 1 from documents d where d.id = document_id and d.user_id = auth.uid()))
  );
create policy ai_history_delete on ai_history for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------- account deletion
-- messages.sender_id had no ON DELETE rule, so deleting the account of anyone who
-- had ever sent a message failed ("Database error deleting user"). A deleted
-- account's own messages are deleted with it.
alter table messages drop constraint if exists messages_sender_id_fkey;
alter table messages add constraint messages_sender_id_fkey
  foreign key (sender_id) references profiles(id) on delete cascade;

commit;
