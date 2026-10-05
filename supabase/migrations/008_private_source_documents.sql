-- HAQ migration 008: original private citizen documents.
-- Apply after 007. No existing rows/files are deleted or moved.
begin;
alter table documents add column if not exists original_storage_path text;
alter table documents add column if not exists original_mime_type text;
alter table documents add column if not exists original_size_bytes bigint;
create or replace function can_read_document(p_document uuid) returns boolean language sql stable security definer set search_path=public as $$
 select account_is_active() and exists(select 1 from documents d where d.id=p_document and (d.user_id=auth.uid() or exists(select 1 from cases c where c.lawyer_id=current_approved_lawyer_id() and c.status<>'rejected' and d.id=any(c.document_ids))));
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('citizen-documents','citizen-documents',false,10485760,array['application/pdf','image/png','image/jpeg','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create or replace function citizen_document_storage_access(p_name text,p_write boolean) returns boolean language plpgsql stable security definer set search_path=public as $$
 declare parts text[]; d documents%rowtype; begin
 if not account_is_active() then return false; end if;
 parts:=string_to_array(p_name,'/');
 if array_length(parts,1)<>3 or parts[1]!~'^[0-9a-f-]{36}$' or parts[2]!~'^[0-9a-f-]{36}$' then return false; end if;
 select * into d from documents where id=parts[2]::uuid;
 if not found or d.user_id::text<>parts[1] then return false; end if;
 return case when p_write then d.user_id=auth.uid() else can_read_document(d.id) end;
 exception when invalid_text_representation then return false;
 end;
$$;
drop policy if exists citizen_docs_read on storage.objects;
drop policy if exists citizen_docs_insert on storage.objects;
drop policy if exists citizen_docs_delete on storage.objects;
create policy citizen_docs_read on storage.objects for select to authenticated using(bucket_id='citizen-documents' and citizen_document_storage_access(name,false));
create policy citizen_docs_insert on storage.objects for insert to authenticated with check(bucket_id='citizen-documents' and citizen_document_storage_access(name,true));
create policy citizen_docs_delete on storage.objects for delete to authenticated using(bucket_id='citizen-documents' and account_is_active() and (storage.foldername(name))[1]=auth.uid()::text);
commit;
