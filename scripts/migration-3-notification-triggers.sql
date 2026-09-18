-- QANUNI — migration 3: cross-user notification triggers + lawyer document read.
-- Notifications are owner-only (RLS: user_id = auth.uid()), so a citizen
-- creating a case can't insert a notification row for the lawyer directly
-- from the client. These triggers do it server-side instead, the same way
-- migration-2's recompute_lawyer_rating() does for review ratings.
-- Run this once in the Supabase SQL editor.

-- documents had no lawyer-read policy (only owner + admin), so a lawyer's
-- "client file" page couldn't see the citizen's documents attached to a
-- case. Mirrors the existing document_clauses lawyer-read policy.
create policy "documents_case_lawyer_read" on documents for select using (
  exists (
    select 1 from cases c
    where c.lawyer_id = current_lawyer_id()
      and id = any(c.document_ids)
  )
);

-- profiles had no lawyer-read policy at all, so a lawyer couldn't see a
-- client's name/phone/email on their own case/client-file pages.
create policy "profiles_case_lawyer_read" on profiles for select using (
  exists (
    select 1 from cases c
    where c.lawyer_id = current_lawyer_id() and c.client_id = profiles.id
  )
);

create or replace function notify_case_lawyer() returns trigger as $$
declare
  v_profile_id uuid;
begin
  if new.lawyer_id is null then
    return new;
  end if;
  select profile_id into v_profile_id from lawyers where id = new.lawyer_id;
  if v_profile_id is not null then
    insert into notifications (user_id, type, title_ar, title_en, body_ar, body_en, href)
    values (
      v_profile_id,
      'case_update',
      'قضية جديدة بانتظارك',
      'A new case is waiting',
      'وصلتك قضية جديدة: ' || new.title,
      'A new case arrived: ' || new.title,
      '/lawyer/cases'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists cases_notify_lawyer on cases;
create trigger cases_notify_lawyer after insert on cases
  for each row execute function notify_case_lawyer();

create or replace function notify_appointment_participants() returns trigger as $$
declare
  v_lawyer_profile_id uuid;
begin
  select profile_id into v_lawyer_profile_id from lawyers where id = new.lawyer_id;

  if auth.uid() = new.client_id and v_lawyer_profile_id is not null then
    insert into notifications (user_id, type, title_ar, title_en, body_ar, body_en, href)
    values (
      v_lawyer_profile_id,
      'appointment',
      'موعد جديد',
      'New appointment request',
      new.client_name || ' طلب موعداً: ' || new.title,
      new.client_name || ' requested an appointment: ' || new.title,
      '/lawyer/calendar'
    );
  elsif auth.uid() = v_lawyer_profile_id then
    insert into notifications (user_id, type, title_ar, title_en, body_ar, body_en, href)
    values (
      new.client_id,
      'appointment',
      'تم تحديد موعدك',
      'Your appointment is scheduled',
      'تم تحديد موعد: ' || new.title,
      'An appointment was scheduled: ' || new.title,
      '/citizen/appointments'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists appointments_notify on appointments;
create trigger appointments_notify after insert on appointments
  for each row execute function notify_appointment_participants();

create or replace function notify_message_recipient() returns trigger as $$
declare
  v_client_id uuid;
  v_lawyer_profile_id uuid;
  v_recipient uuid;
begin
  select client_id, (select profile_id from lawyers where id = c.lawyer_id)
    into v_client_id, v_lawyer_profile_id
  from cases c where c.id = new.case_id;

  v_recipient := case when new.sender_id = v_client_id then v_lawyer_profile_id else v_client_id end;

  if v_recipient is not null then
    insert into notifications (user_id, type, title_ar, title_en, body_ar, body_en, href)
    values (
      v_recipient,
      'message',
      'رسالة جديدة',
      'New message',
      new.sender_name || ': ' || left(new.message, 80),
      new.sender_name || ': ' || left(new.message, 80),
      case when new.sender_id = v_client_id then '/lawyer/messages' else '/citizen/cases/' || new.case_id end
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists messages_notify on messages;
create trigger messages_notify after insert on messages
  for each row execute function notify_message_recipient();
