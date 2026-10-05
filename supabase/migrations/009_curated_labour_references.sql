-- Additive source-reference allowlist extension only. Review/apply in designated staging.
-- Preserves 007/008 ownership, active-account, exact-quote, atomicity and retry guards.
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
  values(coalesce((c->>'id')::uuid,gen_random_uuid()),d.id,c->>'clauseNumber',coalesce(c->>'clauseTextAr',''),coalesce(c->>'clauseTextEn',''),coalesce(c->>'riskLevel','unknown'),c->>'category',coalesce(c->>'explanationAr',''),coalesce(c->>'explanationEn',''),null,c->>'sourceText',(c->>'sourceStart')::integer,(c->>'sourceEnd')::integer,case when c->>'legalSourceId' in ('jo-labour-8-1996-art15a-20250724','jo-labour-8-1996-art56a-20250724','jo-labour-8-1996-art59a-20250724','jo-labour-8-1996-art61a-20250724','jo-labour-8-1996-art62-20250724','jo-labour-8-1996-art63-20250724','jo-labour-8-1996-art64-20250724','jo-labour-8-1996-art65-20250724') then c->>'legalSourceId' else null end);
 end loop;
 insert into analyses(document_id,user_id,overall_risk,summary_ar,summary_en,payload)
 values(d.id,auth.uid(),coalesce(p_analysis->>'overallRisk','unknown'),p_analysis->>'summaryAr',p_analysis->>'summaryEn',p_analysis-'id'-'documentId'-'userId'-'createdAt') returning id into v_id;
 update documents set status='analyzed', document_type=case when p_analysis->>'detectedDocumentType' in ('rental','employment','service','sale','general') then p_analysis->>'detectedDocumentType' else document_type end where id=d.id;
 return v_id;
 end;
$$;
revoke all on function finalize_document_analysis(uuid,jsonb,jsonb) from public,anon;
grant execute on function finalize_document_analysis(uuid,jsonb,jsonb) to authenticated;
