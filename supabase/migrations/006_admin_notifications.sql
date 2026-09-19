-- ============================================================================
-- Migration 006 — notify admins about work waiting for them:
--   * a lawyer applies for verification (or re-submits after being asked for more info)
--   * a user files a report
-- Notifications are still created only server-side (SECURITY DEFINER triggers).
-- Apply after 005. Safe to re-run.
-- ============================================================================
begin;

create or replace function lawyers_notify_admins() returns trigger as $$
declare
  a record;
begin
  if new.verification_status <> 'pending' then return new; end if;
  if tg_op = 'UPDATE' and old.verification_status = 'pending' then return new; end if;
  for a in select id from public.profiles where role = 'admin' and account_status = 'active' loop
    perform public._notify(
      a.id, 'verification',
      'طلب توثيق محامٍ بانتظار المراجعة', 'A lawyer is waiting for verification',
      coalesce(new.full_name, ''), coalesce(new.full_name, ''),
      '/admin/verification'
    );
  end loop;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists lawyers_notify_admins_ins on lawyers;
drop trigger if exists lawyers_notify_admins_upd on lawyers;
create trigger lawyers_notify_admins_ins after insert on lawyers
  for each row execute function lawyers_notify_admins();
create trigger lawyers_notify_admins_upd after update of verification_status on lawyers
  for each row execute function lawyers_notify_admins();

create or replace function reports_notify_admins() returns trigger as $$
declare
  a record;
begin
  for a in select id from public.profiles where role = 'admin' and account_status = 'active' loop
    perform public._notify(
      a.id, 'system',
      'بلاغ جديد', 'New report',
      left(new.reason, 120), left(new.reason, 120),
      '/admin/reports'
    );
  end loop;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists reports_notify_admins on reports;
create trigger reports_notify_admins after insert on reports
  for each row execute function reports_notify_admins();

revoke all on function lawyers_notify_admins() from public, anon, authenticated;
revoke all on function reports_notify_admins() from public, anon, authenticated;

commit;
