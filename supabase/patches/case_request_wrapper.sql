-- Owner-review artifact ONLY. Do not include in an automatic migration push.
-- One-time installation over the exact migration-004 case request workflow.
-- Existing bodies/tables/policies/triggers/Storage are unchanged. The legacy
-- creator's non-owner EXECUTE grants are revoked to prevent wrapper bypass.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
set local search_path = pg_catalog, public, pg_temp;

do $preflight$
declare
  prerequisite record;
  existing record;
  base_owner oid;
  request_oid oid;
begin
  if current_user in ('anon', 'authenticated', 'service_role') then
    raise exception 'repair_preflight: use the trusted migration-004 function owner';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated' and not rolsuper and not rolbypassrls)
     or not exists (select 1 from pg_roles where rolname = 'anon' and not rolsuper and not rolbypassrls) then
    raise exception 'repair_preflight: incompatible API roles';
  end if;
  if has_schema_privilege('authenticated', 'public', 'CREATE')
     or has_schema_privilege('anon', 'public', 'CREATE') then
    raise exception 'repair_preflight: public schema must not be API-writable';
  end if;
  if not has_schema_privilege(current_user, 'public', 'CREATE')
     or not has_schema_privilege('authenticated', 'public', 'USAGE')
     or to_regprocedure('auth.uid()') is null then
    raise exception 'repair_preflight: missing schema privilege or auth.uid';
  end if;
  if (select prorettype from pg_proc where oid = 'auth.uid()'::regprocedure) <> 'uuid'::regtype
     or not has_function_privilege(current_user, 'auth.uid()', 'EXECUTE') then
    raise exception 'repair_preflight: incompatible auth.uid';
  end if;

  -- Reject every existing overload/relation, including a view with this name.
  -- Never overwrite an existing installation or adopt an unknown ledger.
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname in ('account_is_active', 'request_case_once'))
     or exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relname = 'case_submission_keys') then
    raise exception 'repair_preflight: repair objects already exist; review instead of overwriting';
  end if;

  -- Body fingerprints from 004, UTF-8, CRLF normalized to LF. Even formatting
  -- differences require owner review; these are compatibility guards, not proof
  -- that the complete production database is secure.
  -- Resolve the exact identity using pg_catalog argument TYPE OIDs, not a
  -- hand-entered regprocedure string. Reject overloads instead of guessing.
  for prerequisite in select * from (values
    ('request_case', array['uuid','text','text','text','text','uuid[]','uuid[]','text','text','text','text[]','text[]','text[]','text[]','int4'], 'uuid', '99bf22c2fb651dbc852dd81c1a57da2f'),
    ('cases_after_insert', array[]::text[], 'trigger', '5b68586057ddb621885976fc3efd3b68'),
    ('_case_event', array['uuid','uuid','text','text','jsonb'], 'void', 'a5c3b8e71470a1f75362aad93e5daf14'),
    ('_notify', array['uuid','text','text','text','text','text','text'], 'void', '87e47b48ce6283aee0671c7ff4b88b4a')
  ) as required(function_name, argument_types, result_type, body_hash) loop
    if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
        and proname = prerequisite.function_name) > 1 then
      raise exception 'repair_preflight: unexpected overloads for public.%', prerequisite.function_name;
    end if;
    select p.*, l.lanname into existing from pg_proc p join pg_language l on l.oid = p.prolang
      where p.pronamespace = 'public'::regnamespace and p.proname = prerequisite.function_name
        and array(select actual from unnest(p.proargtypes) as types(actual)) =
          array(select to_regtype('pg_catalog.' || t)::oid
            from unnest(prerequisite.argument_types) with ordinality as args(t, ordinal) order by ordinal);
    if not found then
      raise exception 'repair_preflight: missing prerequisite public.% with exact argument OIDs', prerequisite.function_name;
    end if;
    if existing.prokind <> 'f' or existing.lanname <> 'plpgsql' or not existing.prosecdef
       or existing.proretset or existing.prorettype <> to_regtype(prerequisite.result_type)
       or existing.proconfig is distinct from array['search_path=public']::text[]
       or md5(replace(existing.prosrc, E'\r\n', E'\n')) <> prerequisite.body_hash
       or existing.proowner <> (select oid from pg_roles where rolname = current_user) then
      raise exception 'repair_preflight: incompatible definition/owner for public.%', prerequisite.function_name;
    end if;
    base_owner := existing.proowner;
    if prerequisite.function_name = 'request_case' then request_oid := existing.oid; end if;
  end loop;
  if not has_function_privilege('authenticated', request_oid, 'EXECUTE')
     or has_function_privilege('anon', request_oid, 'EXECUTE') then
    raise exception 'repair_preflight: incompatible request_case API grants';
  end if;
  if has_function_privilege('authenticated', 'public._case_event(uuid,uuid,text,text,jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public._case_event(uuid,uuid,text,text,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public._notify(uuid,text,text,text,text,text,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public._notify(uuid,text,text,text,text,text,text)', 'EXECUTE') then
    raise exception 'repair_preflight: incompatible internal writer API grants';
  end if;
  if not exists (select 1 from pg_proc
    where oid = request_oid
      and pronargdefaults = 11 and proargmodes is null and provolatile = 'v'
      and proargnames = array['p_lawyer_id','p_title','p_category','p_description','p_urgency','p_document_ids',
        'p_relevant_clause_ids','p_message','p_summary_ar','p_summary_en','p_key_dates_ar','p_key_dates_en',
        'p_questions_ar','p_questions_en','p_match_score']::text[]) then
    raise exception 'repair_preflight: incompatible request_case argument definition';
  end if;

  for prerequisite in select * from (values
    ('profiles'), ('lawyers'), ('documents'), ('document_clauses'),
    ('cases'), ('case_events'), ('notifications')
  ) as required(table_name) loop
    select c.* into existing from pg_class c where c.oid = to_regclass('public.' || prerequisite.table_name);
    if not found then
      raise exception 'repair_preflight: missing table %', prerequisite.table_name;
    end if;
    if existing.relkind <> 'r' or not existing.relrowsecurity or existing.relowner <> base_owner
       or existing.relforcerowsecurity then
      raise exception 'repair_preflight: incompatible table ownership/RLS for %', prerequisite.table_name;
    end if;
  end loop;
  if has_any_column_privilege('authenticated', 'public.cases', 'INSERT')
     or has_any_column_privilege('anon', 'public.cases', 'INSERT') then
    raise exception 'repair_preflight: direct API case insertion must remain forbidden';
  end if;
  -- Columns needed even for a submission with no document. The unchanged 004
  -- function always executes the document/clause queries and notification trigger.
  for prerequisite in select * from (values
    ('profiles','id','uuid'), ('profiles','role','text'), ('profiles','account_status','text'), ('profiles','full_name','text'),
    ('lawyers','id','uuid'), ('lawyers','profile_id','uuid'), ('lawyers','verification_status','text'),
    ('lawyers','is_demo','boolean'), ('lawyers','accepting_new_cases','boolean'),
    ('documents','id','uuid'), ('documents','user_id','uuid'),
    ('document_clauses','id','uuid'), ('document_clauses','document_id','uuid'),
    ('cases','id','uuid'), ('cases','client_id','uuid'), ('cases','client_name','text'), ('cases','lawyer_id','uuid'),
    ('cases','title','text'), ('cases','category','text'), ('cases','status','text'), ('cases','priority','text'),
    ('cases','urgency','text'), ('cases','request_description','text'), ('cases','request_message','text'),
    ('cases','client_story_ar','text'), ('cases','client_story_en','text'), ('cases','summary_ar','text'), ('cases','summary_en','text'),
    ('cases','relevant_clause_ids','uuid[]'), ('cases','document_ids','uuid[]'), ('cases','key_dates_ar','text[]'),
    ('cases','key_dates_en','text[]'), ('cases','questions_ar','text[]'), ('cases','questions_en','text[]'),
    ('cases','suggested_specialty','text'), ('cases','match_score','integer'), ('cases','is_manual','boolean'),
    ('case_events','case_id','uuid'), ('case_events','actor_id','uuid'), ('case_events','actor_role','text'),
    ('case_events','event_type','text'), ('case_events','metadata','jsonb'),
    ('notifications','user_id','uuid'), ('notifications','type','text'), ('notifications','title_ar','text'),
    ('notifications','title_en','text'), ('notifications','body_ar','text'), ('notifications','body_en','text'), ('notifications','href','text')
  ) as required(table_name, column_name, column_type) loop
    if not exists (select 1 from pg_attribute where attrelid = to_regclass('public.' || prerequisite.table_name)
                   and attname = prerequisite.column_name and atttypid = to_regtype(prerequisite.column_type)
                   and attnum > 0 and not attisdropped) then
      raise exception 'repair_preflight: incompatible column %.%', prerequisite.table_name, prerequisite.column_name;
    end if;
  end loop;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.cases'::regclass
                 and tgname = 'cases_after_insert' and tgfoid = 'public.cases_after_insert()'::regprocedure
                 and tgtype = 5 and tgenabled = 'O' and not tgisinternal and tgqual is null)
     or exists (select 1 from pg_trigger where tgrelid in ('public.cases'::regclass, 'public.case_events'::regclass, 'public.notifications'::regclass)
                and not tgisinternal and (tgtype & 4) <> 0
                and not (tgrelid = 'public.cases'::regclass and tgname = 'cases_after_insert'))
     or exists (select 1 from pg_rewrite where ev_class in ('public.cases'::regclass, 'public.case_events'::regclass, 'public.notifications'::regclass)) then
    raise exception 'repair_preflight: incompatible insert trigger/rule chain';
  end if;
end;
$preflight$;

create function public.account_is_active() returns boolean
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select exists (select 1 from public.profiles where id = auth.uid() and account_status = 'active');
$$;

create table public.case_submission_keys (
  user_id uuid not null references public.profiles(id) on delete cascade,
  key uuid not null,
  request_hash text not null,
  case_id uuid not null references public.cases(id) on delete cascade,
  primary key (user_id, key)
);
alter table public.case_submission_keys enable row level security;
-- No policies: the ledger is accessible only to its trusted owner, through RPC.

create function public.request_case_once(p_key uuid, p_request jsonb) returns uuid
language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_hash text;
begin
  -- Recheck citizen authorization on cached retries too (004 checks fresh calls).
  if v_uid is null or p_key is null or not public.account_is_active()
     or not exists (select 1 from public.profiles where id = v_uid and role = 'citizen') then
    raise exception 'not_allowed';
  end if;
  if p_request is null or jsonb_typeof(p_request) <> 'object' then
    raise exception 'invalid_request';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || p_key::text, 0));
  -- Recheck after waiting for the key, and hold eligibility stable until commit.
  perform 1 from public.profiles where id = v_uid and role = 'citizen' and account_status = 'active' for share;
  if not found then raise exception 'not_allowed'; end if;
  select case_id, request_hash into v_id, v_hash from public.case_submission_keys
    where user_id = v_uid and key = p_key;
  if v_id is not null then
    if v_hash <> md5(p_request::text) then raise exception 'submission_changed'; end if;
    return v_id;
  end if;
  -- A fresh case requires an active lawyer profile. Lock both rows so an admin
  -- disable/role/verification/availability change cannot interleave the check
  -- and insert. Existing completed retries above create no new legal request.
  perform 1 from public.lawyers l join public.profiles p on p.id = l.profile_id
    where l.id = (p_request->>'lawyerId')::uuid and p.role = 'lawyer' and p.account_status = 'active'
    for share of l, p;
  if not found then raise exception 'lawyer_unavailable'; end if;
  -- Same fifteen arguments, normalization/defaults and ownership filtering as
  -- 007; every new case still goes through the UNCHANGED 004 request_case.
  v_id := public.request_case(
    (p_request->>'lawyerId')::uuid, p_request->>'title', p_request->>'category', p_request->>'description',
    coalesce(p_request->>'urgency', 'medium'),
    array(select jsonb_array_elements_text(coalesce(p_request->'documentIds', '[]'))::uuid),
    array(select jsonb_array_elements_text(coalesce(p_request->'relevantClauseIds', '[]'))::uuid),
    p_request->>'message', coalesce(p_request->>'summaryAr', ''), coalesce(p_request->>'summaryEn', ''),
    array(select jsonb_array_elements_text(coalesce(p_request->'keyDatesAr', '[]'))),
    array(select jsonb_array_elements_text(coalesce(p_request->'keyDatesEn', '[]'))),
    array(select jsonb_array_elements_text(coalesce(p_request->'questionsAr', '[]'))),
    array(select jsonb_array_elements_text(coalesce(p_request->'questionsEn', '[]'))),
    (p_request->>'matchScore')::integer
  );
  insert into public.case_submission_keys (user_id, key, request_hash, case_id)
    values (v_uid, p_key, md5(p_request::text), v_id);
  return v_id;
end;
$$;

-- Clear ALL non-owner initial ACLs, including Supabase default grants and
-- custom default grantees. Also make the unchanged legacy creator owner-only:
-- direct API calls must not bypass active-target checks or idempotency.
-- No global default privileges or other pre-existing ACLs are changed.
do $acl$
declare
  privilege record;
begin
  for privilege in
    select distinct p.oid::regprocedure::text as object_name, a.grantee, 'FUNCTION'::text as object_kind
    from pg_proc p cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('account_is_active', 'request_case_once', 'request_case')
      and a.grantee <> p.proowner
    union
    select distinct 'public.case_submission_keys', a.grantee, 'TABLE'
    from pg_class c cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
    where c.oid = 'public.case_submission_keys'::regclass and a.grantee <> c.relowner
  loop
    execute format('revoke all privileges on %s %s from %s', privilege.object_kind, privilege.object_name,
      case when privilege.grantee = 0 then 'PUBLIC' else quote_ident(pg_get_userbyid(privilege.grantee)) end);
  end loop;
end;
$acl$;
do $verify_legacy_acl$
declare legacy_oid oid;
begin
  select oid into legacy_oid from pg_proc where pronamespace = 'public'::regnamespace and proname = 'request_case';
  if has_function_privilege('authenticated', legacy_oid, 'EXECUTE')
     or has_function_privilege('anon', legacy_oid, 'EXECUTE') then
    raise exception 'repair_preflight: inherited legacy API privilege remains; review role membership';
  end if;
end;
$verify_legacy_acl$;
grant execute on function public.request_case_once(uuid, jsonb) to authenticated;
-- Delivered only after commit; refreshes PostgREST discovery, no new SQL object.
notify pgrst, 'reload schema';
commit;
