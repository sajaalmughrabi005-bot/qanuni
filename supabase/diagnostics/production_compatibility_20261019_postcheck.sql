-- OWNER-RUN ONLY after a separately approved installation. NOT executed.
-- Rerun catalog preflight too. These are necessary checks, not functional proof.
-- Requires the approved target objects/columns; missing prerequisites abort safely.
begin transaction isolation level repeatable read read only;
set local search_path = pg_catalog, public, pg_temp;
set local lock_timeout = '3s';
set local statement_timeout = '15s';

with required(table_name,column_name,type_name) as (values
 ('documents','original_storage_path','text'),('documents','original_mime_type','text'),('documents','original_size_bytes','int8'),
 ('document_clauses','source_text','text'),('document_clauses','source_start','int4'),
 ('document_clauses','source_end','int4'),('document_clauses','legal_reference_id','text')
)
select r.*,a.attname is not null as present,
 a.atttypid=to_regtype('pg_catalog.'||r.type_name) as exact_type,
 not a.attnotnull as nullable,pg_get_expr(d.adbin,d.adrelid) as default_expression
from required r left join pg_class c on c.relnamespace=to_regnamespace('public') and c.relname=r.table_name
left join pg_attribute a on a.attrelid=c.oid and a.attname=r.column_name and a.attnum>0 and not a.attisdropped
left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum;
select not a.attnotnull as confidence_nullable,d.oid is null as confidence_has_no_default
from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
where a.attrelid=to_regclass('public.document_clauses') and a.attname='confidence' and not a.attisdropped;
select p.oid::regprocedure as function,pg_get_userbyid(p.proowner) as owner,p.prosecdef,p.proconfig,
 pg_get_function_result(p.oid) as result_type,md5(replace(p.prosrc,E'\r\n',E'\n')) as body_md5,
 r.rolname,has_function_privilege(r.oid,p.oid,'EXECUTE') as can_execute
from pg_proc p cross join pg_roles r where p.pronamespace=to_regnamespace('public')
 and p.proname in ('request_case','request_case_once','account_is_active','finalize_document_analysis','can_read_document','citizen_document_storage_access')
 and r.rolname in ('anon','authenticated','service_role');
-- Wrapper/finalizer/authenticated policy gates: auth true, anon false.
-- account_is_active stays owner-only in the recommended private-helper design.
-- request_case must remain unavailable to API callers.
select c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) as owner,
 (select count(*) from pg_policy where polrelid=c.oid) as ledger_policy_count_must_be_zero
from pg_class c where c.oid=to_regclass('public.case_submission_keys');
select r.rolname,has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as any_table_access,
 has_any_column_privilege(r.oid,c.oid,'SELECT') as any_column_select,
 has_any_column_privilege(r.oid,c.oid,'INSERT') as any_column_insert,
 has_any_column_privilege(r.oid,c.oid,'UPDATE') as any_column_update
from pg_class c cross join pg_roles r where c.oid=to_regclass('public.case_submission_keys')
 and r.rolname in ('anon','authenticated','service_role');
select conname,contype,convalidated,pg_get_constraintdef(oid) as definition from pg_constraint
where conrelid in (to_regclass('public.case_submission_keys'),to_regclass('public.document_clauses'),to_regclass('public.analyses'));
select id,public,file_size_limit,allowed_mime_types from storage.buckets
where id in ('citizen-documents','case-documents');
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies
where (schemaname='storage' and tablename='objects')
 or (schemaname='public' and tablename in ('documents','document_clauses','analyses','lawyers','case_submission_keys'));
-- No source paths/contents. Fresh untouched rows stay NULL; never invent originals.
select count(*) filter(where original_storage_path is not null) as rows_with_original_path,
 count(*) filter(where original_storage_path is null and (original_mime_type is not null or original_size_bytes is not null)) as incomplete_metadata_rows,
 count(*) filter(where original_storage_path is not null and (original_mime_type is null or original_size_bytes is null)) as incomplete_original_rows
from public.documents;
select count(*) as dangling_submission_keys from public.case_submission_keys k
left join public.profiles p on p.id=k.user_id left join public.cases c on c.id=k.case_id
where p.id is null or c.id is null or c.client_id is distinct from k.user_id;
rollback;
