-- OWNER-RUN ONLY. Not executed. Run AFTER catalog preflight confirms every
-- referenced relation/column/type and the operator can see all relevant rows.
-- Counts only, no identities, document content, file paths or signed URLs.
-- Stop on timeout; do not raise limits blindly on a busy production project.
begin transaction isolation level repeatable read read only;
set local search_path = pg_catalog, public, pg_temp;
set local lock_timeout = '3s';
set local statement_timeout = '15s';

select id,name,public,file_size_limit,allowed_mime_types from storage.buckets
where id in ('citizen-documents','case-documents');
select bucket_id,count(*) as metadata_rows from storage.objects
where bucket_id in ('citizen-documents','case-documents') group by bucket_id;
-- Empty bucket rows do NOT prove anything about remote object-byte inventory.
select 'profiles' as relation,count(*) as rows from public.profiles
union all select 'lawyers',count(*) from public.lawyers
union all select 'documents',count(*) from public.documents
union all select 'document_clauses',count(*) from public.document_clauses
union all select 'analyses',count(*) from public.analyses
union all select 'cases',count(*) from public.cases
union all select 'messages',count(*) from public.messages
union all select 'case_events',count(*) from public.case_events
union all select 'notifications',count(*) from public.notifications;
select role,account_status,count(*) as rows from public.profiles group by role,account_status;
select verification_status,is_demo,count(*) as rows from public.lawyers group by verification_status,is_demo;
select status,count(*) as rows from public.documents group by status;
select status,count(*) as rows from public.cases group by status;
select risk_level,count(*) as rows from public.document_clauses group by risk_level;
select overall_risk,count(*) as rows from public.analyses group by overall_risk;
select count(*) as null_confidence from public.document_clauses where confidence is null;
select count(*) as invalid_fee_rows from public.lawyers
where consultation_price is null or consultation_price<0 or consultation_price>10000
 or consultation_price<>round(consultation_price,2);
select count(*) as analysis_parent_mismatches from public.analyses a
left join public.documents d on d.id=a.document_id
where d.id is null or a.user_id is distinct from d.user_id;
select count(*) as clause_parent_missing from public.document_clauses c
left join public.documents d on d.id=c.document_id where d.id is null;
select count(*) as duplicate_analysis_document_groups from
 (select document_id from public.analyses group by document_id having count(*)>1) duplicates;
select count(*) as unfinished_documents_with_existing_results from public.documents d
where d.status<>'analyzed' and
 (exists(select 1 from public.analyses a where a.document_id=d.id)
 or exists(select 1 from public.document_clauses c where c.document_id=d.id));
select count(*) as analyzed_without_analysis from public.documents d
where d.status='analyzed' and not exists(select 1 from public.analyses a where a.document_id=d.id);
-- These may be historical. Do NOT delete/relabel/deduplicate to force a repair.
rollback;
