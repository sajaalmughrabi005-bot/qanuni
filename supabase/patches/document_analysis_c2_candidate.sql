-- C2 analysis CANDIDATE ONLY: NOT APPROVED / NOT EXECUTED / NOT AN AUTOMATIC MIGRATION.
-- Requires owner-reviewed environment-specific catalog pin below and staging tests.
-- See docs/PRODUCTION_COMPATIBILITY_CANDIDATES.md. Never bypass a failed guard.
-- One-time, absent-object variant; partial/existing installations need a new review.
begin;
set local search_path = pg_catalog, public, pg_temp;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
-- Acquire bounded DDL locks before validating; no data/schema changes before guards.

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
 lock table public.documents, public.document_clauses, public.analyses in access exclusive mode;
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

do $columns$ declare r record; begin
 for r in select * from (values
  ('profiles','id','uuid'),
  ('profiles','account_status','text'),
  ('documents','id','uuid'),
  ('documents','user_id','uuid'),
  ('documents','status','text'),
  ('documents','document_type','text'),
  ('documents','citizen_description','text'),
  ('document_clauses','id','uuid'),
  ('document_clauses','document_id','uuid'),
  ('document_clauses','clause_number','text'),
  ('document_clauses','clause_text_ar','text'),
  ('document_clauses','clause_text_en','text'),
  ('document_clauses','risk_level','text'),
  ('document_clauses','category','text'),
  ('document_clauses','explanation_ar','text'),
  ('document_clauses','explanation_en','text'),
  ('document_clauses','confidence','int4'),
  ('analyses','id','uuid'),
  ('analyses','document_id','uuid'),
  ('analyses','user_id','uuid'),
  ('analyses','overall_risk','text'),
  ('analyses','summary_ar','text'),
  ('analyses','summary_en','text'),
  ('analyses','payload','jsonb'),
  ('analyses','created_at','timestamptz')
 ) x(t,c,typ) loop
  if not exists(select 1 from pg_attribute where attrelid=to_regclass('public.'||r.t) and attname=r.c and atttypid=to_regtype('pg_catalog.'||r.typ) and attnum>0 and not attisdropped) then raise exception 'candidate: incompatible required column %.%',r.t,r.c; end if;
 end loop;
end; $columns$;

do $c2$ declare r record; norm text; begin
 if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname in ('finalize_document_analysis','guard_analysis_document_owner','reject_inactive_actor'))
 or exists(select 1 from pg_attribute where attrelid='public.document_clauses'::regclass and attname in ('source_text','source_start','source_end','legal_reference_id') and not attisdropped) then raise exception 'C2: collision/partial installation requires review'; end if;
 -- Unknown trigger/rule side effects must not be silently adopted. The catalog
 -- pin covers all remaining defaults, checks, FKs and effective-policy review.
 if exists(select 1 from pg_trigger where tgrelid in ('public.documents'::regclass,'public.document_clauses'::regclass,'public.analyses'::regclass) and not tgisinternal and not(tgrelid='public.analyses'::regclass and tgname='analyses_after_insert'))
 or exists(select 1 from pg_rewrite where ev_class in ('public.documents'::regclass,'public.document_clauses'::regclass,'public.analyses'::regclass)) then raise exception 'C2: unexpected trigger/rule; review, do not remove'; end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.analyses'::regclass and tgname='analyses_after_insert' and tgfoid=to_regprocedure('public.analyses_after_insert()') and tgtype=5 and tgenabled='O' and not tgisinternal and tgqual is null)
 or not exists(select 1 from pg_proc where oid=to_regprocedure('public.analyses_after_insert()') and proowner='postgres'::regrole and prosecdef and proconfig=array['search_path=public']::text[] and md5(replace(prosrc,E'\r\n',E'\n'))='dbd9f86d76fc9ad03a873520e4e2c79b')
 or not exists(select 1 from pg_proc where oid=to_regprocedure('public._notify(uuid,text,text,text,text,text,text)') and proowner='postgres'::regrole and prosecdef and proconfig=array['search_path=public']::text[] and md5(replace(prosrc,E'\r\n',E'\n'))='87e47b48ce6283aee0671c7ff4b88b4a') then raise exception 'C2: analysis notification chain differs from 004'; end if;
 for r in select * from (values ('document_clauses','risk_level','document_clauses_risk_level_check'),('analyses','overall_risk','analyses_overall_risk_check')) x(t,c,k) loop
  select regexp_replace(replace(pg_get_constraintdef(k.oid),'::text',''),'[[:space:]()]','','g') into norm from pg_constraint k where k.conrelid=to_regclass('public.'||r.t) and k.conname=r.k and k.contype='c' and k.convalidated;
  if norm is null or norm not in ('CHECK'||r.c||'=ANYARRAY[''low'',''medium'',''high'']','CHECK'||r.c||'=ANYARRAY[''low'',''medium'',''high'',''unknown'']') then raise exception 'C2: unknown risk-check definition %.%',r.t,r.k; end if;
  if exists(select 1 from pg_constraint k join pg_attribute a on a.attrelid=k.conrelid and a.attnum=any(k.conkey) where k.conrelid=to_regclass('public.'||r.t) and k.contype='c' and a.attname=r.c and k.conname<>r.k) then raise exception 'C2: extra risk check requires review'; end if;
 end loop;
 if not exists(select 1 from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid='public.document_clauses'::regclass and a.attname='confidence' and ((a.attnotnull and regexp_replace(pg_get_expr(d.adbin,d.adrelid),'[()]','','g')='60') or (not a.attnotnull and d.oid is null))) then raise exception 'C2: unknown confidence nullability/default'; end if;
 if exists(select 1 from public.analyses a left join public.documents d on d.id=a.document_id where d.id is null or a.user_id is distinct from d.user_id) then raise exception 'C2: historical analysis ownership mismatch; no automatic data repair'; end if;
end; $c2$;

alter table public.document_clauses add column source_text text, add column source_start integer, add column source_end integer, add column legal_reference_id text;
alter table public.document_clauses alter column confidence drop not null, alter column confidence drop default;
alter table public.document_clauses drop constraint document_clauses_risk_level_check;
alter table public.document_clauses add constraint document_clauses_risk_level_check check(risk_level in ('low','medium','high','unknown'));
alter table public.analyses drop constraint analyses_overall_risk_check;
alter table public.analyses add constraint analyses_overall_risk_check check(overall_risk in ('low','medium','high','unknown'));

create function public.reject_inactive_actor() returns trigger language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
 -- NULL auth.uid() retains the trusted system-job semantics of 007, not API auth.
 if auth.uid() is not null then
  perform 1 from public.profiles where id=auth.uid() and account_status='active' for share;
  if not found then raise exception 'not_allowed'; end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
create function public.guard_analysis_document_owner() returns trigger language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
 perform 1 from public.documents where id=new.document_id and user_id=new.user_id for share;
 if not found then raise exception 'document_owner_mismatch'; end if;
 return new;
end;
$$;
create trigger active_actor_guard before insert or update or delete on public.documents for each row execute function public.reject_inactive_actor();
create trigger active_actor_guard before insert or update or delete on public.document_clauses for each row execute function public.reject_inactive_actor();
create trigger active_actor_guard before insert or update or delete on public.analyses for each row execute function public.reject_inactive_actor();
create trigger analysis_document_owner_guard before insert or update on public.analyses for each row execute function public.guard_analysis_document_owner();
create function public.finalize_document_analysis(p_document_id uuid,p_clauses jsonb,p_analysis jsonb) returns uuid
 language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
 declare d public.documents%rowtype; c jsonb; v_id uuid;
 begin
 -- Lock active authorization before the document lock; disable races serialize.
 if auth.uid() is null then raise exception 'not_allowed'; end if;
 perform 1 from public.profiles where id=auth.uid() and account_status='active' for share;
 if not found then raise exception 'not_allowed'; end if;
 -- SQL NULL and JSON null cannot pass a three-valued boolean guard.
 if p_clauses is null or jsonb_typeof(p_clauses) is distinct from 'array'
 or p_analysis is null or jsonb_typeof(p_analysis) is distinct from 'object' then raise exception 'invalid_analysis'; end if;
 if jsonb_array_length(p_clauses)=0 or jsonb_array_length(p_clauses)>1000 then raise exception 'invalid_analysis'; end if;
 if exists(select 1 from jsonb_array_elements(p_clauses) as e(value) where jsonb_typeof(e.value) is distinct from 'object') then raise exception 'invalid_analysis'; end if;
 select * into d from public.documents where id=p_document_id and user_id=auth.uid() for update;
 if not found then raise exception 'forbidden'; end if;
 if d.status='analyzed' then
  select id into v_id from public.analyses where document_id=d.id and user_id=auth.uid() order by created_at limit 1;
  if v_id is not null then return v_id; end if;
 end if;
 if nullif(btrim(p_analysis->>'summaryAr'),'') is null or nullif(btrim(p_analysis->>'summaryEn'),'') is null then raise exception 'invalid_analysis'; end if;
 if exists(select 1 from public.document_clauses where document_id=d.id) or exists(select 1 from public.analyses where document_id=d.id) then raise exception 'analysis_inconsistent_existing_data'; end if;
 for c in select * from jsonb_array_elements(p_clauses) loop
  if c->>'sourceText' is not null then
   -- JS offsets count UTF-16 code units, so SQL cannot validate arbitrary
   -- unicode offsets by substring; verify the exact quote independently.
   if position(c->>'sourceText' in coalesce(d.citizen_description,''))=0 then raise exception 'invalid_source_quote'; end if;
  end if;
  insert into public.document_clauses(id,document_id,clause_number,clause_text_ar,clause_text_en,risk_level,category,explanation_ar,explanation_en,confidence,source_text,source_start,source_end,legal_reference_id)
  values(coalesce((c->>'id')::uuid,pg_catalog.gen_random_uuid()),d.id,c->>'clauseNumber',coalesce(c->>'clauseTextAr',''),coalesce(c->>'clauseTextEn',''),coalesce(c->>'riskLevel','unknown'),c->>'category',coalesce(c->>'explanationAr',''),coalesce(c->>'explanationEn',''),null,c->>'sourceText',(c->>'sourceStart')::integer,(c->>'sourceEnd')::integer,case when c->>'legalSourceId' in ('jo-labour-8-1996-art15a-20250724','jo-labour-8-1996-art56a-20250724','jo-labour-8-1996-art59a-20250724','jo-labour-8-1996-art61a-20250724','jo-labour-8-1996-art62-20250724','jo-labour-8-1996-art63-20250724','jo-labour-8-1996-art64-20250724','jo-labour-8-1996-art65-20250724') then c->>'legalSourceId' else null end);
 end loop;
 insert into public.analyses(document_id,user_id,overall_risk,summary_ar,summary_en,payload)
 values(d.id,auth.uid(),coalesce(p_analysis->>'overallRisk','unknown'),p_analysis->>'summaryAr',p_analysis->>'summaryEn',p_analysis-'id'-'documentId'-'userId'-'createdAt') returning id into v_id;
 update public.documents set status='analyzed', document_type=case when p_analysis->>'detectedDocumentType' in ('rental','employment','service','sale','general') then p_analysis->>'detectedDocumentType' else document_type end where id=d.id;
 return v_id;
 end;
$$;
-- Remove ALL unexpected default grants on NEW functions only; C1 ACLs untouched.
do $acl$ declare p record; begin
 for p in select distinct f.oid::regprocedure::text as name,a.grantee from pg_proc f
 cross join lateral aclexplode(coalesce(f.proacl,acldefault('f',f.proowner))) a
 where f.pronamespace='public'::regnamespace and f.proname in ('reject_inactive_actor','guard_analysis_document_owner','finalize_document_analysis') and a.grantee<>f.proowner loop
  execute format('revoke all privileges on function %s from %s',p.name,case when p.grantee=0 then 'PUBLIC' else quote_ident(pg_get_userbyid(p.grantee)) end);
 end loop;
end; $acl$;
grant execute on function public.finalize_document_analysis(uuid,jsonb,jsonb) to authenticated;
-- Part of the eventual owner-approved DDL window; NOT a read-only diagnostic.
notify pgrst, 'reload schema';
commit;
