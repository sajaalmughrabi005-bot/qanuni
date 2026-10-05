-- HAQ migration 007: security and atomic analysis persistence.
-- Apply after schema.sql + 004/005/006. Preserves existing data. Review and
-- deploy separately; this file must never be applied blindly to production.
begin;
create or replace function account_is_active() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and account_status='active');
$$;
create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and role='admin' and account_status='active');
$$;
create or replace function current_lawyer_id() returns uuid language sql stable security definer set search_path=public as $$
 select l.id from lawyers l join profiles p on p.id=l.profile_id where p.id=auth.uid() and p.account_status='active' and p.role='lawyer' and l.verification_status='approved' and not l.is_demo limit 1;
$$;
create or replace function current_approved_lawyer_id() returns uuid language sql stable security definer set search_path=public as $$
 select l.id from lawyers l join profiles p on p.id=l.profile_id where p.id=auth.uid() and p.account_status='active' and p.role='lawyer' and l.verification_status='approved' and not l.is_demo limit 1;
$$;
create or replace function is_case_participant(p_case uuid) returns boolean language sql stable security definer set search_path=public as $$
 select account_is_active() and exists(select 1 from cases c where c.id=p_case and (c.client_id=auth.uid() or (c.lawyer_id=current_approved_lawyer_id() and c.status<>'rejected')));
$$;
-- Restrictive policies compose with existing ownership/role policies.
do $$ declare t text; begin
 foreach t in array array['documents','document_clauses','analyses','cases','case_events','case_notes','case_documents','messages','drafts','appointments','notifications','saved_lawyers','ai_history','reports','system_events'] loop
  execute format('drop policy if exists active_account_required on public.%I',t);
  execute format('create policy active_account_required on public.%I as restrictive for all to authenticated using (public.account_is_active()) with check (public.account_is_active())',t);
 end loop;
end $$;
create or replace function reject_inactive_actor() returns trigger language plpgsql security definer set search_path=public as $$
 begin
 if auth.uid() is not null and not account_is_active() then raise exception 'not_allowed'; end if;
 if tg_op='DELETE' then return old; end if; return new;
 end;
$$;
-- SECURITY DEFINER workflow RPCs bypass RLS; triggers cover them as well.
do $$ declare t text; begin
 foreach t in array array['documents','document_clauses','analyses','cases','case_notes','case_documents','messages','drafts','appointments','saved_lawyers','ai_history','lawyers','profiles'] loop
  execute format('drop trigger if exists active_actor_guard on public.%I',t);
  execute format('create trigger active_actor_guard before insert or update or delete on public.%I for each row execute function public.reject_inactive_actor()',t);
 end loop;
end $$;
-- Account creation has no auth.uid() in the DB trigger; client signup is
-- already role-clamped by 004. Service-role jobs remain unaffected.
create or replace function guard_requested_lawyer() returns trigger language plpgsql security definer set search_path=public as $$
 begin
 if new.lawyer_id is not null and not exists(select 1 from lawyers l join profiles p on p.id=l.profile_id where l.id=new.lawyer_id and p.account_status='active' and l.verification_status='approved' and not l.is_demo) then raise exception 'lawyer_unavailable'; end if;
 return new;
 end;
$$;
drop trigger if exists requested_lawyer_guard on cases;
create trigger requested_lawyer_guard before insert on cases for each row execute function guard_requested_lawyer();
-- Analyses cannot reference another user's document, even through a privileged
-- notification trigger or owner-only user_id policy.
create or replace function guard_analysis_document_owner() returns trigger language plpgsql security definer set search_path=public as $$
 begin
 if not exists(select 1 from documents d where d.id=new.document_id and d.user_id=new.user_id) then raise exception 'document_owner_mismatch'; end if;
 return new;
 end;
$$;
drop trigger if exists analysis_document_owner_guard on analyses;
create trigger analysis_document_owner_guard before insert or update on analyses for each row execute function guard_analysis_document_owner();
-- Remove private text access through the supposed metadata-only admin timeline.
drop policy if exists case_events_admin_read on case_events;
create or replace view admin_case_events_overview as
 select id,case_id,actor_id,actor_role,event_type,created_at,
 jsonb_strip_nulls(jsonb_build_object('from',metadata->'from','to',metadata->'to','reason_code',metadata->'reason_code','urgency',metadata->'urgency','category',metadata->'category')) as metadata
 from case_events where is_admin();
revoke all on admin_case_events_overview from public,anon;
grant select on admin_case_events_overview to authenticated;
-- File access follows current assignment/status; rejected/disabled lawyers
-- cannot mint new signed URLs. Existing 60-second URLs expire naturally.
drop policy if exists case_docs_insert on storage.objects;
create policy case_docs_insert on storage.objects for insert to authenticated with check (
 bucket_id='case-documents' and account_is_active() and exists(select 1 from cases c where c.id=((storage.foldername(name))[1])::uuid and
 ((c.client_id=auth.uid() and c.status in ('requested','accepted','active','waiting_for_client','waiting_for_lawyer')) or
 (c.lawyer_id=current_approved_lawyer_id() and c.status in ('accepted','active','waiting_for_client','waiting_for_lawyer'))))
);
drop policy if exists case_docs_delete on storage.objects;
create policy case_docs_delete on storage.objects for delete to authenticated using (bucket_id='case-documents' and owner=auth.uid() and account_is_active());
update storage.buckets set allowed_mime_types=array['application/pdf','image/png','image/jpeg','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'] where id='case-documents';
-- Additive risk/offset changes; do not invent confidence for new analyses.
alter table document_clauses drop constraint if exists document_clauses_risk_level_check;
alter table document_clauses add constraint document_clauses_risk_level_check check(risk_level in ('low','medium','high','unknown'));
alter table analyses drop constraint if exists analyses_overall_risk_check;
alter table analyses add constraint analyses_overall_risk_check check(overall_risk in ('low','medium','high','unknown'));
alter table document_clauses alter column confidence drop not null;
alter table document_clauses alter column confidence drop default;
alter table document_clauses add column if not exists source_text text;
alter table document_clauses add column if not exists source_start integer;
alter table document_clauses add column if not exists source_end integer;
-- One transaction owns all clauses, analysis and final status. Row lock makes
-- retries idempotent without deleting/deduplicating any historical records.
alter table document_clauses add column if not exists legal_reference_id text;
create or replace function finalize_document_analysis(p_document_id uuid,p_clauses jsonb,p_analysis jsonb) returns uuid
 language plpgsql security definer set search_path=public as $$
 declare d documents%rowtype; c jsonb; v_id uuid;
 begin
 if not account_is_active() then raise exception 'not_allowed'; end if;
 select * into d from documents where id=p_document_id and user_id=auth.uid() for update;
 if not found then raise exception 'forbidden'; end if;
 if d.status='analyzed' then
  select id into v_id from analyses where document_id=d.id and user_id=auth.uid() order by created_at limit 1;
  if v_id is not null then return v_id; end if;
 end if;
 if jsonb_typeof(p_clauses)<>'array' or jsonb_array_length(p_clauses)=0 or jsonb_array_length(p_clauses)>1000 or jsonb_typeof(p_analysis)<>'object' then raise exception 'invalid_analysis'; end if;
 if nullif(btrim(p_analysis->>'summaryAr'),'') is null or nullif(btrim(p_analysis->>'summaryEn'),'') is null then raise exception 'invalid_analysis'; end if;
 if exists(select 1 from document_clauses where document_id=d.id) or exists(select 1 from analyses where document_id=d.id) then raise exception 'analysis_inconsistent_existing_data'; end if;
 for c in select * from jsonb_array_elements(p_clauses) loop
  if c->>'sourceText' is not null then
   -- JS offsets count UTF-16 code units, so SQL cannot validate arbitrary
   -- unicode offsets by substring; verify the exact quote independently.
   if position(c->>'sourceText' in coalesce(d.citizen_description,''))=0 then raise exception 'invalid_source_quote'; end if;
  end if;
  insert into document_clauses(id,document_id,clause_number,clause_text_ar,clause_text_en,risk_level,category,explanation_ar,explanation_en,confidence,source_text,source_start,source_end,legal_reference_id)
  values(coalesce((c->>'id')::uuid,gen_random_uuid()),d.id,c->>'clauseNumber',coalesce(c->>'clauseTextAr',''),coalesce(c->>'clauseTextEn',''),coalesce(c->>'riskLevel','unknown'),c->>'category',coalesce(c->>'explanationAr',''),coalesce(c->>'explanationEn',''),null,c->>'sourceText',(c->>'sourceStart')::integer,(c->>'sourceEnd')::integer,case when c->>'legalSourceId' in ('jo-labour-8-1996-art63-20250724','jo-labour-8-1996-art64-20250724') then c->>'legalSourceId' else null end);
 end loop;
 insert into analyses(document_id,user_id,overall_risk,summary_ar,summary_en,payload)
 values(d.id,auth.uid(),coalesce(p_analysis->>'overallRisk','unknown'),p_analysis->>'summaryAr',p_analysis->>'summaryEn',p_analysis-'id'-'documentId'-'userId'-'createdAt') returning id into v_id;
 update documents set status='analyzed', document_type=case when p_analysis->>'detectedDocumentType' in ('rental','employment','service','sale','general') then p_analysis->>'detectedDocumentType' else document_type end where id=d.id;
 return v_id;
 end;
$$;
revoke all on function finalize_document_analysis(uuid,jsonb,jsonb) from public,anon;
grant execute on function finalize_document_analysis(uuid,jsonb,jsonb) to authenticated;
-- Server-authorized citizen submission idempotency; no direct table access.
create table if not exists case_submission_keys(user_id uuid not null references profiles(id) on delete cascade,key uuid not null,request_hash text not null,case_id uuid not null references cases(id) on delete cascade,primary key(user_id,key));
alter table case_submission_keys enable row level security;
revoke all on case_submission_keys from public,anon,authenticated;
create or replace function request_case_once(p_key uuid,p_request jsonb) returns uuid language plpgsql security definer set search_path=public as $$
 declare v_id uuid; v_hash text; begin
 if not account_is_active() or p_key is null then raise exception 'not_allowed'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_key::text,0));
 select case_id,request_hash into v_id,v_hash from case_submission_keys where user_id=auth.uid() and key=p_key;
 if v_id is not null then
  if v_hash<>md5(p_request::text) then raise exception 'submission_changed'; end if; return v_id;
 end if;
 v_id:=request_case((p_request->>'lawyerId')::uuid,p_request->>'title',p_request->>'category',p_request->>'description',coalesce(p_request->>'urgency','medium'),
 array(select jsonb_array_elements_text(coalesce(p_request->'documentIds','[]'))::uuid),array(select jsonb_array_elements_text(coalesce(p_request->'relevantClauseIds','[]'))::uuid),p_request->>'message',coalesce(p_request->>'summaryAr',''),coalesce(p_request->>'summaryEn',''),
 array(select jsonb_array_elements_text(coalesce(p_request->'keyDatesAr','[]'))),array(select jsonb_array_elements_text(coalesce(p_request->'keyDatesEn','[]'))),array(select jsonb_array_elements_text(coalesce(p_request->'questionsAr','[]'))),array(select jsonb_array_elements_text(coalesce(p_request->'questionsEn','[]'))),(p_request->>'matchScore')::integer);
 insert into case_submission_keys values(auth.uid(),p_key,md5(p_request::text),v_id); return v_id;
 end;
$$;
revoke all on function request_case_once(uuid,jsonb) from public,anon;
grant execute on function request_case_once(uuid,jsonb) to authenticated;
create or replace function lawyer_create_manual_case(
  p_title text, p_client_name text, p_category text, p_summary_ar text, p_summary_en text,
  p_story text, p_opposing_party text, p_key_dates text[], p_deadline date
) returns uuid as $$
declare
  v_lawyer uuid := public.current_approved_lawyer_id();
  v_id uuid;
begin
  if v_lawyer is null then raise exception 'forbidden'; end if;
  if char_length(coalesce(p_story,'')) > 240000 then raise exception 'invalid_description'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 3 and 200 then raise exception 'invalid_title'; end if;
  insert into public.cases (
    client_id, client_name, lawyer_id, title, category, status, is_manual,
    summary_ar, summary_en, client_story_ar, client_story_en, opposing_party,
    key_dates_ar, key_dates_en, suggested_specialty, deadline, accepted_at, accepted_by
  ) values (
    null, left(coalesce(nullif(btrim(p_client_name), ''), '—'), 200), v_lawyer, btrim(p_title),
    case when p_category = any (array['rental','employment','commercial','family','criminal','real_estate','corporate','civil']) then p_category else 'civil' end,
    'active', true,
    left(coalesce(p_summary_ar, ''), 4000), left(coalesce(p_summary_en, ''), 4000),
    coalesce(p_story, ''), coalesce(p_story, ''),
    nullif(left(coalesce(p_opposing_party, ''), 200), ''),
    coalesce(p_key_dates, '{}'), coalesce(p_key_dates, '{}'),
    'civil', p_deadline, now(), auth.uid()
  ) returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;
commit;
