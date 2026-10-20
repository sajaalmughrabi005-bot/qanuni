-- HAQ OWNER-RUN PREFLIGHT: ONE RESULT ROW / ONE JSON CELL / READ ONLY.
-- Prepared locally, NOT executed or database-parser validated. NOT install approval.
-- Confirm project ref in dashboard/secure connection BEFORE running; database name
-- alone does not identify a Supabase project. Use trusted postgres visibility.
-- Requires the eight owner-confirmed public tables and standard storage tables.
-- JSON projections avoid referencing missing optional columns. Metadata/aggregate
-- output only; no account IDs, case text, file paths, tokens or file bytes returned.
-- Catalog policy expressions are restricted operator evidence, not a public post.
-- 15s TOTAL statement budget can time out on large data; STOP and review, do not
-- blindly increase timeouts. Failure yields no usable partial approval.
-- SQL-only diagnostics cannot prove backups, byte recovery, external callers or
-- real Storage/API/browser behavior. Always NO-GO pending those gates.
begin transaction isolation level repeatable read read only;
set local search_path = pg_catalog, public, pg_temp;
set local lock_timeout = '3s';
set local statement_timeout = '15s';
with profiles_data as (select to_jsonb(r)->>'id' as id,to_jsonb(r)->>'role' as role,to_jsonb(r)->>'account_status' as account_status from public.profiles r),
lawyers_data as (select to_jsonb(r)->>'id' as id,to_jsonb(r)->>'profile_id' as profile_id,to_jsonb(r)->>'verification_status' as verification_status,to_jsonb(r)->>'is_demo' as is_demo,to_jsonb(r)->>'consultation_price' as consultation_price from public.lawyers r),
documents_data as (select to_jsonb(r)->>'id' as id,to_jsonb(r)->>'user_id' as user_id,to_jsonb(r)->>'status' as status from public.documents r),
document_clauses_data as (select to_jsonb(r)->>'id' as id,to_jsonb(r)->>'document_id' as document_id,to_jsonb(r)->>'risk_level' as risk_level,to_jsonb(r)->>'confidence' as confidence from public.document_clauses r),
analyses_data as (select to_jsonb(r)->>'id' as id,to_jsonb(r)->>'document_id' as document_id,to_jsonb(r)->>'user_id' as user_id,to_jsonb(r)->>'overall_risk' as overall_risk from public.analyses r),
cases_data as (select to_jsonb(r)->>'id' as id,to_jsonb(r)->>'status' as status from public.cases r),
catalog_pin as (with catalog_items(kind,object_key,value) as (
 select 'relation',n.nspname||'.'||c.relname,jsonb_build_array(c.relkind,c.relowner,c.relrowsecurity,c.relforcerowsecurity,c.relacl,c.reloptions)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where (n.nspname='public' and c.relname in ('profiles','lawyers','documents','document_clauses','analyses','cases','case_events','notifications','case_submission_keys')) or (n.nspname='storage' and c.relname in ('objects','buckets'))
 union all
 select 'column',n.nspname||'.'||c.relname||'.'||a.attname,jsonb_build_array(a.atttypid,a.atttypmod,a.attnotnull,a.attidentity,a.attgenerated,a.attacl,pg_get_expr(d.adbin,d.adrelid))
 from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
 where a.attnum>0 and not a.attisdropped and ((n.nspname='public' and c.relname in ('profiles','lawyers','documents','document_clauses','analyses','cases','case_events','notifications','case_submission_keys')) or (n.nspname='storage' and c.relname in ('objects','buckets')))
 union all
 select 'constraint',n.nspname||'.'||c.relname||'.'||k.conname,jsonb_build_array(k.contype,k.convalidated,pg_get_constraintdef(k.oid))
 from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage')
 union all
 select 'index',n.nspname||'.'||c.relname,jsonb_build_array(i.indisvalid,i.indisready,pg_get_indexdef(c.oid)) from pg_index i join pg_class c on c.oid=i.indexrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage')
 union all
 select 'function',p.oid::regprocedure::text,jsonb_build_array(p.proowner,p.prolang,p.prokind,p.prosecdef,p.proleakproof,p.provolatile,p.proconfig,p.proacl,p.proargtypes::text,p.proargnames,p.proargmodes,p.prorettype,p.proretset,p.pronargdefaults,pg_get_expr(p.proargdefaults,0),md5(replace(p.prosrc,E'\r\n',E'\n')))
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','auth','storage')
 union all
 select 'trigger',n.nspname||'.'||c.relname||'.'||t.tgname,jsonb_build_array(t.tgenabled,pg_get_triggerdef(t.oid)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','auth','storage')
 union all
 select 'policy',schemaname||'.'||tablename||'.'||policyname,to_jsonb(p) from pg_policies p where schemaname in ('public','storage')
 union all
 select 'rule',n.nspname||'.'||c.relname||'.'||r.rulename,to_jsonb(pg_get_ruledef(r.oid)) from pg_rewrite r join pg_class c on c.oid=r.ev_class join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage')
 union all
 select 'schema',nspname,jsonb_build_array(nspowner,nspacl) from pg_namespace where nspname in ('public','auth','storage')
 union all
 select 'role',rolname,jsonb_build_array(oid,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls) from pg_roles
 union all
 select 'membership',roleid::text||':'||member::text,to_jsonb(m) from pg_auth_members m
 union all
 select 'default_acl',defaclrole::text||':'||defaclnamespace::text||':'||defaclobjtype::text,to_jsonb(d) from pg_default_acl d
)
select md5(coalesce(jsonb_agg(jsonb_build_array(kind,object_key,value) order by kind,object_key,value::text)::text,'[]')) from catalog_items),
s1 as (
select current_database() as database_name, current_user as operator_role,
  current_setting('server_version') as server_version,
  current_setting('transaction_read_only') as must_be_on
),
s2 as (
select rolname, rolsuper, rolbypassrls, rolcanlogin, rolinherit
from pg_roles where rolname in (current_user,'anon','authenticated','service_role')
),
s3 as (
select member.rolname as member_role, parent.rolname as inherited_role, m.admin_option
from pg_auth_members m join pg_roles member on member.oid=m.member
join pg_roles parent on parent.oid=m.roleid
where member.rolname in (current_user,'anon','authenticated','service_role')
),
s4 as (
select n.nspname, pg_get_userbyid(n.nspowner) as owner, n.nspacl,
  r.rolname, has_schema_privilege(r.oid,n.oid,'USAGE') as can_use,
  has_schema_privilege(r.oid,n.oid,'CREATE') as can_create
from pg_namespace n cross join pg_roles r
where n.nspname in ('public','auth','storage') and r.rolname in ('anon','authenticated',current_user)
),
s5 as (
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
order by r.schema_name,r.object_name
),
s6 as (
select n.nspname,c.relname,a.attname,format_type(a.atttypid,a.atttypmod) as type,
 a.attnotnull,pg_get_expr(d.adbin,d.adrelid) as default_expression,a.attacl
from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
where a.attnum>0 and not a.attisdropped and
 ((n.nspname='public' and c.relname in ('profiles','lawyers','documents','document_clauses','analyses','cases','case_events','case_documents','notifications','case_submission_keys'))
 or (n.nspname='storage' and c.relname in ('objects','buckets'))
 or (n.nspname='supabase_migrations' and c.relname='schema_migrations'))
order by n.nspname,c.relname,a.attnum
),
s7 as (
with required(name,arg_types,body_hash) as (values
 ('request_case',array['uuid','text','text','text','text','uuid[]','uuid[]','text','text','text','text[]','text[]','text[]','text[]','int4'],'99bf22c2fb651dbc852dd81c1a57da2f'),
 ('cases_after_insert',array[]::text[],'5b68586057ddb621885976fc3efd3b68'),
 ('_case_event',array['uuid','uuid','text','text','jsonb'],'a5c3b8e71470a1f75362aad93e5daf14'),
 ('_notify',array['uuid','text','text','text','text','text','text'],'87e47b48ce6283aee0671c7ff4b88b4a'),
 ('account_is_active',array[]::text[],null),('request_case_once',array['uuid','jsonb'],null),
 ('finalize_document_analysis',array['uuid','jsonb','jsonb'],null),
 ('can_read_document',array['uuid'],null),('citizen_document_storage_access',array['text','bool'],null)
)
select r.name,p.oid,p.pronargs,p.pronargdefaults,p.proargnames,p.proargmodes,p.prokind,p.proretset,
 (select lanname from pg_language where oid=p.prolang) as language,
 (select count(*) from pg_proc where pronamespace=to_regnamespace('public') and proname=r.name) as overload_count,
 array(select actual from unnest(p.proargtypes) as t(actual)) =
 array(select to_regtype('pg_catalog.'||t)::oid from unnest(r.arg_types) with ordinality a(t,i) order by i) as exact_argument_oids,
 pg_get_function_identity_arguments(p.oid) as identity_arguments,pg_get_function_result(p.oid) as result_type,
 pg_get_userbyid(p.proowner) as owner,p.prosecdef,p.proconfig,p.provolatile,p.proacl,
 md5(replace(p.prosrc,E'\r\n',E'\n')) as body_md5,
 case when r.body_hash is not null then md5(replace(p.prosrc,E'\r\n',E'\n'))=r.body_hash end as matches_004_body
from required r left join pg_proc p on p.pronamespace=to_regnamespace('public') and p.proname=r.name
order by r.name,p.oid
),
s8 as (
select p.oid::regprocedure as function,pg_get_userbyid(p.proowner) as owner,l.lanname,p.prokind,p.prorettype::regtype as result_type,p.proretset,p.prosecdef,p.proconfig,p.proacl,
 has_function_privilege(current_user,p.oid,'EXECUTE') as operator_can_execute,
 md5(replace(p.prosrc,E'\r\n',E'\n')) as body_md5
from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
where (n.nspname='public' and p.proname in ('current_lawyer_id','current_approved_lawyer_id','is_admin','is_case_participant',
 'analyses_after_insert','guard_analysis_document_owner','reject_inactive_actor','guard_requested_lawyer','handle_new_user'))
 or (n.nspname='auth' and p.proname='uid') or (n.nspname='storage' and p.proname='foldername')
),
s9 as (
select n.nspname,c.relname,k.conname,k.contype,k.convalidated,pg_get_constraintdef(k.oid) as definition
from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('profiles','lawyers','documents','document_clauses','analyses','cases','case_events','notifications','case_submission_keys')
order by c.relname,k.conname
),
s10 as (
select n.nspname,c.relname,i.relname as index_name,x.indisunique,x.indisvalid,pg_get_indexdef(x.indexrelid) as definition
from pg_index x join pg_class c on c.oid=x.indrelid join pg_class i on i.oid=x.indexrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('documents','document_clauses','analyses','cases','case_submission_keys')
),
s11 as (
select n.nspname,c.relname,t.tgname,t.tgenabled,t.tgtype,t.tgfoid::regprocedure as function,
 pg_get_triggerdef(t.oid) as definition,md5(replace(p.prosrc,E'\r\n',E'\n')) as trigger_body_md5
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
where not t.tgisinternal and ((n.nspname='public' and c.relname in ('documents','document_clauses','analyses','cases','case_events','notifications','profiles','lawyers','messages','case_documents'))
 or (n.nspname='auth' and c.relname='users'))
),
s12 as (
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where (schemaname='public' and tablename in ('profiles','lawyers','documents','document_clauses','analyses','cases','case_events','case_documents','messages','notifications','case_submission_keys'))
 or (schemaname='storage' and tablename in ('objects','buckets')) order by schemaname,tablename,policyname
),
s13 as (
select r.rolname,n.nspname,c.relname,
 has_table_privilege(r.oid,c.oid,'SELECT') as can_select,
 has_any_column_privilege(r.oid,c.oid,'INSERT') as any_insert,
 has_any_column_privilege(r.oid,c.oid,'UPDATE') as any_update,
 has_table_privilege(r.oid,c.oid,'DELETE') as can_delete
from pg_roles r cross join pg_class c join pg_namespace n on n.oid=c.relnamespace
where r.rolname in ('anon','authenticated','service_role') and c.relkind in ('r','p','v')
 and ((n.nspname='public' and c.relname in ('documents','document_clauses','analyses','lawyers','lawyers_public','cases','case_submission_keys'))
 or (n.nspname='storage' and c.relname in ('objects','buckets')))
),
s14 as (
select r.rolname,c.relname,a.attname,has_column_privilege(r.oid,c.oid,a.attnum,'SELECT') as can_read,
 has_column_privilege(r.oid,c.oid,a.attnum,'UPDATE') as can_update,
 has_column_privilege(r.oid,c.oid,a.attnum,'INSERT') as can_insert
from pg_roles r cross join pg_class c join pg_namespace n on n.oid=c.relnamespace
join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
where r.rolname in ('anon','authenticated') and n.nspname='public'
 and ((c.relname='lawyers' and a.attname in ('id','profile_id','is_demo','consultation_price','verification_status','verified_at','verified_by'))
 or (c.relname='documents' and a.attname in ('id','user_id','original_storage_path','original_mime_type','original_size_bytes')))
),
s15 as (
select p.oid::regprocedure as function,r.rolname,has_function_privilege(r.oid,p.oid,'EXECUTE') as can_execute
from pg_proc p cross join pg_roles r where p.pronamespace=to_regnamespace('public')
 and p.proname in ('account_is_active','request_case','request_case_once','finalize_document_analysis','can_read_document','citizen_document_storage_access','_notify','_case_event')
 and r.rolname in ('anon','authenticated','service_role')
),
s16 as (
select d.defaclrole::regrole as owner,d.defaclnamespace::regnamespace as schema,d.defaclobjtype,d.defaclacl from pg_default_acl d
),
s17 as (
select schemaname,viewname,viewowner,md5(definition) as definition_md5 from pg_views
where schemaname='public' and viewname in ('lawyers_public','admin_cases_overview','admin_case_events_overview')
),
s18 as (
select p.oid::regprocedure as possible_legacy_caller,pg_get_userbyid(p.proowner) as owner,p.prosecdef
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname not in ('pg_catalog','information_schema')
 and regexp_replace(p.prosrc,'[[:space:]]','','g') ilike '%request_case(%'
),
s19 as (
select d.classid::regclass as dependent_catalog,d.objid,d.deptype,p.oid::regprocedure as referenced_function
from pg_depend d join pg_proc p on p.oid=d.refobjid
where d.refclassid='pg_proc'::regclass and p.pronamespace=to_regnamespace('public')
 and p.proname in ('request_case','account_is_active','current_lawyer_id','current_approved_lawyer_id','can_read_document')
),
s20 as (
with recursive reach(root,role_oid) as (
 select r.rolname,r.oid from pg_roles r where r.rolname in ('anon','authenticated','service_role',current_user)
 union select reach.root,m.roleid from reach join pg_auth_members m on m.member=reach.role_oid
) select reach.root,r.rolname as reachable_role,r.rolsuper,r.rolbypassrls,r.rolcreaterole,r.rolinherit from reach join pg_roles r on r.oid=reach.role_oid order by reach.root,r.rolname
),
s21 as (
select n.nspname,t.typname,t.oid,t.typtype,t.typbasetype from pg_type t join pg_namespace n on n.oid=t.typnamespace where t.typname in ('uuid','text','int4','integer','jsonb','bool','_uuid','_text') order by t.typname,n.nspname
),
s22 as (
select n.nspname,c.relname,r.rulename,pg_get_ruledef(r.oid) as definition from pg_rewrite r join pg_class c on c.oid=r.ev_class join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage') and c.relname in ('documents','document_clauses','analyses','cases','case_events','notifications','objects','buckets')
),
s23 as (
select r.rolname,c.oid is not null as ledger_present,has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as any_table_right,has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') as any_column_right from pg_roles r left join pg_class c on c.oid=to_regclass('public.case_submission_keys') where r.rolname in ('anon','authenticated','service_role')
),
s24 as (
select c.relname,pg_get_userbyid(c.relowner) as owner,c.relrowsecurity,c.relforcerowsecurity,has_table_privilege(current_user,c.oid,'SELECT') as operator_can_read,pg_has_role(current_user,c.relowner,'USAGE') as operator_has_owner_privileges from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='storage' and c.relname in ('objects','buckets','migrations')
),
s25 as (
select id,name,public,file_size_limit,allowed_mime_types from storage.buckets
where id in ('citizen-documents','case-documents')
),
s26 as (
select bucket_id,count(*) as metadata_rows from storage.objects
where bucket_id in ('citizen-documents','case-documents') group by bucket_id
),
s27 as (
select 'profiles' as relation,count(*) as rows from profiles_data
union all select 'lawyers',count(*) from lawyers_data
union all select 'documents',count(*) from documents_data
union all select 'document_clauses',count(*) from document_clauses_data
union all select 'analyses',count(*) from analyses_data
union all select 'cases',count(*) from cases_data
union all select 'case_events',count(*) from public.case_events
union all select 'notifications',count(*) from public.notifications
),
s28 as (
select role,account_status,count(*) as rows from profiles_data group by role,account_status
),
s29 as (
select verification_status,is_demo,count(*) as rows from lawyers_data group by verification_status,is_demo
),
s30 as (
select status,count(*) as rows from documents_data group by status
),
s31 as (
select status,count(*) as rows from cases_data group by status
),
s32 as (
select risk_level,count(*) as rows from document_clauses_data group by risk_level
),
s33 as (
select overall_risk,count(*) as rows from analyses_data group by overall_risk
),
s34 as (
select count(*) as null_confidence from document_clauses_data where confidence is null
),
s35 as (
select count(*) as invalid_fee_rows from lawyers_data where case when consultation_price ~ '^-?[0-9]+([.][0-9]+)?$' then consultation_price::numeric<0 or consultation_price::numeric>10000 or consultation_price::numeric<>round(consultation_price::numeric,2) else true end
),
s36 as (
select count(*) as analysis_parent_mismatches from analyses_data a
left join documents_data d on d.id=a.document_id
where d.id is null or a.user_id is distinct from d.user_id
),
s37 as (
select count(*) as clause_parent_missing from document_clauses_data c
left join documents_data d on d.id=c.document_id where d.id is null
),
s38 as (
select count(*) as duplicate_analysis_document_groups from
 (select document_id from analyses_data group by document_id having count(*)>1) duplicates
),
s39 as (
select count(*) as unfinished_documents_with_existing_results from documents_data d
where d.status<>'analyzed' and
 (exists(select 1 from analyses_data a where a.document_id=d.id)
 or exists(select 1 from document_clauses_data c where c.document_id=d.id))
),
s40 as (
select count(*) as analyzed_without_analysis from documents_data d
where d.status='analyzed' and not exists(select 1 from analyses_data a where a.document_id=d.id)
),
s41 as (
select count(*) filter(where j?'original_storage_path') as rows_with_path_column_visible,count(*) filter(where j->>'original_storage_path' is not null) as paths_present,count(*) filter(where j->>'original_storage_path' is not null and (j->>'original_mime_type' is null or j->>'original_size_bytes' is null)) as partial_metadata_rows from (select to_jsonb(d) j from public.documents d) x
),
s42 as (
select extname,extversion,n.nspname as installed_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace order by extname
),
s43 as (
select p.oid::regprocedure as signature,pg_get_userbyid(p.proowner) as owner,p.prosecdef,p.proconfig,p.proacl,p.prorettype::regtype as result_type,md5(replace(p.prosrc,E'\r\n',E'\n')) as body_md5 from pg_proc p where p.pronamespace=to_regnamespace('public') and p.proname in ('reject_inactive_actor','guard_analysis_document_owner','finalize_document_analysis','can_read_document','citizen_document_storage_access') order by p.proname,p.oid
),
s44 as (
select r.rolname,c.relname,a.attname,has_column_privilege(r.oid,c.oid,a.attnum,'SELECT') as can_select,has_column_privilege(r.oid,c.oid,a.attnum,'INSERT') as can_insert,has_column_privilege(r.oid,c.oid,a.attnum,'UPDATE') as can_update from pg_roles r cross join pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped where r.rolname in ('anon','authenticated') and n.nspname='public' and ((c.relname='document_clauses' and a.attname in ('source_text','source_start','source_end','legal_reference_id','confidence')) or (c.relname='documents' and a.attname in ('original_storage_path','original_mime_type','original_size_bytes'))) order by r.rolname,c.relname,a.attname
),
s45 as (
select c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) as definition,pg_get_userbyid(p.proowner) as function_owner,p.prosecdef,p.proconfig,p.proacl,md5(replace(p.prosrc,E'\r\n',E'\n')) as body_md5 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where n.nspname='storage' and c.relname in ('objects','buckets') and not t.tgisinternal
),
s46 as (
select count(*) as foreign_case_document_links from public.cases c
cross join lateral jsonb_array_elements_text(case when jsonb_typeof(to_jsonb(c)->'document_ids')='array' then to_jsonb(c)->'document_ids' else '[]'::jsonb end) as link(document_id)
left join public.documents d on to_jsonb(d)->>'id'=link.document_id
where to_jsonb(d)->>'id' is null or (to_jsonb(d)->>'user_id') is distinct from (to_jsonb(c)->>'client_id')
)
select jsonb_build_object(
 'label','HAQ_PRODUCTION_COMPATIBILITY_PREFLIGHT__NOT_INSTALL_APPROVAL',
 'decision','NO_GO_UNTIL_OWNER_REVIEW_RECOVERY_AND_STAGING',
 'snapshot_time',transaction_timestamp(),
 'catalog_md5',(select * from catalog_pin),
 'catalog_pin_scope','Definitions/owners/ACLs/constraints/policies/roles, not row content; per-environment, re-sample after each preceding package',
 'confirmed_absences_recheck',jsonb_build_object(
  'original_storage_path_absent',not exists(select 1 from pg_attribute where attrelid=to_regclass('public.documents') and attname='original_storage_path' and not attisdropped),
  'citizen_bucket_absent',not exists(select 1 from storage.buckets where id='citizen-documents' or name='citizen-documents'),
  'finalizer_all_overloads_absent',not exists(select 1 from pg_proc where pronamespace=to_regnamespace('public') and proname='finalize_document_analysis'),
  'wrapper_all_overloads_absent',not exists(select 1 from pg_proc where pronamespace=to_regnamespace('public') and proname='request_case_once'),
  'account_helper_all_overloads_absent',not exists(select 1 from pg_proc where pronamespace=to_regnamespace('public') and proname='account_is_active'),
  'ledger_absent',to_regclass('public.case_submission_keys') is null
 ),
 'owner_evidence_still_required',jsonb_build_array(
  'Correct project/ref and trusted complete visibility; private schema definition review',
  'External/dynamic/privileged legacy callers and policy/ACL composition reviewed',
  'Encrypted complete database/Auth/config backup and supported isolated restore',
  'Separate Storage byte inventory/export/hashes and supported API restore rehearsal',
  'No assumed PITR; agreed RTO/RPO, write pause/drain and post-checkpoint reconciliation',
  'Exact reviewed C1/C2/C3 hashes and staging SQL/concurrency/Storage/browser acceptance',
  'Explicit owner production DDL/cache-refresh approval and separate real-account write approval'
 ),
 'catalog_and_access',jsonb_build_object(
 '01_session',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s1 x),
 '02_api_role_flags',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s2 x),
 '03_direct_memberships',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s3 x),
 '04_schema_privileges',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s4 x),
 '05_required_relations',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s5 x),
 '06_columns_defaults_column_acls',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s6 x),
 '07_canonical_function_contracts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s7 x),
 '08_other_helpers_and_auth_uid',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s8 x),
 '09_constraints',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s9 x),
 '10_indexes',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s10 x),
 '11_triggers',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s11 x),
 '12_all_relevant_policies',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s12 x),
 '13_effective_table_privileges',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s13 x),
 '14_effective_column_privileges',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s14 x),
 '15_effective_function_execute',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s15 x),
 '16_default_privileges',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s16 x),
 '17_public_views',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s17 x),
 '18_possible_legacy_callers',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s18 x),
 '19_function_dependencies',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s19 x),
 '20_transitive_role_memberships',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s20 x),
 '21_type_shadows',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s21 x),
 '22_rules',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s22 x),
 '23_ledger_effective_rights',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s23 x),
 '24_storage_versions_and_operator_ddl_visibility',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s24 x)
),
 'data_screen_and_candidate_contracts',jsonb_build_object(
 '25_bucket_configuration',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s25 x),
 '26_storage_metadata_counts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s26 x),
 '27_business_row_counts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s27 x),
 '28_profile_state_counts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s28 x),
 '29_lawyer_state_counts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s29 x),
 '30_document_state_counts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s30 x),
 '31_case_state_counts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s31 x),
 '32_clause_risk_counts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s32 x),
 '33_analysis_risk_counts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s33 x),
 '34_null_confidence_count',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s34 x),
 '35_invalid_price_count',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s35 x),
 '36_analysis_parent_mismatch_count',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s36 x),
 '37_missing_clause_parent_count',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s37 x),
 '38_duplicate_analysis_groups_count',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s38 x),
 '39_unfinished_documents_with_results_count',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s39 x),
 '40_analyzed_without_analysis_count',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s40 x),
 '41_original_metadata_shape_counts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s41 x),
 '42_extensions',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s42 x),
 '43_c2_c3_functions',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s43 x),
 '44_new_column_privileges',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s44 x),
 '45_storage_trigger_chain',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s45 x),
 '46_foreign_case_document_links',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from s46 x)
)
) as "HAQ_READ_ONLY_PREFLIGHT__ONE_RESULT__NOT_APPROVAL";
rollback;
