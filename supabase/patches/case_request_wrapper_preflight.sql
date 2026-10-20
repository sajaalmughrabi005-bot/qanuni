-- READ ONLY: catalog metadata, no RPC execution or private row contents.
-- Run in the intended project's SQL editor as its trusted DDL owner.
begin read only;
select pg_catalog.current_database() as database_name, current_user as ddl_role,
  pg_catalog.current_setting('server_version') as postgres_version,
  pg_catalog.current_setting('search_path') as original_search_path,
  pg_catalog.to_regprocedure('public.request_case(uuid,text,text,text,text,uuid[],uuid[],text,text,text,text[],text[],text[],text[],integer)')::pg_catalog.oid as supplied_lookup_before_fixed_path;
-- A same-named type plus pg_catalog placed later can affect unqualified input
-- types in the historical string. Report possible shadows, without assuming one.
select n.nspname as possible_type_shadow_schema,t.typname,t.oid,t.typtype
from pg_catalog.pg_type t join pg_catalog.pg_namespace n on n.oid=t.typnamespace
where n.nspname<>'pg_catalog' and t.typname in ('uuid','text','int4','integer');
set local search_path = pg_catalog, public, pg_temp;
with required(function_name, argument_types, expected_body_md5) as (values
  ('request_case', array['uuid','text','text','text','text','uuid[]','uuid[]','text','text','text','text[]','text[]','text[]','text[]','int4'], '99bf22c2fb651dbc852dd81c1a57da2f'),
  ('cases_after_insert', array[]::text[], '5b68586057ddb621885976fc3efd3b68'),
  ('_case_event', array['uuid','uuid','text','text','jsonb'], 'a5c3b8e71470a1f75362aad93e5daf14'),
  ('_notify', array['uuid','text','text','text','text','text','text'], '87e47b48ce6283aee0671c7ff4b88b4a')
), expected as (
  select r.*, array(select to_regtype('pg_catalog.' || t)::oid
    from unnest(r.argument_types) with ordinality as a(t,i) order by i) as expected_oids,
    'public.' || r.function_name || '(' || array_to_string(array(
      select 'pg_catalog.' || t from unnest(r.argument_types) with ordinality as a(t,i) order by i), ',') || ')' as qualified_signature
  from required r
)
select r.function_name, p.oid as catalog_oid, p.pronargs as argument_count, p.pronargdefaults as default_count,
  (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname=r.function_name) as overload_count_must_be_one,
  oidvectortypes(p.proargtypes) as catalog_argument_types,
  array(select actual from unnest(p.proargtypes) as types(actual)) = r.expected_oids as exact_argument_oids,
  r.qualified_signature, to_regprocedure(r.qualified_signature)::oid as qualified_lookup_oid,
  to_regprocedure(r.qualified_signature)::oid = p.oid as lookup_matches_catalog,
  pg_get_userbyid(p.proowner) as owner, p.prosecdef, p.proconfig, pg_get_function_result(p.oid) as result_type,
  md5(replace(p.prosrc,E'\r\n',E'\n')) = r.expected_body_md5 as body_matches,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute, p.proacl as acl_snapshot,
  coalesce((select jsonb_agg(jsonb_build_object('position',i,'expected',r.argument_types[i],
    'expected_oid',r.expected_oids[i],'actual_oid',p.proargtypes[i-1]))
    from generate_series(1,greatest(cardinality(r.argument_types),p.pronargs)) as a(i)
    where r.expected_oids[i] is distinct from p.proargtypes[i-1]),'[]'::jsonb) as type_differences
from expected r left join pg_proc p on p.pronamespace='public'::regnamespace and p.proname=r.function_name;
-- This exact checked-in earlier string resolves against canonical 004 locally.
-- Compare the owner's originally failing string in THIS SAME session as well.
select to_regprocedure('public.request_case(uuid,text,text,text,text,uuid[],uuid[],text,text,text,text[],text[],text[],text[],integer)')::oid as earlier_checked_in_lookup_oid;
select c.relname, c.relkind, pg_get_userbyid(c.relowner) as owner, c.relrowsecurity, c.relforcerowsecurity,
  (select count(*) from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) as column_count
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  and c.relname in ('profiles','lawyers','documents','document_clauses','cases','case_events','notifications');
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_userbyid(p.proowner) as owner, p.proconfig, p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('account_is_active','request_case_once');
select to_regclass('public.case_submission_keys') as ledger_must_be_absent,
  has_schema_privilege('authenticated','public','CREATE') as authenticated_create_must_be_false,
  has_schema_privilege('anon','public','CREATE') as anon_create_must_be_false,
  has_any_column_privilege('authenticated','public.cases','INSERT') as authenticated_insert_must_be_false,
  has_any_column_privilege('anon','public.cases','INSERT') as anon_insert_must_be_false;
select tgname,tgenabled,tgtype,tgfoid::regprocedure as function,pg_get_triggerdef(oid) as definition
from pg_trigger where not tgisinternal
  and tgrelid in (to_regclass('public.cases'),to_regclass('public.case_events'),to_regclass('public.notifications'));
-- Review callers/dependencies before withdrawing the legacy EXECUTE grant.
-- String-body calls may have no pg_depend entry; this is an additional heuristic,
-- not a complete dependency search or a reason to log function bodies.
select p.oid::regprocedure as possible_legacy_caller,pg_get_userbyid(p.proowner) as owner,p.prosecdef
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not in ('pg_catalog','information_schema')
  and regexp_replace(p.prosrc,'[[:space:]]','','g') ilike '%request_case(%';
select d.classid::regclass as dependent_catalog,d.objid,d.deptype
from pg_depend d join pg_proc p on p.oid=d.refobjid
where d.refclassid='pg_proc'::regclass and p.pronamespace='public'::regnamespace and p.proname='request_case';
commit;
