-- C3 private originals CANDIDATE ONLY: NOT APPROVED / NOT EXECUTED / NOT AN AUTOMATIC MIGRATION.
-- Requires owner-reviewed environment-specific catalog pin below and staging tests.
-- See docs/PRODUCTION_COMPATIBILITY_CANDIDATES.md. Never bypass a failed guard.
-- One-time, absent-object variant; partial/existing installations need a new review.
begin;
set local search_path = pg_catalog, public, pg_temp;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Catalog pin is an evidence lock, NOT approval or a substitute for security review.
-- Obtain it from the single-result diagnostic in THIS environment after preceding
-- packages commit. Owner must review that catalog before pinning a reviewed COPY.
do $compatibility$
declare
 approved_catalog_md5 constant text := 'OWNER_REVIEW_REQUIRED';
 actual_catalog_md5 text;
 item record;
 fn record;
begin
 if current_user <> 'postgres' then raise exception 'candidate: expected postgres operator/owner'; end if;
 if approved_catalog_md5 !~ '^[0-9a-f]{32}$' then raise exception 'candidate: missing owner-reviewed catalog pin'; end if;
 lock table public.documents, public.document_clauses, public.analyses, storage.buckets, storage.objects in access exclusive mode;
 with catalog_items(kind,object_key,value) as (
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
select md5(coalesce(jsonb_agg(jsonb_build_array(kind,object_key,value) order by kind,object_key,value::text)::text,'[]')) into actual_catalog_md5 from catalog_items;
 if actual_catalog_md5 is distinct from approved_catalog_md5 then raise exception 'candidate: catalog drift; stop for review'; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated' and not rolsuper and not rolbypassrls)
 or not exists(select 1 from pg_roles where rolname='anon' and not rolsuper and not rolbypassrls)
 or has_schema_privilege('authenticated','public','CREATE') or has_schema_privilege('anon','public','CREATE')
 or not has_schema_privilege('authenticated','public','USAGE') then raise exception 'candidate: unsafe/missing API schema or role privileges'; end if;
 for item in select * from (values
  ('account_is_active','public.account_is_active()','b3fb8644fd817e3ea224dd9ad5f02fe3'),
  ('request_case_once','public.request_case_once(uuid,jsonb)','c4f5b2ecd7b2be62d0217ed2893ddd3c')
 ) x(name,signature,body_hash) loop
  select p.* into fn from pg_proc p where p.oid=to_regprocedure(item.signature);
  if not found then raise exception 'candidate: install and verify unchanged C1 first'; end if;
  if fn.prokind<>'f' or fn.proretset or fn.pronargdefaults<>0
   or fn.prorettype<>case when item.name='account_is_active' then 'pg_catalog.bool'::regtype else 'pg_catalog.uuid'::regtype end
   or fn.provolatile<>case when item.name='account_is_active' then 's'::"char" else 'v'::"char" end
   or (select lanname from pg_language where oid=fn.prolang)<>case when item.name='account_is_active' then 'sql' else 'plpgsql' end
   or fn.proowner <> 'postgres'::regrole or not fn.prosecdef or fn.proconfig is distinct from array['search_path=pg_catalog, public, pg_temp']::text[]
   or md5(replace(fn.prosrc,E'\r\n',E'\n'))<>item.body_hash
   or (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname=item.name)<>1 then raise exception 'candidate: C1 definition incompatible'; end if;
  if exists(select 1 from aclexplode(coalesce(fn.proacl,acldefault('f',fn.proowner))) a where a.grantee<>fn.proowner
   and not(item.name='request_case_once' and a.grantee='authenticated'::regrole and a.privilege_type='EXECUTE' and not a.is_grantable))
   or has_function_privilege('anon',fn.oid,'EXECUTE')
   or (item.name='account_is_active' and has_function_privilege('authenticated',fn.oid,'EXECUTE'))
   or (item.name='request_case_once' and not has_function_privilege('authenticated',fn.oid,'EXECUTE')) then raise exception 'candidate: C1 ACL incompatible'; end if;
 end loop;
 if not exists(select 1 from pg_class where oid=to_regclass('public.case_submission_keys') and relkind='r' and relowner='postgres'::regrole and relrowsecurity and not relforcerowsecurity)
 or exists(select 1 from pg_policy where polrelid=to_regclass('public.case_submission_keys'))
 or has_any_column_privilege('authenticated','public.case_submission_keys','SELECT,INSERT,UPDATE,REFERENCES')
 or has_any_column_privilege('anon','public.case_submission_keys','SELECT,INSERT,UPDATE,REFERENCES')
 or has_table_privilege('authenticated','public.case_submission_keys','DELETE,TRUNCATE,TRIGGER')
 or has_table_privilege('anon','public.case_submission_keys','DELETE,TRUNCATE,TRIGGER') then raise exception 'candidate: C1 ledger is not private'; end if;
 if exists(select 1 from pg_proc p where p.pronamespace='public'::regnamespace and p.proname='request_case'
   and (has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE'))) then raise exception 'candidate: legacy API bypass remains'; end if;

 -- Preserve the legacy implementation and internal writers, not just wrapper
 -- source text. Verify canonical argument OIDs rather than an ambiguous lookup.
 for item in select * from (values
  ('request_case',array['uuid','text','text','text','text','uuid[]','uuid[]','text','text','text','text[]','text[]','text[]','text[]','int4'],'uuid','99bf22c2fb651dbc852dd81c1a57da2f'),
  ('cases_after_insert',array[]::text[],'trigger','5b68586057ddb621885976fc3efd3b68'),
  ('_case_event',array['uuid','uuid','text','text','jsonb'],'void','a5c3b8e71470a1f75362aad93e5daf14'),
  ('_notify',array['uuid','text','text','text','text','text','text'],'void','87e47b48ce6283aee0671c7ff4b88b4a')
 ) x(name,args,result_type,hash) loop
  select p.* into fn from pg_proc p where p.pronamespace='public'::regnamespace and p.proname=item.name
   and array(select actual from unnest(p.proargtypes) t(actual))=array(select to_regtype('pg_catalog.'||t)::oid from unnest(item.args) with ordinality a(t,i) order by i);
  if not found then raise exception 'candidate: missing exact baseline signature %',item.name; end if;
  if fn.prokind<>'f' or fn.proretset or fn.proowner<>'postgres'::regrole or not fn.prosecdef or fn.prorettype<>to_regtype('pg_catalog.'||item.result_type)
   or (select lanname from pg_language where oid=fn.prolang)<>'plpgsql' or fn.proconfig is distinct from array['search_path=public']::text[]
   or md5(replace(fn.prosrc,E'\r\n',E'\n'))<>item.hash
   or (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname=item.name)<>1 then raise exception 'candidate: incompatible 004 baseline %',item.name; end if;
  if item.name in ('request_case','_notify','_case_event') and (has_function_privilege('authenticated',fn.oid,'EXECUTE') or has_function_privilege('anon',fn.oid,'EXECUTE')) then raise exception 'candidate: legacy/internal writer exposed'; end if;
  if item.name='request_case' and (fn.pronargdefaults<>11 or fn.proargmodes is not null or fn.provolatile<>'v') then raise exception 'candidate: request_case defaults/modes differ'; end if;
 end loop;
 if has_any_column_privilege('authenticated','public.cases','INSERT') or has_any_column_privilege('anon','public.cases','INSERT') then raise exception 'candidate: direct case INSERT bypass'; end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.cases'::regclass and tgname='cases_after_insert' and tgfoid=to_regprocedure('public.cases_after_insert()') and tgtype=5 and tgenabled='O' and not tgisinternal and tgqual is null)
 or exists(select 1 from pg_trigger where tgrelid in ('public.cases'::regclass,'public.case_events'::regclass,'public.notifications'::regclass) and not tgisinternal and (tgtype & 4)<>0 and not(tgrelid='public.cases'::regclass and tgname='cases_after_insert'))
 or exists(select 1 from pg_rewrite where ev_class in ('public.cases'::regclass,'public.case_events'::regclass,'public.notifications'::regclass)) then raise exception 'candidate: incompatible case notification trigger/rule chain'; end if;
 for item in select unnest(array['profiles','lawyers','documents','document_clauses','analyses','cases','case_events','notifications']) as name loop
  if not exists(select 1 from pg_class where oid=to_regclass('public.'||item.name) and relkind='r' and relowner='postgres'::regrole and relrowsecurity and not relforcerowsecurity) then raise exception 'candidate: table ownership/RLS mismatch: %',item.name; end if;
 end loop;
end;
$compatibility$;


do $c3$ declare r record; f record; begin
 for r in select * from (values
  ('reject_inactive_actor','','d557def6cc419305648159af3c36f68f'),
 ('guard_analysis_document_owner','','7212efbdc4d91dd13ea4cd2a44b4e7b3'),
 ('finalize_document_analysis','uuid,jsonb,jsonb','0bf3e9f86b7bc0ae0d569785815411d7')
 ) x(name,args,hash) loop
  select p.* into f from pg_proc p where oid=to_regprocedure('public.'||r.name||'('||r.args||')');
  if not found then raise exception 'C3: approved C2 must be installed and verified first'; end if;
  if f.proowner<>'postgres'::regrole or not f.prosecdef or f.proconfig is distinct from array['search_path=pg_catalog, public, pg_temp']::text[] or md5(replace(f.prosrc,E'\r\n',E'\n'))<>r.hash then raise exception 'C3: C2 definition mismatch'; end if;
  if has_function_privilege('anon',f.oid,'EXECUTE') or (r.name<>'finalize_document_analysis' and has_function_privilege('authenticated',f.oid,'EXECUTE')) or (r.name='finalize_document_analysis' and not has_function_privilege('authenticated',f.oid,'EXECUTE')) then raise exception 'C3: C2 ACL mismatch'; end if;
 end loop;
 if (select count(*) from pg_trigger where tgrelid in ('public.documents'::regclass,'public.document_clauses'::regclass,'public.analyses'::regclass) and tgname='active_actor_guard' and tgtype=31 and tgenabled='O' and not tgisinternal and tgqual is null and tgfoid=to_regprocedure('public.reject_inactive_actor()'))<>3
 or not exists(select 1 from pg_trigger where tgrelid='public.analyses'::regclass and tgname='analysis_document_owner_guard' and tgtype=23 and tgenabled='O' and not tgisinternal and tgqual is null and tgfoid=to_regprocedure('public.guard_analysis_document_owner()')) then raise exception 'C3: missing C2 triggers'; end if;
 if exists(select 1 from pg_attribute where attrelid='public.documents'::regclass and attname in ('original_storage_path','original_mime_type','original_size_bytes') and not attisdropped)
 or exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname in ('can_read_document','citizen_document_storage_access'))
 or exists(select 1 from storage.buckets where id='citizen-documents' or name='citizen-documents') then raise exception 'C3: collision/partial installation; do not adopt or overwrite'; end if;
 if exists(select 1 from pg_policies where (schemaname='public' and tablename in ('documents','document_clauses','analyses') and policyname='haq_c3_document_visibility') or (schemaname='storage' and tablename='objects' and policyname like 'haq_c3_%')) then raise exception 'C3: policy name collision'; end if;
 if not exists(select 1 from pg_class where oid=to_regclass('storage.objects') and relkind='r' and relrowsecurity and not relforcerowsecurity)
 or not has_schema_privilege('authenticated','storage','USAGE')
 or not has_table_privilege('authenticated','storage.objects','SELECT')
 or not has_table_privilege('authenticated','storage.objects','INSERT')
 or not has_table_privilege('authenticated','storage.objects','DELETE') then raise exception 'C3: Storage API privilege/RLS prerequisite missing'; end if;
 -- Anonymous text access must not survive behind authenticated-only gates.
 if has_any_column_privilege('anon','public.documents','SELECT')
 or has_any_column_privilege('anon','public.document_clauses','SELECT')
 or has_any_column_privilege('anon','public.analyses','SELECT') then raise exception 'C3: anonymous document-text privileges require separate review'; end if;
 -- All other columns/defaults, cases.document_ids UUID[], ownership/FKs,
 -- restrictive-policy composition and managed Storage ownership are pinned and
 -- MUST be reviewed. An incompatible managed DDL permission aborts atomically.
end; $c3$;

alter table public.documents add column original_storage_path text, add column original_mime_type text, add column original_size_bytes bigint;

create function public.can_read_document(p_document uuid) returns boolean language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
 select public.account_is_active() and exists(
  select 1 from public.documents d where d.id=p_document and (
   d.user_id=auth.uid() or exists(
    select 1 from public.cases c join public.lawyers l on l.id=c.lawyer_id join public.profiles p on p.id=l.profile_id
    where p.id=auth.uid() and p.role='lawyer' and p.account_status='active'
     and l.verification_status='approved' and l.is_demo=false and c.status<>'rejected'
     -- Sharing requires the document owner's case, not a foreign historical link.
     and c.client_id=d.user_id and d.id=any(c.document_ids)
   )
  )
 );
$$;

create function public.citizen_document_storage_access(p_name text,p_write boolean) returns boolean language plpgsql stable security definer set search_path = pg_catalog, public, pg_temp as $$
declare parts text[]; d public.documents%rowtype;
begin
 if p_name is null or p_write is null or not public.account_is_active() then return false; end if;
 parts:=string_to_array(p_name,'/');
 if cardinality(parts)<>3 or parts[1]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 or parts[2]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 or parts[3]!~'^[0-9a-f]{64}[.](pdf|png|jpg|jpeg|webp|txt|docx)$' then return false; end if;
 select * into d from public.documents where id=parts[2]::uuid;
 if not found or d.user_id::text<>parts[1] then return false; end if;
 -- Owner read is needed before metadata commit for immutable-upload retry.
 if d.user_id=auth.uid() then return true; end if;
 if p_write then return false; end if;
 -- Assigned lawyer can read the committed original only, never orphan uploads.
 return coalesce(d.original_storage_path=p_name and public.can_read_document(d.id),false);
exception when invalid_text_representation then return false;
end;
$$;

-- Restrictive gates can only narrow existing permissive SELECT access.
create policy haq_c3_document_visibility on public.documents as restrictive for select to authenticated using(public.can_read_document(id));
create policy haq_c3_document_visibility on public.document_clauses as restrictive for select to authenticated using(public.can_read_document(document_id));
create policy haq_c3_document_visibility on public.analyses as restrictive for select to authenticated using(public.can_read_document(document_id));

-- Absent-only, no ON CONFLICT update of existing configuration or objects.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('citizen-documents','citizen-documents',false,10485760,array['application/pdf','image/png','image/jpeg','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

-- Narrow allow policies. Existing permissive policies remain unchanged.
create policy haq_c3_original_read on storage.objects for select to authenticated using(bucket_id='citizen-documents' and public.citizen_document_storage_access(name,false));
create policy haq_c3_original_insert on storage.objects for insert to authenticated with check(bucket_id='citizen-documents' and public.citizen_document_storage_access(name,true));
create policy haq_c3_original_delete on storage.objects for delete to authenticated using(bucket_id='citizen-documents' and public.citizen_document_storage_access(name,true));
-- A legacy permissive policy is OR-combined. These AND gates protect this NEW
-- bucket even if an old allow-policy is broad. Other bucket predicates pass
-- through unchanged; this package makes no security claim about other buckets.
create policy haq_c3_original_read_gate on storage.objects as restrictive for select to authenticated using(bucket_id<>'citizen-documents' or public.citizen_document_storage_access(name,false));
create policy haq_c3_original_insert_gate on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'citizen-documents' or public.citizen_document_storage_access(name,true));
create policy haq_c3_original_delete_gate on storage.objects as restrictive for delete to authenticated using(bucket_id<>'citizen-documents' or public.citizen_document_storage_access(name,true));
-- Immutable originals: deny UPDATE, including moves into/out of this bucket.
create policy haq_c3_original_no_update on storage.objects as restrictive for update to authenticated using(bucket_id<>'citizen-documents') with check(bucket_id<>'citizen-documents');
create policy haq_c3_original_no_anon on storage.objects as restrictive for all to anon using(bucket_id<>'citizen-documents') with check(bucket_id<>'citizen-documents');

-- Only these NEW boolean policy gates receive authenticated EXECUTE. C1's
-- account helper, ledger and legacy creator remain private and unchanged.
do $acl$ declare p record; begin
 for p in select distinct f.oid::regprocedure::text as name,a.grantee from pg_proc f
 cross join lateral aclexplode(coalesce(f.proacl,acldefault('f',f.proowner))) a
 where f.pronamespace='public'::regnamespace and f.proname in ('can_read_document','citizen_document_storage_access') and a.grantee<>f.proowner loop
  execute format('revoke all privileges on function %s from %s',p.name,case when p.grantee=0 then 'PUBLIC' else quote_ident(pg_get_userbyid(p.grantee)) end);
 end loop;
end; $acl$;
grant execute on function public.can_read_document(uuid), public.citizen_document_storage_access(text,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
