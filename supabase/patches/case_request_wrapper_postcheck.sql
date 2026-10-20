-- READ ONLY after approved installation. Metadata only; no request submission.
begin read only;
set local search_path = pg_catalog, public, pg_temp;
select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_userbyid(p.proowner) as owner,p.prosecdef,p.proconfig,p.proacl,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
from pg_proc p where p.pronamespace='public'::regnamespace
  and p.proname in ('request_case','request_case_once','account_is_active');
-- Three rows above. Only wrapper has authenticated_execute=true.
-- Owner-derived role inheritance/superusers require separate privileged review.
select c.relname,pg_get_userbyid(c.relowner) as owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl,
  (select count(*) from pg_policy where polrelid=c.oid) as policies_must_be_zero,
  has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as authenticated_access_must_be_false,
  has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as anon_access_must_be_false,
  has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as service_access_must_be_false
from pg_class c where c.oid=to_regclass('public.case_submission_keys');
select conname,contype,pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid=to_regclass('public.case_submission_keys');
-- Exactly composite PK(user_id,key) and two ON DELETE CASCADE foreign keys.
select has_any_column_privilege('authenticated','public.cases','INSERT') as authenticated_direct_insert_must_be_false,
  has_any_column_privilege('anon','public.cases','INSERT') as anon_direct_insert_must_be_false;
commit;
