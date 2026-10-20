-- OWNER-RUN ONLY after project/role confirmation. Prepared, NOT executed.
-- Catalog-only screening; never calls application functions or returns row data.
-- Missing objects produce missing rows/false flags, not guessed compatibility.
begin transaction isolation level repeatable read read only;
set local search_path = pg_catalog, public, pg_temp;
set local lock_timeout = '3s';
set local statement_timeout = '15s';

select current_database() as database_name, current_user as operator_role,
  current_setting('server_version') as server_version,
  current_setting('transaction_read_only') as must_be_on;
-- Project ref must also be checked in dashboard/secure connection settings.
select rolname, rolsuper, rolbypassrls, rolcanlogin, rolinherit
from pg_roles where rolname in (current_user,'anon','authenticated','service_role');
select member.rolname as member_role, parent.rolname as inherited_role, m.admin_option
from pg_auth_members m join pg_roles member on member.oid=m.member
join pg_roles parent on parent.oid=m.roleid
where member.rolname in (current_user,'anon','authenticated','service_role');
select n.nspname, pg_get_userbyid(n.nspowner) as owner, n.nspacl,
  r.rolname, has_schema_privilege(r.oid,n.oid,'USAGE') as can_use,
  has_schema_privilege(r.oid,n.oid,'CREATE') as can_create
from pg_namespace n cross join pg_roles r
where n.nspname in ('public','auth','storage') and r.rolname in ('anon','authenticated',current_user);

with required(schema_name, object_name) as (values
 ('public','profiles'),('public','lawyers'),('public','documents'),('public','document_clauses'),
 ('public','analyses'),('public','cases'),('public','case_events'),('public','case_documents'),
 ('public','case_notes'),('public','messages'),('public','notifications'),('public','case_submission_keys'),
 ('public','lawyers_public'),('public','saved_lawyers'),('public','ai_history'),
 ('storage','buckets'),('storage','objects'),('auth','users'),('auth','identities'),
 ('supabase_migrations','schema_migrations')
)
select r.*, c.oid is not null as present, c.oid, c.relkind,
 pg_get_userbyid(c.relowner) as owner, c.relrowsecurity, c.relforcerowsecurity,
 c.relacl, c.reltuples as estimated_rows, c.reloptions
from required r left join pg_namespace n on n.nspname=r.schema_name
left join pg_class c on c.relnamespace=n.oid and c.relname=r.object_name
order by r.schema_name,r.object_name;

select n.nspname,c.relname,a.attname,format_type(a.atttypid,a.atttypmod) as type,
 a.attnotnull,pg_get_expr(d.adbin,d.adrelid) as default_expression,a.attacl
from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
where a.attnum>0 and not a.attisdropped and
 ((n.nspname='public' and c.relname in ('profiles','lawyers','documents','document_clauses','analyses','cases','case_events','case_documents','notifications','case_submission_keys'))
 or (n.nspname='storage' and c.relname in ('objects','buckets'))
 or (n.nspname='supabase_migrations' and c.relname='schema_migrations'))
order by n.nspname,c.relname,a.attnum;

-- Canonical type OIDs avoid the earlier unqualified regprocedure discrepancy.
with required(name,arg_types,body_hash) as (values
 ('request_case',array['uuid','text','text','text','text','uuid[]','uuid[]','text','text','text','text[]','text[]','text[]','text[]','int4'],'99bf22c2fb651dbc852dd81c1a57da2f'),
 ('cases_after_insert',array[]::text[],'5b68586057ddb621885976fc3efd3b68'),
 ('_case_event',array['uuid','uuid','text','text','jsonb'],'a5c3b8e71470a1f75362aad93e5daf14'),
 ('_notify',array['uuid','text','text','text','text','text','text'],'87e47b48ce6283aee0671c7ff4b88b4a'),
 ('account_is_active',array[]::text[],null),('request_case_once',array['uuid','jsonb'],null),
 ('finalize_document_analysis',array['uuid','jsonb','jsonb'],null),
 ('can_read_document',array['uuid'],null),('citizen_document_storage_access',array['text','bool'],null)
)
select r.name,p.oid,p.pronargs,p.pronargdefaults,p.proargnames,p.proargmodes,
 (select count(*) from pg_proc where pronamespace=to_regnamespace('public') and proname=r.name) as overload_count,
 array(select actual from unnest(p.proargtypes) as t(actual)) =
 array(select to_regtype('pg_catalog.'||t)::oid from unnest(r.arg_types) with ordinality a(t,i) order by i) as exact_argument_oids,
 pg_get_function_identity_arguments(p.oid) as identity_arguments,pg_get_function_result(p.oid) as result_type,
 pg_get_userbyid(p.proowner) as owner,p.prosecdef,p.proconfig,p.provolatile,p.proacl,
 md5(replace(p.prosrc,E'\r\n',E'\n')) as body_md5,
 case when r.body_hash is not null then md5(replace(p.prosrc,E'\r\n',E'\n'))=r.body_hash end as matches_004_body
from required r left join pg_proc p on p.pronamespace=to_regnamespace('public') and p.proname=r.name
order by r.name,p.oid;
-- Other existing helpers/triggers must be reviewed, not overwritten by name.
select p.oid::regprocedure as function,pg_get_userbyid(p.proowner) as owner,l.lanname,p.prosecdef,p.proconfig,p.proacl,
 md5(replace(p.prosrc,E'\r\n',E'\n')) as body_md5
from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
where (n.nspname='public' and p.proname in ('current_lawyer_id','current_approved_lawyer_id','is_admin','is_case_participant',
 'analyses_after_insert','guard_analysis_document_owner','reject_inactive_actor','guard_requested_lawyer','handle_new_user'))
 or (n.nspname='auth' and p.proname='uid') or (n.nspname='storage' and p.proname='foldername');

select n.nspname,c.relname,k.conname,k.contype,k.convalidated,pg_get_constraintdef(k.oid) as definition
from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('profiles','lawyers','documents','document_clauses','analyses','cases','case_events','notifications','case_submission_keys')
order by c.relname,k.conname;
select n.nspname,c.relname,i.relname as index_name,x.indisunique,x.indisvalid,pg_get_indexdef(x.indexrelid) as definition
from pg_index x join pg_class c on c.oid=x.indrelid join pg_class i on i.oid=x.indexrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('documents','document_clauses','analyses','cases','case_submission_keys');
select n.nspname,c.relname,t.tgname,t.tgenabled,t.tgtype,t.tgfoid::regprocedure as function,
 pg_get_triggerdef(t.oid) as definition,md5(replace(p.prosrc,E'\r\n',E'\n')) as trigger_body_md5
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
where not t.tgisinternal and ((n.nspname='public' and c.relname in ('documents','document_clauses','analyses','cases','case_events','notifications','profiles','lawyers','messages','case_documents'))
 or (n.nspname='auth' and c.relname='users'));
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where (schemaname='public' and tablename in ('profiles','lawyers','documents','document_clauses','analyses','cases','case_events','case_documents','messages','notifications','case_submission_keys'))
 or (schemaname='storage' and tablename in ('objects','buckets')) order by schemaname,tablename,policyname;

-- Effective API privileges include inherited/PUBLIC rights; policies are separate.
select r.rolname,n.nspname,c.relname,
 has_table_privilege(r.oid,c.oid,'SELECT') as can_select,
 has_any_column_privilege(r.oid,c.oid,'INSERT') as any_insert,
 has_any_column_privilege(r.oid,c.oid,'UPDATE') as any_update,
 has_table_privilege(r.oid,c.oid,'DELETE') as can_delete
from pg_roles r cross join pg_class c join pg_namespace n on n.oid=c.relnamespace
where r.rolname in ('anon','authenticated','service_role') and c.relkind in ('r','p','v')
 and ((n.nspname='public' and c.relname in ('documents','document_clauses','analyses','lawyers','lawyers_public','cases','case_submission_keys'))
 or (n.nspname='storage' and c.relname in ('objects','buckets')));
select r.rolname,c.relname,a.attname,has_column_privilege(r.oid,c.oid,a.attnum,'SELECT') as can_read,
 has_column_privilege(r.oid,c.oid,a.attnum,'UPDATE') as can_update
from pg_roles r cross join pg_class c join pg_namespace n on n.oid=c.relnamespace
join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
where r.rolname in ('anon','authenticated') and n.nspname='public'
 and ((c.relname='lawyers' and a.attname in ('id','profile_id','is_demo','consultation_price','verification_status','verified_at','verified_by'))
 or (c.relname='documents' and a.attname in ('id','user_id','original_storage_path','original_mime_type','original_size_bytes')));
select p.oid::regprocedure as function,r.rolname,has_function_privilege(r.oid,p.oid,'EXECUTE') as can_execute
from pg_proc p cross join pg_roles r where p.pronamespace=to_regnamespace('public')
 and p.proname in ('account_is_active','request_case','request_case_once','finalize_document_analysis','can_read_document','citizen_document_storage_access','_notify','_case_event')
 and r.rolname in ('anon','authenticated','service_role');
select d.defaclrole::regrole as owner,d.defaclnamespace::regnamespace as schema,d.defaclobjtype,d.defaclacl from pg_default_acl d;
select schemaname,viewname,viewowner,md5(definition) as definition_md5 from pg_views
where schemaname='public' and viewname in ('lawyers_public','admin_cases_overview','admin_case_events_overview');
-- Heuristic only: dynamic/external callers also require owner review.
select p.oid::regprocedure as possible_legacy_caller,pg_get_userbyid(p.proowner) as owner,p.prosecdef
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname not in ('pg_catalog','information_schema')
 and regexp_replace(p.prosrc,'[[:space:]]','','g') ilike '%request_case(%';
select d.classid::regclass as dependent_catalog,d.objid,d.deptype,p.oid::regprocedure as referenced_function
from pg_depend d join pg_proc p on p.oid=d.refobjid
where d.refclassid='pg_proc'::regclass and p.pronamespace=to_regnamespace('public')
 and p.proname in ('request_case','account_is_active','current_lawyer_id','current_approved_lawyer_id','can_read_document');
rollback;
